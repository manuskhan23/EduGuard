import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/connection.js';
import {
  AuthedRequest,
  getClientIp,
  requireAuth,
  requireRoles,
} from '../middleware/auth.js';
import { notifyUser, recordAuditLog } from '../services/auditAndNotify.js';
import {
  ComplaintStatus,
  InspectionGroupStatus,
  RegistrationStatus,
  SchoolType,
  UserRole,
  VerificationStatus,
} from '../types.js';

const router = Router();

// ==========================================
// USERS & INSPECTOR ACCOUNT MANAGEMENT
// ==========================================
router.get('/users', requireAuth, requireRoles(UserRole.SUPER_ADMIN), async (req, res) => {
  const db = getDb();
  const filter: Record<string, any> = {};
  if (req.query.role && req.query.role !== 'ALL') filter.role = req.query.role;
  if (req.query.q) {
    const rx = new RegExp(String(req.query.q), 'i');
    filter.$or = [{ fullName: rx }, { email: rx }, { employeeId: rx }];
  }
  const users: any[] = await db.Users.find(filter).sort({ createdAt: -1 }).lean();
  return res.json({
    items: users.map(({ passwordHash, resetToken, resetTokenExpires, ...safe }) => safe),
  });
});

router.get('/users/inspectors', requireAuth, requireRoles(UserRole.SUPER_ADMIN, UserRole.GROUP_LEADER), async (_req, res) => {
  const db = getDb();
  const users: any[] = await db.Users.find({
    role: { $in: [UserRole.INSPECTOR, UserRole.GROUP_LEADER] },
    isBlocked: false,
  }).lean();
  return res.json({
    items: users.map(({ passwordHash, resetToken, resetTokenExpires, ...safe }) => safe),
  });
});

router.post('/users/inspectors', requireAuth, requireRoles(UserRole.SUPER_ADMIN), async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const {
      fullName,
      email,
      password,
      role = UserRole.INSPECTOR,
      phone = '',
      employeeId = '',
      designation = 'Compliance Inspector',
      province = '',
      district = '',
      specialization = '',
    } = req.body || {};

    if (!fullName || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
    if (![UserRole.INSPECTOR, UserRole.GROUP_LEADER].includes(role)) {
      return res.status(400).json({ error: 'Role must be INSPECTOR or GROUP_LEADER' });
    }
    const existing = await db.Users.findOne({ email: String(email).toLowerCase().trim() }).lean();
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user: any = await db.Users.create({
      fullName,
      email: String(email).toLowerCase().trim(),
      passwordHash,
      role,
      phone,
      employeeId,
      designation,
      province,
      district,
      specialization,
    });

    await recordAuditLog({
      userId: req.user!._id,
      userName: req.user!.fullName,
      role: req.user!.role,
      action: 'INSPECTOR_ACCOUNT_CREATED',
      targetResource: 'Users',
      targetId: String(user._id),
      newValues: { email: user.email, role },
      ipAddress: getClientIp(req),
    });

    const { passwordHash: _, ...safe } = user;
    return res.status(201).json({ user: safe });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/users/:id/block', requireAuth, requireRoles(UserRole.SUPER_ADMIN), async (req: AuthedRequest, res) => {
  const db = getDb();
  const { isBlocked, reason = '' } = req.body || {};
  const target: any = await db.Users.findById(req.params.id).lean();
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (String(target._id) === req.user!._id) return res.status(400).json({ error: 'Cannot block your own account' });

  const updated: any = await db.Users.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        isBlocked: Boolean(isBlocked),
        blockReason: Boolean(isBlocked) ? reason || 'Blocked by Education Department' : '',
        tokenVersion: (target.tokenVersion || 0) + 1, // Immediate session revocation
      },
    },
    { new: true }
  ).lean();

  await notifyUser({
    recipientId: String(target._id),
    type: isBlocked ? 'ACCOUNT_BLOCKED' : 'ACCOUNT_UNBLOCKED',
    title: isBlocked ? 'Account Blocked' : 'Account Reinstated',
    message: isBlocked ? `Reason: ${reason || 'Administrative decision'}` : 'Your EduGuard account access has been restored.',
  });

  await recordAuditLog({
    userId: req.user!._id,
    userName: req.user!.fullName,
    role: req.user!.role,
    action: isBlocked ? 'USER_BLOCKED' : 'USER_UNBLOCKED',
    targetResource: 'Users',
    targetId: String(target._id),
    previousValues: { isBlocked: target.isBlocked },
    newValues: { isBlocked: Boolean(isBlocked), reason },
    ipAddress: getClientIp(req),
  });

  const { passwordHash, ...safe } = updated;
  return res.json({ user: safe });
});

