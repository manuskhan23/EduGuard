import { Router } from 'express';
import { getDb } from '../db/connection.js';
import {
  AuthedRequest,
  getClientIp,
  requireAuth,
  requireRoles,
} from '../middleware/auth.js';
import { notifySuperAdmins, notifyUser, recordAuditLog } from '../services/auditAndNotify.js';
import { ComplaintStatus, RegistrationStatus, SchoolType, UserRole, VerificationStatus } from '../types.js';

const router = Router();

// List complaints (Role-isolated)
router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const { schoolType, province, district, schoolId, category, priority, status, q = '', dateFrom, dateTo } = req.query as Record<string, string>;
    const filter: Record<string, any> = {};

    if (req.user!.role === UserRole.PARENT) {
      filter.parentId = req.user!._id;
    } else if (req.user!.role === UserRole.SCHOOL_OWNER) {
      const owned = Array.from(new Set([...(req.user!.schoolIds || []), req.user!.schoolId].filter(Boolean).map(String)));
      filter.schoolId = { $in: owned.length ? owned : ['none'] };
    } else if (req.user!.role === UserRole.INSPECTOR || req.user!.role === UserRole.GROUP_LEADER) {
      const memberships: any[] = await db.InspectionMembers.find({ inspectorId: req.user!._id }).lean();
      const groupIds = memberships.map((m) => String(m.groupId));
      const groups: any[] = groupIds.length ? await db.InspectionGroups.find({ _id: { $in: groupIds } }).lean() : [];
      const cmpIds = groups.flatMap((g) => (g.relatedComplaints || []).map(String));
      filter._id = { $in: cmpIds.length ? cmpIds : ['none'] };
    }

    if (schoolType && schoolType !== 'ALL') filter.schoolType = schoolType;
    if (province && province !== 'ALL') filter.province = province;
    if (district && district !== 'ALL') filter.district = district;
    if (schoolId && schoolId !== 'ALL') filter.schoolId = schoolId;
    if (category && category !== 'ALL') filter.category = category;
    if (priority && priority !== 'ALL') filter.priority = priority;
    if (status && status !== 'ALL') filter.status = status;
    if (dateFrom) filter.createdAt = { ...(filter.createdAt || {}), $gte: new Date(dateFrom).toISOString() };
    if (dateTo) filter.createdAt = { ...(filter.createdAt || {}), $lte: new Date(dateTo + 'T23:59:59').toISOString() };

    if (q.trim()) {
      const rx = new RegExp(q.trim(), 'i');
      filter.$or = [{ complaintNumber: rx }, { title: rx }, { description: rx }, { category: rx }];
    }

    const complaints: any[] = await db.Complaints.find(filter).sort({ createdAt: -1 }).lean();
    const schoolIds = Array.from(new Set(complaints.map((c) => String(c.schoolId))));
    const parentIds = Array.from(new Set(complaints.map((c) => String(c.parentId))));
    const [schools, parents] = await Promise.all([
      schoolIds.length ? db.Schools.find({ _id: { $in: schoolIds } }).lean() : [],
      parentIds.length ? db.Users.find({ _id: { $in: parentIds } }).lean() : [],
    ]);
    const schoolMap = new Map(schools.map((s: any) => [String(s._id), s]));
    const parentMap = new Map(parents.map((p: any) => [String(p._id), p]));

    const items = complaints.map((c) => {
      const s: any = schoolMap.get(String(c.schoolId));
      const p: any = parentMap.get(String(c.parentId));
      return {
        ...c,
        school: s ? { _id: s._id, name: s.name, schoolType: s.schoolType, district: s.district, province: s.province, verificationStatus: s.verificationStatus } : null,
        parent: p ? { _id: p._id, fullName: p.fullName, email: p.email } : null,
      };
    });

    return res.json({ items });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// Ownership-based Complaint Analytics
