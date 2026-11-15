import { Router } from 'express';
import { getDb } from '../db/connection.js';
import {
  AuthedRequest,
  getClientIp,
  optionalAuth,
  requireAuth,
  requireRoles,
} from '../middleware/auth.js';
import { notifyUser, recordAuditLog } from '../services/auditAndNotify.js';
import { RegistrationStatus, SchoolType, UserRole, VerificationStatus } from '../types.js';

const router = Router();

// PUBLIC SCHOOL DIRECTORY (Approved and non-suspended schools only)
router.get('/schools/directory', optionalAuth, async (req, res) => {
  try {
    const db = getDb();
    const {
      q = '',
      schoolType,
      verificationStatus,
      province,
      district,
      city,
      tehsil,
      educationLevel,
      genderType,
      schoolCategory,
      sort = 'name_asc',
      page = '1',
      limit = '12',
    } = req.query as Record<string, string>;

    const filter: Record<string, any> = {
      registrationStatus: RegistrationStatus.APPROVED,
      verificationStatus: { $ne: VerificationStatus.SUSPENDED },
    };

    if (schoolType && schoolType !== 'ALL') filter.schoolType = schoolType;
    if (verificationStatus && verificationStatus !== 'ALL') filter.verificationStatus = verificationStatus;
    if (province && province !== 'ALL') filter.province = province;
    if (district && district !== 'ALL') filter.district = district;
    if (city && city !== 'ALL') filter.city = city;
    if (tehsil && tehsil !== 'ALL') filter.tehsil = tehsil;
    if (educationLevel && educationLevel !== 'ALL') filter.educationLevels = educationLevel;
    if (genderType && genderType !== 'ALL') filter.genderType = genderType;
    if (schoolCategory && schoolCategory !== 'ALL') filter.schoolCategory = schoolCategory;

    if (q.trim()) {
      const rx = new RegExp(q.trim(), 'i');
      filter.$or = [
        { name: rx },
        { registrationNumber: rx },
        { schoolCode: rx },
        { district: rx },
        { city: rx },
        { schoolCategory: rx },
      ];
    }

    const sortSpec: Record<string, 1 | -1> =
      sort === 'newest'
        ? { createdAt: -1 }
        : sort === 'established_asc'
          ? { establishedYear: 1 }
          : sort === 'verified_first'
            ? { verificationStatus: -1, name: 1 }
            : { name: 1 };

    const total = await db.Schools.countDocuments(filter);
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));

    const schools: any[] = await db.Schools.find(filter)
      .sort(sortSpec)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // Strip internal references for public directory
    const items = schools.map((s) => ({
      _id: s._id,
      name: s.name,
      slug: s.slug,
      schoolCode: s.schoolCode,
      emisCode: s.emisCode,
      registrationNumber: s.registrationNumber,
      schoolType: s.schoolType,
      schoolCategory: s.schoolCategory,
      educationLevels: s.educationLevels,
      genderType: s.genderType,
      establishedYear: s.establishedYear,
      logo: s.logo,
      photographs: s.photographs,
      address: s.address,
      province: s.province,
      district: s.district,
      city: s.city,
      tehsil: s.tehsil,
      contactNumber: s.contactNumber,
      officialEmail: s.officialEmail,
      verificationStatus: s.verificationStatus,
      registrationStatus: s.registrationStatus,
      facilities: s.facilities,
      location: s.location,
    }));

    return res.json({
      items,
      total,
      page: pageNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// PUBLIC SCHOOL PROFILE (Only approved and non-suspended schools; never expose confidential student records or internal notes)
router.get('/schools/public/:idOrSlug', optionalAuth, async (req, res) => {
  try {
    const db = getDb();
    const { idOrSlug } = req.params;
    const school: any = await db.Schools.findOne({
      $or: [{ _id: idOrSlug }, { slug: idOrSlug }],
    }).lean();

    if (!school || school.registrationStatus !== RegistrationStatus.APPROVED || school.verificationStatus === VerificationStatus.SUSPENDED) {
      return res.status(404).json({ error: 'Public school profile not found or unavailable' });
    }

    const [classes, announcements, publicReports] = await Promise.all([
      db.Classes.find({ schoolId: String(school._id) }).lean(),
      db.Announcements.find({ schoolId: String(school._id), audience: { $in: ['PUBLIC', 'ALL'] } })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      db.InspectionReports.find({
        schoolId: String(school._id),
        adminStatus: 'APPROVED',
        publicSummaryApproved: true,
      })
        .sort({ reviewedAt: -1 })
        .limit(5)
        .lean(),
    ]);

    return res.json({
      school: {
        _id: school._id,
        name: school.name,
        slug: school.slug,
        schoolCode: school.schoolCode,
        emisCode: school.emisCode,
        registrationNumber: school.registrationNumber,
        schoolType: school.schoolType,
        schoolCategory: school.schoolCategory,
        educationLevels: school.educationLevels,
        genderType: school.genderType,
        establishedYear: school.establishedYear,
        numberOfCampuses: school.numberOfCampuses,
        parentOrganization: school.parentOrganization,
        website: school.website,
        logo: school.logo,
        photographs: school.photographs,
        address: school.address,
        province: school.province,
        district: school.district,
        city: school.city,
        tehsil: school.tehsil,
        unionCouncil: school.unionCouncil,
        postalCode: school.postalCode,
        location: school.location,
        educationDepartment: school.educationDepartment,
        administrativeRegion: school.administrativeRegion,
        relevantAuthority: school.relevantAuthority,
        principalName: school.principalName,
        contactNumber: school.contactNumber,
        officialEmail: school.officialEmail,
        facilities: school.facilities,
        overview: school.overview,
        verificationStatus: school.verificationStatus,
        verifiedAt: school.verifiedAt,
        registrationStatus: school.registrationStatus,
      },
      classesOffered: classes.map((c: any) => ({ _id: c._id, name: c.name, gradeLevel: c.gradeLevel, academicSession: c.academicSession })),
      announcements: announcements.map((a: any) => ({ _id: a._id, title: a.title, content: a.content, createdAt: a.createdAt, isPinned: a.isPinned })),
      publicInspectionSummaries: publicReports.map((r: any) => ({
        _id: r._id,
        riskAssessment: r.riskAssessment,
        finalConclusion: r.finalConclusion,
        reviewedAt: r.reviewedAt,
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ADMIN / OWNER: List Schools
router.get('/schools', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const { schoolType, registrationStatus, verificationStatus, province, district, q = '' } = req.query as Record<string, string>;
    const filter: Record<string, any> = {};

    if (req.user!.role === UserRole.SCHOOL_OWNER) {
      const ids = Array.from(new Set([...(req.user!.schoolIds || []), ...(req.user!.schoolId ? [req.user!.schoolId] : [])]));
      filter._id = { $in: ids };
    } else if (req.user!.role !== UserRole.SUPER_ADMIN && req.user!.role !== UserRole.INSPECTOR && req.user!.role !== UserRole.GROUP_LEADER) {
      filter.registrationStatus = RegistrationStatus.APPROVED;
      filter.verificationStatus = { $ne: VerificationStatus.SUSPENDED };
    }

    if (schoolType && schoolType !== 'ALL') filter.schoolType = schoolType;
    if (registrationStatus && registrationStatus !== 'ALL') filter.registrationStatus = registrationStatus;
    if (verificationStatus && verificationStatus !== 'ALL') filter.verificationStatus = verificationStatus;
    if (province && province !== 'ALL') filter.province = province;
    if (district && district !== 'ALL') filter.district = district;
    if (q.trim()) {
      const rx = new RegExp(q.trim(), 'i');
      filter.$or = [{ name: rx }, { registrationNumber: rx }, { schoolCode: rx }, { district: rx }];
    }

    const schools = await db.Schools.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ items: schools });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// School Owner: update editable profile fields (NEVER schoolType, registrationStatus, verificationStatus)
router.patch('/schools/:id/profile', requireAuth, requireRoles(UserRole.SCHOOL_OWNER, UserRole.SUPER_ADMIN), async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const school: any = await db.Schools.findById(req.params.id).lean();
    if (!school) return res.status(404).json({ error: 'School not found' });

    if (req.user!.role === UserRole.SCHOOL_OWNER) {
      const owned = new Set([...(req.user!.schoolIds || []), req.user!.schoolId].filter(Boolean).map(String));
      if (!owned.has(String(school._id))) {
        return res.status(403).json({ error: 'Access denied to this school' });
      }
    }

    const allowed = ['overview', 'website', 'contactNumber', 'officialEmail', 'principalName', 'administratorName', 'facilities', 'logo', 'photographs', 'operatingStatus'];
    const update: Record<string, any> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const updated = await db.Schools.findByIdAndUpdate(String(school._id), { $set: update }, { new: true }).lean();
    return res.json({ school: updated });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// Ownership Change Administrative Request (School cannot self-change ownership after approval)
router.post('/schools/:id/ownership-change-request', requireAuth, requireRoles(UserRole.SCHOOL_OWNER, UserRole.SUPER_ADMIN), async (req: AuthedRequest, res) => {
  try {
    const { requestedSchoolType, justification } = req.body || {};
    if (!requestedSchoolType || !justification) {
      return res.status(400).json({ error: 'Requested ownership type and official justification are required' });
    }
    const db = getDb();
    const school: any = await db.Schools.findById(req.params.id).lean();
    if (!school) return res.status(404).json({ error: 'School not found' });

    if (req.user!.role === UserRole.SCHOOL_OWNER) {
      // School owners cannot mutate ownership directly; creates an audit record for Super Admin review
      await recordAuditLog({
        userId: req.user!._id,
        userName: req.user!.fullName,
        role: req.user!.role,
        action: 'OWNERSHIP_CHANGE_REQUESTED',
        targetResource: 'Schools',
        targetId: String(school._id),
        previousValues: { schoolType: school.schoolType },
        newValues: { requestedSchoolType, justification },
        ipAddress: getClientIp(req),
      });
      return res.status(202).json({
        message: 'Ownership change cannot be self-applied. An administrative review request and audit record have been submitted to the Super Admin.',
      });
    }

    // Super Admin administrative override
    const updated = await db.Schools.findByIdAndUpdate(
      String(school._id),
      { $set: { schoolType: requestedSchoolType } },
      { new: true }
    ).lean();

    await recordAuditLog({
      userId: req.user!._id,
      userName: req.user!.fullName,
      role: req.user!.role,
      action: 'OWNERSHIP_CHANGED_BY_ADMIN',
      targetResource: 'Schools',
      targetId: String(school._id),
      previousValues: { schoolType: school.schoolType },
      newValues: { schoolType: requestedSchoolType, justification },
      ipAddress: getClientIp(req),
    });

    return res.json({ school: updated, message: 'Ownership classification updated under administrative audit.' });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// SUPER ADMIN / APPLICANT: School Registration Applications
router.get('/school-applications', requireAuth, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_OWNER), async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const { tab = 'all', q = '' } = req.query as Record<string, string>;
    const filter: Record<string, any> = {};

    if (req.user!.role === UserRole.SCHOOL_OWNER) {
      filter.applicantId = req.user!._id;
    }

    if (tab === 'government') filter.schoolType = SchoolType.GOVERNMENT;
    else if (tab === 'private') filter.schoolType = SchoolType.PRIVATE;
    else if (tab === 'pending') filter.status = RegistrationStatus.PENDING;
    else if (tab === 'under_review') filter.status = RegistrationStatus.UNDER_REVIEW;
    else if (tab === 'approved') filter.status = RegistrationStatus.APPROVED;
    else if (tab === 'rejected') filter.status = RegistrationStatus.REJECTED;
    else if (tab === 'more_info') filter.status = RegistrationStatus.MORE_INFORMATION_REQUIRED;

    const apps: any[] = await db.SchoolApplications.find(filter).sort({ createdAt: -1 }).lean();
    const schoolIds = apps.map((a) => String(a.schoolId));
    const userIds = apps.map((a) => String(a.applicantId));

    const [schools, applicants] = await Promise.all([
      db.Schools.find({ _id: { $in: schoolIds } }).lean(),
      db.Users.find({ _id: { $in: userIds } }).lean(),
    ]);
    const schoolMap = new Map(schools.map((s: any) => [String(s._id), s]));
    const userMap = new Map(applicants.map((u: any) => [String(u._id), u]));

    let joined = apps.map((app) => {
      const s: any = schoolMap.get(String(app.schoolId));
      const u: any = userMap.get(String(app.applicantId));
      return {
        ...app,
        internalNotes: req.user!.role === UserRole.SUPER_ADMIN ? app.internalNotes : [],
        school: s || null,
        applicant: u ? { _id: u._id, fullName: u.fullName, email: u.email, phone: u.phone, designation: u.designation, employeeId: u.employeeId } : null,
      };
    });

    if (q.trim()) {
      const ql = q.trim().toLowerCase();
      joined = joined.filter(
        (row) =>
          row.school?.name?.toLowerCase().includes(ql) ||
          row.school?.registrationNumber?.toLowerCase().includes(ql) ||
          row.school?.district?.toLowerCase().includes(ql) ||
          row.applicant?.fullName?.toLowerCase().includes(ql)
      );
    }

    return res.json({ items: joined });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/school-applications/:id', requireAuth, requireRoles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_OWNER), async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const app: any = await db.SchoolApplications.findById(req.params.id).lean();
    if (!app) return res.status(404).json({ error: 'Application not found' });

    if (req.user!.role === UserRole.SCHOOL_OWNER && String(app.applicantId) !== req.user!._id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [school, applicant, documents] = await Promise.all([
      db.Schools.findById(String(app.schoolId)).lean(),
      db.Users.findById(String(app.applicantId)).lean(),
      db.SchoolDocuments.find({ schoolId: String(app.schoolId) }).lean(),
    ]);

    return res.json({
      application: {
        ...app,
        internalNotes: req.user!.role === UserRole.SUPER_ADMIN ? app.internalNotes : [],
      },
      school,
      applicant: applicant
        ? {
            _id: (applicant as any)._id,
            fullName: (applicant as any).fullName,
            email: (applicant as any).email,
            phone: (applicant as any).phone,
            designation: (applicant as any).designation,
            employeeId: (applicant as any).employeeId,
            cnicOrReference: (applicant as any).cnicOrReference,
          }
        : null,
      documents,
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// SUPER ADMIN: Application decision (Approve, Reject, Request More Info, Under Review, Keep Pending)
router.post('/school-applications/:id/decision', requireAuth, requireRoles(UserRole.SUPER_ADMIN), async (req: AuthedRequest, res) => {
  try {
    const { decision, remarks = '' } = req.body || {};
    const statusMap: Record<string, RegistrationStatus> = {
      APPROVE: RegistrationStatus.APPROVED,
      REJECT: RegistrationStatus.REJECTED,
      REQUEST_INFO: RegistrationStatus.MORE_INFORMATION_REQUIRED,
      UNDER_REVIEW: RegistrationStatus.UNDER_REVIEW,
      KEEP_PENDING: RegistrationStatus.PENDING,
    };
    const nextStatus = statusMap[decision];
    if (!nextStatus) {
      return res.status(400).json({ error: 'Invalid decision action' });
    }
    if ((nextStatus === RegistrationStatus.REJECTED || nextStatus === RegistrationStatus.MORE_INFORMATION_REQUIRED) && !remarks.trim()) {
      return res.status(400).json({ error: 'Please provide a clear reason or requested details' });
    }

    const db = getDb();
    const app: any = await db.SchoolApplications.findById(req.params.id).lean();
    if (!app) return res.status(404).json({ error: 'Application not found' });
    const school: any = await db.Schools.findById(String(app.schoolId)).lean();
    if (!school) return res.status(404).json({ error: 'Associated school not found' });

    const prevStatus = app.status;
    const now = new Date().toISOString();

    const updatedApp = await db.SchoolApplications.findByIdAndUpdate(
      String(app._id),
      {
        $set: {
          status: nextStatus,
          reviewedBy: req.user!._id,
          reviewedAt: now,
          adminRemarks: remarks,
        },
        $push: {
          history: {
            status: nextStatus,
            actionBy: req.user!._id,
            actionByName: req.user!.fullName,
            comment: remarks || `Status updated to ${nextStatus}`,
            timestamp: now,
          },
        },
      },
      { new: true }
    ).lean();

    const schoolPatch: Record<string, any> = { registrationStatus: nextStatus };
    if (nextStatus === RegistrationStatus.APPROVED) {
      schoolPatch.approvedBy = req.user!._id;
      schoolPatch.approvedAt = now;
      // Rule: Approved does NOT automatically mean verified!
    } else if (nextStatus === RegistrationStatus.REJECTED) {
      schoolPatch.rejectionReason = remarks;
    }

    const updatedSchool = await db.Schools.findByIdAndUpdate(String(school._id), { $set: schoolPatch }, { new: true }).lean();

    const notifTitle =
      nextStatus === RegistrationStatus.APPROVED
        ? 'School Registration Approved'
        : nextStatus === RegistrationStatus.REJECTED
          ? 'School Registration Rejected'
          : nextStatus === RegistrationStatus.MORE_INFORMATION_REQUIRED
            ? 'Additional Information Requested'
            : 'Application Status Updated';

    await notifyUser({
      recipientId: String(app.applicantId),
      type: `APPLICATION_${nextStatus}`,
      title: notifTitle,
      message: `${school.name}: ${remarks || `Application status changed to ${nextStatus}.`}`,
      resourceType: 'SchoolApplication',
      resourceId: String(app._id),
    });

    await recordAuditLog({
      userId: req.user!._id,
      userName: req.user!.fullName,
      role: req.user!.role,
      action: `SCHOOL_APPLICATION_${nextStatus}`,
      targetResource: 'SchoolApplications',
      targetId: String(app._id),
      previousValues: { status: prevStatus },
      newValues: { status: nextStatus, remarks },
      ipAddress: getClientIp(req),
    });

    return res.json({ application: updatedApp, school: updatedSchool });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/school-applications/:id/notes', requireAuth, requireRoles(UserRole.SUPER_ADMIN), async (req: AuthedRequest, res) => {
  try {
    const note = String(req.body?.note || '').trim();
    if (!note) return res.status(400).json({ error: 'Note text is required' });
    const db = getDb();
    const updated = await db.SchoolApplications.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          internalNotes: {
            authorId: req.user!._id,
            authorName: req.user!.fullName,
            note,
            createdAt: new Date().toISOString(),
          },
        },
      },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: 'Application not found' });
    return res.json({ application: updated });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// Applicant resubmission when DRAFT or MORE_INFORMATION_REQUIRED
router.put('/school-applications/:id/resubmit', requireAuth, requireRoles(UserRole.SCHOOL_OWNER), async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const app: any = await db.SchoolApplications.findById(req.params.id).lean();
    if (!app || String(app.applicantId) !== req.user!._id) {
      return res.status(404).json({ error: 'Application not found' });
    }
    if (![RegistrationStatus.DRAFT, RegistrationStatus.MORE_INFORMATION_REQUIRED].includes(app.status)) {
      return res.status(400).json({ error: 'Only draft or info-requested applications can be resubmitted' });
    }
    const { comment = 'Additional documents and details submitted.', documents = [] } = req.body || {};

    for (const doc of documents) {
      const created: any = await db.SchoolDocuments.create({
        schoolId: app.schoolId,
        uploadedBy: req.user!._id,
        ...doc,
      });
      await db.Schools.findByIdAndUpdate(String(app.schoolId), { $push: { documents: created._id } });
    }

    const updatedApp = await db.SchoolApplications.findByIdAndUpdate(
      String(app._id),
      {
        $set: { status: RegistrationStatus.PENDING },
        $push: {
          history: {
            status: RegistrationStatus.PENDING,
            actionBy: req.user!._id,
            actionByName: req.user!.fullName,
            comment,
            timestamp: new Date().toISOString(),
          },
        },
      },
      { new: true }
    ).lean();

    await db.Schools.findByIdAndUpdate(String(app.schoolId), {
      $set: { registrationStatus: RegistrationStatus.PENDING },
    });

    return res.json({ application: updatedApp, message: 'Application resubmitted for Education Department review.' });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// VERIFICATION MANAGEMENT (Independent from Approval & Ownership)
router.get('/verification/:schoolId/history', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const [history, reports, documents] = await Promise.all([
      db.VerificationHistory.find({ schoolId: req.params.schoolId }).sort({ createdAt: -1 }).lean(),
      db.InspectionReports.find({ schoolId: req.params.schoolId }).sort({ createdAt: -1 }).lean(),
      db.SchoolDocuments.find({ schoolId: req.params.schoolId }).lean(),
    ]);
    return res.json({ history, inspectionReports: reports, documents });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/verification/:schoolId', requireAuth, requireRoles(UserRole.SUPER_ADMIN), async (req: AuthedRequest, res) => {
  try {
    const { newStatus, reason, supportingDocUrl = '' } = req.body || {};
    if (!Object.values(VerificationStatus).includes(newStatus)) {
      return res.status(400).json({ error: 'Invalid verification status' });
    }
    if (!String(reason || '').trim()) {
      return res.status(400).json({ error: 'Verification reason is mandatory for the audit record' });
    }

    const db = getDb();
    const school: any = await db.Schools.findById(req.params.schoolId).lean();
    if (!school) return res.status(404).json({ error: 'School not found' });

    if (school.registrationStatus !== RegistrationStatus.APPROVED && newStatus === VerificationStatus.VERIFIED) {
      return res.status(400).json({ error: 'Only approved schools can be verified' });
    }

    const previousStatus = school.verificationStatus;
    const now = new Date().toISOString();

    const patch: Record<string, any> = { verificationStatus: newStatus };
    if (newStatus === VerificationStatus.VERIFIED) {
      patch.verifiedBy = req.user!._id;
      patch.verifiedAt = now;
      patch.suspensionReason = '';
      patch.operatingStatus = 'Active';
    } else if (newStatus === VerificationStatus.SUSPENDED) {
      patch.suspensionReason = reason;
      patch.operatingStatus = 'Suspended';
    } else if (newStatus === VerificationStatus.UNVERIFIED) {
      patch.verifiedBy = null;
      patch.verifiedAt = null;
      patch.suspensionReason = '';
      patch.operatingStatus = 'Active';
    }

    const updatedSchool = await db.Schools.findByIdAndUpdate(String(school._id), { $set: patch }, { new: true }).lean();

    const historyEntry = await db.VerificationHistory.create({
      schoolId: school._id,
      previousStatus,
      newStatus,
      adminId: req.user!._id,
      adminName: req.user!.fullName,
      reason,
      supportingDocUrl,
    });

    await notifyUser({
      recipientId: String(school.owner),
      type: 'VERIFICATION_UPDATED',
      title: `School Verification Status: ${newStatus}`,
      message: `${school.name} verification changed from ${previousStatus} to ${newStatus}. Reason: ${reason}`,
      resourceType: 'School',
      resourceId: String(school._id),
    });

    await recordAuditLog({
      userId: req.user!._id,
      userName: req.user!.fullName,
      role: req.user!.role,
      action: `SCHOOL_VERIFICATION_${newStatus}`,
      targetResource: 'Schools',
      targetId: String(school._id),
      previousValues: { verificationStatus: previousStatus },
      newValues: { verificationStatus: newStatus, reason },
      ipAddress: getClientIp(req),
    });

    return res.json({ school: updatedSchool, historyEntry });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