// ==========================================
// SUPER ADMIN ANALYTICS (Dynamic DB calculations + Filters + All 10 charts)
// ==========================================
router.get('/analytics/dashboard', requireAuth, requireRoles(UserRole.SUPER_ADMIN), async (req, res) => {
  try {
    const db = getDb();
    const { schoolType, province, district, city, schoolCategory, registrationStatus, verificationStatus, dateFrom, dateTo } =
      req.query as Record<string, string>;

    const [allSchools, allStudents, allTeachers, allUsers, allComplaints, allGroups] = await Promise.all([
      db.Schools.find({}).lean(),
      db.Students.find({}).lean(),
      db.Teachers.find({}).lean(),
      db.Users.find({}).lean(),
      db.Complaints.find({}).lean(),
      db.InspectionGroups.find({}).lean(),
    ]);

    const filteredSchools = (allSchools as any[]).filter((s) => {
      if (schoolType && schoolType !== 'ALL' && s.schoolType !== schoolType) return false;
      if (province && province !== 'ALL' && s.province !== province) return false;
      if (district && district !== 'ALL' && s.district !== district) return false;
      if (city && city !== 'ALL' && s.city !== city) return false;
      if (schoolCategory && schoolCategory !== 'ALL' && s.schoolCategory !== schoolCategory) return false;
      if (registrationStatus && registrationStatus !== 'ALL' && s.registrationStatus !== registrationStatus) return false;
      if (verificationStatus && verificationStatus !== 'ALL' && s.verificationStatus !== verificationStatus) return false;
      if (dateFrom && new Date(s.createdAt) < new Date(dateFrom)) return false;
      if (dateTo && new Date(s.createdAt) > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    });

    const schoolIds = new Set(filteredSchools.map((s) => String(s._id)));
    const schoolMap = new Map(filteredSchools.map((s) => [String(s._id), s]));

    const filteredStudents = (allStudents as any[]).filter((st) => schoolIds.has(String(st.schoolId)));
    const filteredTeachers = (allTeachers as any[]).filter((t) => schoolIds.has(String(t.schoolId)));
    const filteredComplaints = (allComplaints as any[]).filter((c) => schoolIds.has(String(c.schoolId)));
    const filteredGroups = (allGroups as any[]).filter((g) => schoolIds.has(String(g.targetSchoolId)));

    const totalParents = (allUsers as any[]).filter((u) => u.role === UserRole.PARENT).length;

    const buildCard = (type: SchoolType) => {
      const subset = filteredSchools.filter((s) => s.schoolType === type);
      const subIds = new Set(subset.map((s) => String(s._id)));
      const subStudents = filteredStudents.filter((st) => subIds.has(String(st.schoolId)));
      const subTeachers = filteredTeachers.filter((t) => subIds.has(String(t.schoolId)));
      const subComplaints = filteredComplaints.filter((c) => subIds.has(String(c.schoolId)));
      const subGroups = filteredGroups.filter((g) => subIds.has(String(g.targetSchoolId)));

      return {
        totalRegistered: subset.length,
        approved: subset.filter((s) => s.registrationStatus === RegistrationStatus.APPROVED).length,
        pending: subset.filter((s) => [RegistrationStatus.PENDING, RegistrationStatus.UNDER_REVIEW, RegistrationStatus.MORE_INFORMATION_REQUIRED].includes(s.registrationStatus)).length,
        rejected: subset.filter((s) => s.registrationStatus === RegistrationStatus.REJECTED).length,
        verified: subset.filter((s) => s.verificationStatus === VerificationStatus.VERIFIED).length,
        unverified: subset.filter((s) => s.verificationStatus === VerificationStatus.UNVERIFIED).length,
        suspended: subset.filter((s) => s.verificationStatus === VerificationStatus.SUSPENDED).length,
        students: subStudents.length,
        teachers: subTeachers.length,
        complaints: subComplaints.length,
        completedInspections: subGroups.filter((g) => [InspectionGroupStatus.COMPLETED, InspectionGroupStatus.CLOSED].includes(g.status)).length,
        activeInspections: subGroups.filter((g) => ![InspectionGroupStatus.COMPLETED, InspectionGroupStatus.CLOSED].includes(g.status)).length,
      };
    };

    const govCard = buildCard(SchoolType.GOVERNMENT);
    const prvCard = buildCard(SchoolType.PRIVATE);

    const globalStats = {
      totalSchools: filteredSchools.length,
      totalGovernmentSchools: govCard.totalRegistered,
      totalPrivateSchools: prvCard.totalRegistered,
      totalApprovedSchools: govCard.approved + prvCard.approved,
      totalPendingApplications: govCard.pending + prvCard.pending,
      totalRejectedApplications: govCard.rejected + prvCard.rejected,
      totalVerifiedSchools: govCard.verified + prvCard.verified,
      totalUnverifiedSchools: govCard.unverified + prvCard.unverified,
      totalSuspendedSchools: govCard.suspended + prvCard.suspended,
      totalStudents: filteredStudents.length,
      totalTeachers: filteredTeachers.length,
      totalParents,
      totalComplaints: filteredComplaints.length,
      totalActiveInspectionGroups: govCard.activeInspections + prvCard.activeInspections,
    };

    // District-Wise School Distribution
    const districtAgg = new Map<string, { district: string; government: number; private: number; total: number }>();
    for (const s of filteredSchools) {
      const d = s.district || 'Unspecified';
      const entry = districtAgg.get(d) || { district: d, government: 0, private: 0, total: 0 };
      if (s.schoolType === SchoolType.GOVERNMENT) entry.government++;
      else entry.private++;
      entry.total++;
      districtAgg.set(d, entry);
    }

    // Monthly Registration Trends (last 6 months + actual createdAt months)
    const monthAgg = new Map<string, { month: string; sortKey: string; government: number; private: number }>();
    for (const s of filteredSchools) {
      const dt = new Date(s.createdAt);
      const sortKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const label = dt.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      const entry = monthAgg.get(sortKey) || { month: label, sortKey, government: 0, private: 0 };
      if (s.schoolType === SchoolType.GOVERNMENT) entry.government++;
      else entry.private++;
      monthAgg.set(sortKey, entry);
    }
    const monthlyRegistrations = Array.from(monthAgg.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    // Complaint Trends by Status & Ownership
    const cmpStatusMap = new Map<string, { status: string; government: number; private: number }>();
    for (const c of filteredComplaints) {
      const st = c.status;
      const entry = cmpStatusMap.get(st) || { status: st.replace(/_/g, ' '), government: 0, private: 0 };
      if (c.schoolType === SchoolType.GOVERNMENT) entry.government++;
      else entry.private++;
      cmpStatusMap.set(st, entry);
    }

    // Complaint Resolution Rates
    const govCmp = filteredComplaints.filter((c) => c.schoolType === SchoolType.GOVERNMENT);
    const prvCmp = filteredComplaints.filter((c) => c.schoolType === SchoolType.PRIVATE);
    const govResolved = govCmp.filter((c) => c.status === ComplaintStatus.RESOLVED).length;
    const prvResolved = prvCmp.filter((c) => c.status === ComplaintStatus.RESOLVED).length;

    // Inspection Completion Rates
    const govInsp = filteredGroups.filter((g) => g.schoolType === SchoolType.GOVERNMENT);
    const prvInsp = filteredGroups.filter((g) => g.schoolType === SchoolType.PRIVATE);
    const govInspDone = govInsp.filter((g) => [InspectionGroupStatus.COMPLETED, InspectionGroupStatus.CLOSED].includes(g.status)).length;
    const prvInspDone = prvInsp.filter((g) => [InspectionGroupStatus.COMPLETED, InspectionGroupStatus.CLOSED].includes(g.status)).length;

    const charts = {
      schoolDistribution: [
        { name: 'Government Schools', value: govCard.totalRegistered },
        { name: 'Private Schools', value: prvCard.totalRegistered },
      ],
      studentEnrollment: [
        { name: 'Government', students: govCard.students, teachers: govCard.teachers },
        { name: 'Private', students: prvCard.students, teachers: prvCard.teachers },
      ],
      teacherDistribution: [
        { name: 'Government Schools', value: govCard.teachers },
        { name: 'Private Schools', value: prvCard.teachers },
      ],
      complaintTrends: Array.from(cmpStatusMap.values()),
      inspectionStatistics: [
        { name: 'Government', active: govCard.activeInspections, completed: govCard.completedInspections },
        { name: 'Private', active: prvCard.activeInspections, completed: prvCard.completedInspections },
      ],
      verificationBreakdown: [
        { name: 'Verified', government: govCard.verified, private: prvCard.verified },
        { name: 'Unverified', government: govCard.unverified, private: prvCard.unverified },
        { name: 'Suspended', government: govCard.suspended, private: prvCard.suspended },
      ],
      districtDistribution: Array.from(districtAgg.values()),
      monthlyRegistrations,
      complaintResolutionRates: [
        {
          name: 'Government',
          rate: govCmp.length ? Math.round((govResolved / govCmp.length) * 100) : 0,
          resolved: govResolved,
          total: govCmp.length,
        },
        {
          name: 'Private',
          rate: prvCmp.length ? Math.round((prvResolved / prvCmp.length) * 100) : 0,
          resolved: prvResolved,
          total: prvCmp.length,
        },
      ],
      inspectionCompletionRates: [
        {
          name: 'Government',
          rate: govInsp.length ? Math.round((govInspDone / govInsp.length) * 100) : 0,
          completed: govInspDone,
          total: govInsp.length,
        },
        {
          name: 'Private',
          rate: prvInsp.length ? Math.round((prvInspDone / prvInsp.length) * 100) : 0,
          completed: prvInspDone,
          total: prvInsp.length,
        },
      ],
    };

    return res.json({
      globalStats,
      comparison: {
        government: govCard,
        private: prvCard,
      },
      charts,
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ==========================================
// REPORTS & CSV EXPORT
// ==========================================
router.get('/reports/generate', requireAuth, requireRoles(UserRole.SUPER_ADMIN), async (req, res) => {
  const db = getDb();
  const { reportType = 'SCHOOLS', schoolType, province, district, registrationStatus, verificationStatus, category, status } =
    req.query as Record<string, string>;

  if (reportType === 'COMPLAINTS') {
    const filter: Record<string, any> = {};
    if (schoolType && schoolType !== 'ALL') filter.schoolType = schoolType;
    if (province && province !== 'ALL') filter.province = province;
    if (district && district !== 'ALL') filter.district = district;
    if (category && category !== 'ALL') filter.category = category;
    if (status && status !== 'ALL') filter.status = status;
    const rows = await db.Complaints.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ title: 'EduGuard Ownership-Based Complaints Report', generatedAt: new Date().toISOString(), rows });
  }

  if (reportType === 'INSPECTIONS') {
    const filter: Record<string, any> = {};
    if (schoolType && schoolType !== 'ALL') filter.schoolType = schoolType;
    if (district && district !== 'ALL') filter.district = district;
    if (status && status !== 'ALL') filter.status = status;
    const rows = await db.InspectionGroups.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ title: 'EduGuard Inspection & Compliance Report', generatedAt: new Date().toISOString(), rows });
  }

  const filter: Record<string, any> = {};
  if (schoolType && schoolType !== 'ALL') filter.schoolType = schoolType;
  if (province && province !== 'ALL') filter.province = province;
  if (district && district !== 'ALL') filter.district = district;
  if (registrationStatus && registrationStatus !== 'ALL') filter.registrationStatus = registrationStatus;
  if (verificationStatus && verificationStatus !== 'ALL') filter.verificationStatus = verificationStatus;
  const rows = await db.Schools.find(filter).sort({ name: 1 }).lean();
  return res.json({ title: 'EduGuard Schools Registry Report', generatedAt: new Date().toISOString(), rows });
});

router.get('/reports/export.csv', requireAuth, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_OWNER), async (req: AuthedRequest, res) => {
  const db = getDb();
  const type = String(req.query.reportType || 'SCHOOLS');
  let headers: string[] = [];
  let lines: string[][] = [];

  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  if (type === 'COMPLAINTS') {
    const rows: any[] = await db.Complaints.find({}).sort({ createdAt: -1 }).lean();
    headers = ['Complaint Number', 'School Type', 'District', 'Category', 'Title', 'Priority', 'Status', 'Created At'];
    lines = rows.map((r) => [r.complaintNumber, r.schoolType, r.district, r.category, r.title, r.priority, r.status, r.createdAt]);
  } else if (type === 'INSPECTIONS') {
    const rows: any[] = await db.InspectionGroups.find({}).sort({ createdAt: -1 }).lean();
    headers = ['Inspection ID', 'Group Name', 'School Type', 'District', 'Type', 'Priority', 'Status', 'Deadline'];
    lines = rows.map((r) => [r.inspectionId, r.groupName, r.schoolType, r.district, r.inspectionType, r.priority, r.status, r.deadline]);
  } else {
    const filter: Record<string, any> = {};
    if (req.query.schoolType && req.query.schoolType !== 'ALL') filter.schoolType = req.query.schoolType;
    const rows: any[] = await db.Schools.find(filter).sort({ name: 1 }).lean();
    headers = ['Name', 'Ownership', 'Category', 'Reg Number', 'Province', 'District', 'Registration Status', 'Verification Status'];
    lines = rows.map((r) => [r.name, r.schoolType, r.schoolCategory, r.registrationNumber, r.province, r.district, r.registrationStatus, r.verificationStatus]);
  }

  const csv = [headers.map(esc).join(','), ...lines.map((row) => row.map(esc).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="eduguard-${type.toLowerCase()}-report.csv"`);
  return res.send(csv);
});

// ==========================================
// ADMIN-SCHOOL MESSAGING
// ==========================================
router.get('/messages/conversations', requireAuth, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_OWNER), async (req: AuthedRequest, res) => {
  const db = getDb();
  const filter: Record<string, any> = {};
  if (req.user!.role === UserRole.SCHOOL_OWNER) {
    const owned = Array.from(new Set([...(req.user!.schoolIds || []), req.user!.schoolId].filter(Boolean).map(String)));
    filter.schoolId = { $in: owned.length ? owned : ['none'] };
  }
  const convs: any[] = await db.Conversations.find(filter).sort({ lastMessageAt: -1 }).lean();
  const schoolIds = Array.from(new Set(convs.map((c) => String(c.schoolId))));
  const schools: any[] = schoolIds.length ? await db.Schools.find({ _id: { $in: schoolIds } }).lean() : [];
  const schoolMap = new Map(schools.map((s) => [String(s._id), s]));
  return res.json({ items: convs.map((c) => ({ ...c, school: schoolMap.get(String(c.schoolId)) || null })) });
});

router.post('/messages/conversations', requireAuth, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_OWNER), async (req: AuthedRequest, res) => {
  const db = getDb();
  const { schoolId, subject, initialMessage } = req.body || {};
  const targetSchoolId = req.user!.role === UserRole.SCHOOL_OWNER ? schoolId || req.user!.schoolId : schoolId;
  if (!targetSchoolId || !subject || !initialMessage) {
    return res.status(400).json({ error: 'School, subject, and message are required' });
  }
  const school: any = await db.Schools.findById(targetSchoolId).lean();
  if (!school) return res.status(404).json({ error: 'School not found' });

  const conv: any = await db.Conversations.create({
    schoolId: targetSchoolId,
    subject,
    participants: [req.user!._id, school.owner],
    lastMessageAt: new Date().toISOString(),
  });
  await db.Messages.create({
    conversationId: conv._id,
    senderId: req.user!._id,
    senderName: req.user!.fullName,
    senderRole: req.user!.role,
    body: initialMessage,
  });
  return res.status(201).json({ conversation: conv });
});

router.get('/messages/conversations/:id', requireAuth, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_OWNER), async (req: AuthedRequest, res) => {
  const db = getDb();
  const messages = await db.Messages.find({ conversationId: req.params.id }).sort({ createdAt: 1 }).lean();
  return res.json({ items: messages });
});

router.post('/messages/conversations/:id', requireAuth, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_OWNER), async (req: AuthedRequest, res) => {
  const db = getDb();
  const body = String(req.body?.body || '').trim();
  if (!body) return res.status(400).json({ error: 'Message body is required' });
  const msg = await db.Messages.create({
    conversationId: req.params.id,
    senderId: req.user!._id,
    senderName: req.user!.fullName,
    senderRole: req.user!.role,
    body,
  });
  await db.Conversations.findByIdAndUpdate(req.params.id, { $set: { lastMessageAt: new Date().toISOString() } });
  return res.status(201).json({ item: msg });
});

// ==========================================
// NOTIFICATIONS & AUDIT LOGS
// ==========================================
router.get('/notifications', requireAuth, async (req: AuthedRequest, res) => {
  const db = getDb();
  const items: any[] = await db.Notifications.find({ recipientId: req.user!._id }).sort({ createdAt: -1 }).limit(50).lean();
  const unreadCount = items.filter((n) => !n.isRead).length;
  return res.json({ items, unreadCount });
});

router.post('/notifications/:id/read', requireAuth, async (req: AuthedRequest, res) => {
  const db = getDb();
  const n: any = await db.Notifications.findById(req.params.id).lean();
  if (!n || String(n.recipientId) !== req.user!._id) return res.status(404).json({ error: 'Notification not found' });
  const updated = await db.Notifications.findByIdAndUpdate(req.params.id, { $set: { isRead: true } }, { new: true }).lean();
  return res.json({ item: updated });
});

router.post('/notifications/read-all', requireAuth, async (req: AuthedRequest, res) => {
  const db = getDb();
  await db.Notifications.updateMany({ recipientId: req.user!._id, isRead: false }, { $set: { isRead: true } });
  return res.json({ ok: true });
});

router.get('/audit-logs', requireAuth, requireRoles(UserRole.SUPER_ADMIN), async (req, res) => {
  const db = getDb();
  const filter: Record<string, any> = {};
  if (req.query.action && req.query.action !== 'ALL') filter.action = req.query.action;
  const items = await db.AuditLogs.find(filter).sort({ createdAt: -1 }).limit(150).lean();
  return res.json({ items });
});

// ==========================================
// SETTINGS: CATEGORIES, POLICIES, PROVINCES, DISTRICTS
// ==========================================
router.get('/settings/metadata', async (_req, res) => {
  const db = getDb();
  const [config, provinces, districts] = await Promise.all([
    db.SystemSettings.findOne({ key: 'global_config' }).lean(),
    db.Provinces.find({ isActive: true }).sort({ name: 1 }).lean(),
    db.Districts.find({ isActive: true }).sort({ name: 1 }).lean(),
  ]);
  return res.json({
    schoolCategories: (config as any)?.schoolCategories || [],
    ownershipPolicies: (config as any)?.ownershipPolicies || [],
    provinces,
    districts,
  });
});

router.post('/settings/categories', requireAuth, requireRoles(UserRole.SUPER_ADMIN), async (req: AuthedRequest, res) => {
  const db = getDb();
  const { name, schoolType } = req.body || {};
  if (!name || !Object.values(SchoolType).includes(schoolType)) {
    return res.status(400).json({ error: 'Category name and schoolType (GOVERNMENT | PRIVATE) are required' });
  }
  const newCat = { id: `cat-${Date.now()}`, name: String(name).trim(), schoolType, isActive: true };
  const updated: any = await db.SystemSettings.findOneAndUpdate(
    { key: 'global_config' },
    { $push: { schoolCategories: newCat } },
    { new: true }
  ).lean();
  await recordAuditLog({
    userId: req.user!._id,
    userName: req.user!.fullName,
    role: req.user!.role,
    action: 'CATEGORY_CREATED',
    targetResource: 'SystemSettings',
    newValues: newCat,
    ipAddress: getClientIp(req),
  });
  return res.status(201).json({ schoolCategories: updated.schoolCategories });
});

router.patch('/settings/categories/:id', requireAuth, requireRoles(UserRole.SUPER_ADMIN), async (req: AuthedRequest, res) => {
  const db = getDb();
  const cfg: any = await db.SystemSettings.findOne({ key: 'global_config' }).lean();
  if (!cfg) return res.status(404).json({ error: 'Config not found' });
  const categories = (cfg.schoolCategories || []).map((c: any) =>
    c.id === req.params.id
      ? {
          ...c,
          name: req.body.name ?? c.name,
          schoolType: req.body.schoolType ?? c.schoolType,
          isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : c.isActive,
        }
      : c
  );
  const updated: any = await db.SystemSettings.findOneAndUpdate(
    { key: 'global_config' },
    { $set: { schoolCategories: categories } },
    { new: true }
  ).lean();
  return res.json({ schoolCategories: updated.schoolCategories });
});

router.post('/settings/policies', requireAuth, requireRoles(UserRole.SUPER_ADMIN), async (req: AuthedRequest, res) => {
  const db = getDb();
  const {
    title,
    schoolType,
    province = 'All Provinces',
    district = 'All Districts',
    schoolCategory = 'All Categories',
    effectiveDate = new Date().toISOString().slice(0, 10),
    requiredDocuments = [],
    reportingRequirements = '',
  } = req.body || {};

  if (!title || !Object.values(SchoolType).includes(schoolType)) {
    return res.status(400).json({ error: 'Policy title and schoolType are required' });
  }
  const policy = {
    id: `pol-${Date.now()}`,
    title,
    schoolType,
    province,
    district,
    schoolCategory,
    effectiveDate,
    requiredDocuments: Array.isArray(requiredDocuments)
      ? requiredDocuments
      : String(requiredDocuments).split(',').map((s) => s.trim()).filter(Boolean),
    reportingRequirements,
    isActive: true,
  };
  const updated: any = await db.SystemSettings.findOneAndUpdate(
    { key: 'global_config' },
    { $push: { ownershipPolicies: policy } },
    { new: true }
  ).lean();
  await recordAuditLog({
    userId: req.user!._id,
    userName: req.user!.fullName,
    role: req.user!.role,
    action: 'POLICY_CREATED',
    targetResource: 'SystemSettings',
    newValues: policy,
    ipAddress: getClientIp(req),
  });
  return res.status(201).json({ ownershipPolicies: updated.ownershipPolicies });
});

router.patch('/settings/policies/:id', requireAuth, requireRoles(UserRole.SUPER_ADMIN), async (req: AuthedRequest, res) => {
  const db = getDb();
  const cfg: any = await db.SystemSettings.findOne({ key: 'global_config' }).lean();
  if (!cfg) return res.status(404).json({ error: 'Config not found' });
  const policies = (cfg.ownershipPolicies || []).map((p: any) =>
    p.id === req.params.id ? { ...p, ...req.body } : p
  );
  const updated: any = await db.SystemSettings.findOneAndUpdate(
    { key: 'global_config' },
    { $set: { ownershipPolicies: policies } },
    { new: true }
  ).lean();
  return res.json({ ownershipPolicies: updated.ownershipPolicies });
});

export default router;