router.get('/analytics/summary', requireAuth, requireRoles(UserRole.SUPER_ADMIN), async (_req, res) => {
  try {
    const db = getDb();
    const [complaints, schools, students] = await Promise.all([
      db.Complaints.find({}).lean(),
      db.Schools.find({ registrationStatus: RegistrationStatus.APPROVED }).lean(),
      db.Students.find({}).lean(),
    ]);

    const schoolById = new Map((schools as any[]).map((s) => [String(s._id), s]));
    const govSchools = (schools as any[]).filter((s) => s.schoolType === SchoolType.GOVERNMENT);
    const prvSchools = (schools as any[]).filter((s) => s.schoolType === SchoolType.PRIVATE);

    const govStudents = (students as any[]).filter((st) => schoolById.get(String(st.schoolId))?.schoolType === SchoolType.GOVERNMENT).length;
    const prvStudents = (students as any[]).filter((st) => schoolById.get(String(st.schoolId))?.schoolType === SchoolType.PRIVATE).length;

    const govCmps = (complaints as any[]).filter((c) => c.schoolType === SchoolType.GOVERNMENT);
    const prvCmps = (complaints as any[]).filter((c) => c.schoolType === SchoolType.PRIVATE);

    const calcResolution = (arr: any[]) => {
      const resolved = arr.filter((c) => c.status === ComplaintStatus.RESOLVED);
      const rate = arr.length ? Math.round((resolved.length / arr.length) * 1000) / 10 : 0;
      const avgDays = resolved.length
        ? Math.round(
            (resolved.reduce((acc, c) => {
              const end = c.resolvedAt ? new Date(c.resolvedAt).getTime() : Date.now();
              const start = new Date(c.createdAt).getTime();
              return acc + Math.max(0.5, (end - start) / 86400000);
            }, 0) /
              resolved.length) *
              10
          ) / 10
        : 0;
      return { resolvedCount: resolved.length, resolutionRate: rate, avgResolutionDays: avgDays };
    };

    const byDistrictMap = new Map<string, { district: string; government: number; private: number; total: number }>();
    const byCategoryMap = new Map<string, { category: string; government: number; private: number; total: number }>();
    const perSchoolCount = new Map<string, number>();

    for (const c of complaints as any[]) {
      const d = c.district || 'Unknown';
      const dEntry = byDistrictMap.get(d) || { district: d, government: 0, private: 0, total: 0 };
      if (c.schoolType === SchoolType.GOVERNMENT) dEntry.government++;
      else dEntry.private++;
      dEntry.total++;
      byDistrictMap.set(d, dEntry);

      const catEntry = byCategoryMap.get(c.category) || { category: c.category, government: 0, private: 0, total: 0 };
      if (c.schoolType === SchoolType.GOVERNMENT) catEntry.government++;
      else catEntry.private++;
      catEntry.total++;
      byCategoryMap.set(c.category, catEntry);

      perSchoolCount.set(String(c.schoolId), (perSchoolCount.get(String(c.schoolId)) || 0) + 1);
    }

    const repeatComplaintSchools = Array.from(perSchoolCount.entries())
      .filter(([, count]) => count >= 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([sid, count]) => {
        const s = schoolById.get(sid);
        return { schoolId: sid, schoolName: s?.name || 'School', schoolType: s?.schoolType || 'UNKNOWN', district: s?.district || '', count };
      });

    return res.json({
      government: {
        rawCount: govCmps.length,
        schoolCount: govSchools.length,
        studentCount: govStudents,
        complaintsPerSchool: govSchools.length ? Math.round((govCmps.length / govSchools.length) * 100) / 100 : 0,
        complaintsPer100Students: govStudents ? Math.round(((govCmps.length / govStudents) * 100) * 100) / 100 : 0,
        ...calcResolution(govCmps),
      },
      private: {
        rawCount: prvCmps.length,
        schoolCount: prvSchools.length,
        studentCount: prvStudents,
        complaintsPerSchool: prvSchools.length ? Math.round((prvCmps.length / prvSchools.length) * 100) / 100 : 0,
        complaintsPer100Students: prvStudents ? Math.round(((prvCmps.length / prvStudents) * 100) * 100) / 100 : 0,
        ...calcResolution(prvCmps),
      },
      byDistrict: Array.from(byDistrictMap.values()),
      byCategory: Array.from(byCategoryMap.values()),
      repeatComplaintSchools,
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// Complaint Detail (Public timeline + non-internal messages; internal notes ONLY for Super Admin / Inspectors)
router.get('/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const complaint: any = await db.Complaints.findById(req.params.id).lean();
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    if (req.user!.role === UserRole.PARENT && String(complaint.parentId) !== req.user!._id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user!.role === UserRole.SCHOOL_OWNER) {
      const owned = new Set([...(req.user!.schoolIds || []), req.user!.schoolId].filter(Boolean).map(String));
      if (!owned.has(String(complaint.schoolId))) return res.status(403).json({ error: 'Access denied' });
    }

    const canSeeInternal = [UserRole.SUPER_ADMIN, UserRole.INSPECTOR, UserRole.GROUP_LEADER].includes(req.user!.role);

    const [school, parent, timeline, messages] = await Promise.all([
      db.Schools.findById(String(complaint.schoolId)).lean(),
      db.Users.findById(String(complaint.parentId)).lean(),
      db.ComplaintTimeline.find({ complaintId: String(complaint._id) }).sort({ createdAt: 1 }).lean(),
      db.ComplaintMessages.find({ complaintId: String(complaint._id) }).sort({ createdAt: 1 }).lean(),
    ]);

    return res.json({
      complaint,
      school,
      parent: parent ? { _id: (parent as any)._id, fullName: (parent as any).fullName, email: (parent as any).email, phone: (parent as any).phone } : null,
      timeline: canSeeInternal ? timeline : (timeline as any[]).filter((t) => t.isPublic !== false),
      messages: canSeeInternal ? messages : (messages as any[]).filter((m) => !m.isInternalAdminNote),
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// Parent Submit Complaint against ANY Approved Government or Private School
router.post('/', requireAuth, requireRoles(UserRole.PARENT), async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const {
      schoolId,
      category,
      title,
      description,
      relatedStudentId = null,
      relatedStudentName = '',
      priority = 'MEDIUM',
      evidencePhotos = [],
      supportingDocuments = [],
    } = req.body || {};

    if (!schoolId || !category || !title || !description) {
      return res.status(400).json({ error: 'School, category, title, and description are required' });
    }

    const school: any = await db.Schools.findById(schoolId).lean();
    if (!school || school.registrationStatus !== RegistrationStatus.APPROVED || school.verificationStatus === VerificationStatus.SUSPENDED) {
      return res.status(400).json({ error: 'Complaints can only be submitted against approved, active schools' });
    }

    const count = await db.Complaints.countDocuments({});
    const year = new Date().getFullYear();
    const complaintNumber = `EG-CMP-${year}-${String(count + 1).padStart(5, '0')}`;

    const complaint: any = await db.Complaints.create({
      complaintNumber,
      parentId: req.user!._id,
      schoolId: school._id,
      schoolType: school.schoolType,
      province: school.province,
      district: school.district,
      category,
      title,
      description,
      relatedStudentId: relatedStudentId || null,
      relatedStudentName,
      priority,
      status: ComplaintStatus.SUBMITTED,
      evidencePhotos,
      supportingDocuments,
    });

    await db.ComplaintTimeline.create({
      complaintId: complaint._id,
      status: ComplaintStatus.SUBMITTED,
      title: 'Complaint Submitted',
      description: `Complaint ${complaintNumber} filed against ${school.name} (${school.schoolType}).`,
      actorId: req.user!._id,
      actorName: req.user!.fullName,
      isPublic: true,
    });

    await notifySuperAdmins({
      type: 'NEW_COMPLAINT',
      title: `New Complaint ${complaintNumber}`,
      message: `${category} complaint filed against ${school.name} (${school.schoolType}).`,
      resourceType: 'Complaint',
      resourceId: String(complaint._id),
    });
    if (school.owner) {
      await notifyUser({
        recipientId: String(school.owner),
        type: 'NEW_COMPLAINT',
        title: `Parent Complaint Received (${complaintNumber})`,
        message: `A parent submitted a "${category}" complaint regarding ${school.name}. You may submit an official response.`,
        resourceType: 'Complaint',
        resourceId: String(complaint._id),
      });
    }

    return res.status(201).json({
      complaint,
      message: `Complaint ${complaintNumber} submitted successfully.`,
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// School Owner Official Response (Cannot delete, hide, or alter original complaint!)
router.post('/:id/school-response', requireAuth, requireRoles(UserRole.SCHOOL_OWNER), async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const complaint: any = await db.Complaints.findById(req.params.id).lean();
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const owned = new Set([...(req.user!.schoolIds || []), req.user!.schoolId].filter(Boolean).map(String));
    if (!owned.has(String(complaint.schoolId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const responseText = String(req.body?.response || '').trim();
    if (!responseText) return res.status(400).json({ error: 'Response text is required' });

    const updated = await db.Complaints.findByIdAndUpdate(
      String(complaint._id),
      { $set: { schoolResponse: responseText, schoolRespondedAt: new Date().toISOString() } },
      { new: true }
    ).lean();

    await db.ComplaintMessages.create({
      complaintId: complaint._id,
      senderId: req.user!._id,
      senderName: req.user!.fullName,
      senderRole: req.user!.role,
      message: responseText,
      isInternalAdminNote: false,
    });

    await db.ComplaintTimeline.create({
      complaintId: complaint._id,
      status: complaint.status,
      title: 'School Management Responded',
      description: 'Official school response recorded.',
      actorId: req.user!._id,
      actorName: req.user!.fullName,
      isPublic: true,
    });

    return res.json({ complaint: updated });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// Add message / internal admin note
router.post('/:id/messages', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const complaint: any = await db.Complaints.findById(req.params.id).lean();
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const { message, isInternalAdminNote = false } = req.body || {};
    if (!String(message || '').trim()) return res.status(400).json({ error: 'Message is required' });

    const internalFlag = Boolean(isInternalAdminNote) && [UserRole.SUPER_ADMIN, UserRole.INSPECTOR, UserRole.GROUP_LEADER].includes(req.user!.role);

    const created = await db.ComplaintMessages.create({
      complaintId: complaint._id,
      senderId: req.user!._id,
      senderName: req.user!.fullName,
      senderRole: req.user!.role,
      message: String(message).trim(),
      isInternalAdminNote: internalFlag,
    });
    return res.status(201).json({ item: created });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// Super Admin: Update complaint lifecycle status
router.post('/:id/status', requireAuth, requireRoles(UserRole.SUPER_ADMIN), async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const { status, summary = '' } = req.body || {};
    if (!Object.values(ComplaintStatus).includes(status)) {
      return res.status(400).json({ error: 'Invalid complaint status' });
    }
    const complaint: any = await db.Complaints.findById(req.params.id).lean();
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const prevStatus = complaint.status;
    const patch: Record<string, any> = { status };
    if (status === ComplaintStatus.RESOLVED || status === ComplaintStatus.REJECTED) {
      patch.resolutionSummary = summary;
      patch.resolvedAt = new Date().toISOString();
    }

    const updated = await db.Complaints.findByIdAndUpdate(String(complaint._id), { $set: patch }, { new: true }).lean();

    await db.ComplaintTimeline.create({
      complaintId: complaint._id,
      status,
      title: `Status Updated to ${status.replace(/_/g, ' ')}`,
      description: summary || `Status changed from ${prevStatus} to ${status}.`,
      actorId: req.user!._id,
      actorName: req.user!.fullName,
      isPublic: true,
    });

    await notifyUser({
      recipientId: String(complaint.parentId),
      type: 'COMPLAINT_STATUS_CHANGED',
      title: `Complaint ${complaint.complaintNumber} Updated`,
      message: `Status changed to ${status.replace(/_/g, ' ')}. ${summary}`,
      resourceType: 'Complaint',
      resourceId: String(complaint._id),
    });

    await recordAuditLog({
      userId: req.user!._id,
      userName: req.user!.fullName,
      role: req.user!.role,
      action: 'COMPLAINT_STATUS_UPDATED',
      targetResource: 'Complaints',
      targetId: String(complaint._id),
      previousValues: { status: prevStatus },
      newValues: { status, summary },
      ipAddress: getClientIp(req),
    });

    return res.json({ complaint: updated });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
