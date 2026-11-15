import { Router } from 'express';
import { getDb } from '../db/connection.js';
import {
  AuthedRequest,
  getClientIp,
  requireAuth,
  requireRoles,
} from '../middleware/auth.js';
import { notifySuperAdmins, notifyUser, recordAuditLog } from '../services/auditAndNotify.js';
import {
  ComplaintStatus,
  CorrectiveActionStatus,
  InspectionGroupStatus,
  RegistrationStatus,
  UserRole,
} from '../types.js';

const router = Router();

// ==========================================
// INSPECTION GROUPS
// ==========================================
router.get('/inspection-groups', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const filter: Record<string, any> = {};

    if (req.user!.role === UserRole.INSPECTOR || req.user!.role === UserRole.GROUP_LEADER) {
      const memberships: any[] = await db.InspectionMembers.find({ inspectorId: req.user!._id }).lean();
      const groupIds = memberships.map((m) => String(m.groupId));
      filter._id = { $in: groupIds.length ? groupIds : ['none'] };
    } else if (req.user!.role === UserRole.SCHOOL_OWNER) {
      const owned = Array.from(new Set([...(req.user!.schoolIds || []), req.user!.schoolId].filter(Boolean).map(String)));
      filter.targetSchoolId = { $in: owned.length ? owned : ['none'] };
    } else if (req.user!.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.query.schoolType && req.query.schoolType !== 'ALL') filter.schoolType = req.query.schoolType;
    if (req.query.status && req.query.status !== 'ALL') filter.status = req.query.status;

    const groups: any[] = await db.InspectionGroups.find(filter).sort({ createdAt: -1 }).lean();
    const schoolIds = Array.from(new Set(groups.map((g) => String(g.targetSchoolId))));
    const groupIds = groups.map((g) => String(g._id));

    const [schools, members, users, reports] = await Promise.all([
      schoolIds.length ? db.Schools.find({ _id: { $in: schoolIds } }).lean() : [],
      groupIds.length ? db.InspectionMembers.find({ groupId: { $in: groupIds } }).lean() : [],
      db.Users.find({ role: { $in: [UserRole.INSPECTOR, UserRole.GROUP_LEADER] } }).lean(),
      groupIds.length ? db.InspectionReports.find({ groupId: { $in: groupIds } }).lean() : [],
    ]);

    const schoolMap = new Map(schools.map((s: any) => [String(s._id), s]));
    const userMap = new Map(users.map((u: any) => [String(u._id), { _id: u._id, fullName: u.fullName, email: u.email, role: u.role, specialization: u.specialization }]));
    const reportMap = new Map(reports.map((r: any) => [String(r.groupId), r]));

    const items = groups.map((g) => {
      const gMembers = (members as any[])
        .filter((m) => String(m.groupId) === String(g._id))
        .map((m) => ({ ...m, inspector: userMap.get(String(m.inspectorId)) || null }));
      return {
        ...g,
        school: schoolMap.get(String(g.targetSchoolId)) || null,
        groupLeader: userMap.get(String(g.groupLeaderId)) || null,
        members: gMembers,
        report: reportMap.get(String(g._id)) || null,
      };
    });

    return res.json({ items });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/inspection-groups/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const group: any = await db.InspectionGroups.findById(req.params.id).lean();
    if (!group) return res.status(404).json({ error: 'Inspection group not found' });

    if (req.user!.role === UserRole.INSPECTOR || req.user!.role === UserRole.GROUP_LEADER) {
      const member = await db.InspectionMembers.findOne({ groupId: String(group._id), inspectorId: req.user!._id }).lean();
      if (!member) return res.status(403).json({ error: 'You are not assigned to this inspection group' });
    } else if (req.user!.role === UserRole.SCHOOL_OWNER) {
      const owned = new Set([...(req.user!.schoolIds || []), req.user!.schoolId].filter(Boolean).map(String));
      if (!owned.has(String(group.targetSchoolId))) return res.status(403).json({ error: 'Access denied' });
    } else if (req.user!.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [school, members, tasks, findings, report, complaints] = await Promise.all([
      db.Schools.findById(String(group.targetSchoolId)).lean(),
      db.InspectionMembers.find({ groupId: String(group._id) }).lean(),
      db.InspectionTasks.find({ groupId: String(group._id) }).sort({ createdAt: -1 }).lean(),
      db.InspectionFindings.find({ groupId: String(group._id) }).sort({ createdAt: -1 }).lean(),
      db.InspectionReports.findOne({ groupId: String(group._id) }).lean(),
      group.relatedComplaints?.length ? db.Complaints.find({ _id: { $in: group.relatedComplaints } }).lean() : [],
    ]);

    const inspectorIds = Array.from(new Set([...(members as any[]).map((m) => String(m.inspectorId)), String(group.groupLeaderId)]));
    const inspectors: any[] = inspectorIds.length ? await db.Users.find({ _id: { $in: inspectorIds } }).lean() : [];
    const inspMap = new Map(inspectors.map((u) => [String(u._id), { _id: u._id, fullName: u.fullName, email: u.email, role: u.role, specialization: u.specialization }]));

    return res.json({
      group,
      school,
      groupLeader: inspMap.get(String(group.groupLeaderId)) || null,
      members: (members as any[]).map((m) => ({ ...m, inspector: inspMap.get(String(m.inspectorId)) || null })),
      tasks,
      findings,
      report,
      relatedComplaints: complaints,
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/inspection-groups', requireAuth, requireRoles(UserRole.SUPER_ADMIN), async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const {
      groupName,
      targetSchoolId,
      reason,
      inspectionType,
      relatedComplaints = [],
      priority = 'HIGH',
      deadline,
      instructions = '',
      inspectorIds = [],
      groupLeaderId,
    } = req.body || {};

    if (!groupName || !targetSchoolId || !reason || !inspectionType || !deadline || !groupLeaderId) {
      return res.status(400).json({ error: 'Group name, target school, reason, type, deadline, and group leader are required' });
    }

    const school: any = await db.Schools.findById(targetSchoolId).lean();
    if (!school || school.registrationStatus !== RegistrationStatus.APPROVED) {
      return res.status(400).json({ error: 'Inspection groups can only be created for approved schools' });
    }

    const count = await db.InspectionGroups.countDocuments({});
    const inspectionId = `EG-INSP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const group: any = await db.InspectionGroups.create({
      inspectionId,
      groupName,
      targetSchoolId: school._id,
      schoolType: school.schoolType,
      district: school.district,
      reason,
      inspectionType,
      relatedComplaints,
      priority,
      deadline: new Date(deadline).toISOString(),
      instructions,
      groupLeaderId,
      status: InspectionGroupStatus.ASSIGNED,
      createdBy: req.user!._id,
    });

    const uniqueInspectors = Array.from(new Set([...inspectorIds, groupLeaderId].map(String)));
    for (const inspId of uniqueInspectors) {
      await db.InspectionMembers.create({
        groupId: group._id,
        inspectorId: inspId,
        isLeader: String(inspId) === String(groupLeaderId),
      });
      await notifyUser({
        recipientId: inspId,
        type: 'INSPECTOR_ASSIGNED',
        title: `Assigned to Inspection Group ${inspectionId}`,
        message: `You were assigned to "${groupName}" for ${school.name} (${school.schoolType}).`,
        resourceType: 'InspectionGroup',
        resourceId: String(group._id),
      });
    }

    for (const cmpId of relatedComplaints) {
      await db.Complaints.findByIdAndUpdate(String(cmpId), {
        $set: { status: ComplaintStatus.INVESTIGATION_ASSIGNED, assignedInspectionGroupId: group._id },
      });
      await db.ComplaintTimeline.create({
        complaintId: cmpId,
        status: ComplaintStatus.INVESTIGATION_ASSIGNED,
        title: 'Inspection Group Assigned',
        description: `Assigned to ${inspectionId} (${groupName}).`,
        actorId: req.user!._id,
        actorName: req.user!.fullName,
        isPublic: true,
      });
    }

    await recordAuditLog({
      userId: req.user!._id,
      userName: req.user!.fullName,
      role: req.user!.role,
      action: 'INSPECTION_GROUP_CREATED',
      targetResource: 'InspectionGroups',
      targetId: String(group._id),
      newValues: { inspectionId, schoolId: String(school._id), groupLeaderId },
      ipAddress: getClientIp(req),
    });

    return res.status(201).json({ group });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// Super Admin: Update team members / change group leader / send instructions
router.patch('/inspection-groups/:id/team', requireAuth, requireRoles(UserRole.SUPER_ADMIN), async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const group: any = await db.InspectionGroups.findById(req.params.id).lean();
    if (!group) return res.status(404).json({ error: 'Inspection group not found' });
    if ([InspectionGroupStatus.REPORT_SUBMITTED, InspectionGroupStatus.COMPLETED, InspectionGroupStatus.CLOSED].includes(group.status)) {
      return res.status(400).json({ error: 'Cannot alter team members after final report submission' });
    }

    const { addInspectorId, removeInspectorId, groupLeaderId, instructions } = req.body || {};

    if (addInspectorId) {
      const exists = await db.InspectionMembers.findOne({ groupId: String(group._id), inspectorId: addInspectorId }).lean();
      if (!exists) {
        await db.InspectionMembers.create({ groupId: group._id, inspectorId: addInspectorId, isLeader: false });
        await notifyUser({
          recipientId: addInspectorId,
          type: 'INSPECTOR_ASSIGNED',
          title: `Added to Inspection ${group.inspectionId}`,
          message: `You were added to inspection group "${group.groupName}".`,
          resourceType: 'InspectionGroup',
          resourceId: String(group._id),
        });
      }
    }

    if (removeInspectorId && String(removeInspectorId) !== String(group.groupLeaderId)) {
      await db.InspectionMembers.deleteOne({ groupId: String(group._id), inspectorId: removeInspectorId });
    }

    const patch: Record<string, any> = {};
    if (groupLeaderId) {
      patch.groupLeaderId = groupLeaderId;
      await db.InspectionMembers.updateMany({ groupId: String(group._id) }, { $set: { isLeader: false } });
      const leaderMember = await db.InspectionMembers.findOne({ groupId: String(group._id), inspectorId: groupLeaderId }).lean();
      if (leaderMember) {
        await db.InspectionMembers.updateOne({ _id: (leaderMember as any)._id }, { $set: { isLeader: true } });
      } else {
        await db.InspectionMembers.create({ groupId: group._id, inspectorId: groupLeaderId, isLeader: true });
      }
    }
    if (instructions !== undefined) patch.instructions = instructions;

    const updated = Object.keys(patch).length
      ? await db.InspectionGroups.findByIdAndUpdate(String(group._id), { $set: patch }, { new: true }).lean()
      : group;

    return res.json({ group: updated });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ==========================================
// INVESTIGATION TASKS & FINDINGS
// ==========================================
router.post('/inspection-tasks', requireAuth, requireRoles(UserRole.SUPER_ADMIN, UserRole.GROUP_LEADER, UserRole.INSPECTOR), async (req: AuthedRequest, res) => {
  const db = getDb();
  const { groupId, title, description = '', assignedTo, dueDate } = req.body || {};
  if (!groupId || !title || !assignedTo) return res.status(400).json({ error: 'groupId, title, and assignedTo are required' });
  const task = await db.InspectionTasks.create({ groupId, title, description, assignedTo, dueDate: dueDate || null, createdBy: req.user!._id });
  await db.InspectionGroups.findByIdAndUpdate(groupId, { $set: { status: InspectionGroupStatus.IN_PROGRESS } });
  return res.status(201).json({ item: task });
});

router.patch('/inspection-tasks/:id', requireAuth, requireRoles(UserRole.SUPER_ADMIN, UserRole.GROUP_LEADER, UserRole.INSPECTOR), async (req: AuthedRequest, res) => {
  const db = getDb();
  const item = await db.InspectionTasks.findByIdAndUpdate(req.params.id, { $set: { status: req.body.status } }, { new: true }).lean();
  return res.json({ item });
});

router.post('/inspection-findings', requireAuth, requireRoles(UserRole.INSPECTOR, UserRole.GROUP_LEADER, UserRole.SUPER_ADMIN), async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const { groupId, title, observations, severity = 'MODERATE', notes = '', photos = [], documents = [] } = req.body || {};
    if (!groupId || !title || !observations) {
      return res.status(400).json({ error: 'Group, title, and observations are required' });
    }
    const group: any = await db.InspectionGroups.findById(groupId).lean();
    if (!group) return res.status(404).json({ error: 'Inspection group not found' });

    if (req.user!.role !== UserRole.SUPER_ADMIN) {
      const member = await db.InspectionMembers.findOne({ groupId, inspectorId: req.user!._id }).lean();
      if (!member) return res.status(403).json({ error: 'You are not a member of this inspection group' });
    }

    const finding = await db.InspectionFindings.create({
      groupId,
      inspectorId: req.user!._id,
      inspectorName: req.user!.fullName,
      title,
      observations,
      severity,
      notes,
      photos,
      documents,
    });

    if (group.status === InspectionGroupStatus.ASSIGNED) {
      await db.InspectionGroups.findByIdAndUpdate(groupId, { $set: { status: InspectionGroupStatus.IN_PROGRESS } });
    }

    await notifyUser({
      recipientId: String(group.groupLeaderId),
      type: 'FINDING_SUBMITTED',
      title: `New Finding in ${group.inspectionId}`,
      message: `${req.user!.fullName} submitted finding: "${title}".`,
      resourceType: 'InspectionGroup',
      resourceId: groupId,
    });

    return res.status(201).json({ item: finding });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// Group leader requests additional evidence or accepts a member finding
router.patch('/inspection-findings/:id/review', requireAuth, requireRoles(UserRole.GROUP_LEADER, UserRole.SUPER_ADMIN), async (req: AuthedRequest, res) => {
  const db = getDb();
  const { evidenceStatus, leaderFeedback = '' } = req.body || {};
  if (!['ACCEPTED', 'MORE_EVIDENCE_REQUESTED'].includes(evidenceStatus)) {
    return res.status(400).json({ error: 'Invalid evidence review status' });
  }
  const updated = await db.InspectionFindings.findByIdAndUpdate(
    req.params.id,
    { $set: { evidenceStatus, leaderFeedback } },
    { new: true }
  ).lean();
  return res.json({ item: updated });
});

// ==========================================
// FINAL INSPECTION REPORTS (Group Leader submits -> Super Admin approves -> Group closes)
// ==========================================
router.get('/inspection-reports', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const filter: Record<string, any> = {};
    if (req.user!.role === UserRole.INSPECTOR || req.user!.role === UserRole.GROUP_LEADER) {
      const memberships: any[] = await db.InspectionMembers.find({ inspectorId: req.user!._id }).lean();
      const groupIds = memberships.map((m) => String(m.groupId));
      filter.groupId = { $in: groupIds.length ? groupIds : ['none'] };
    } else if (req.user!.role === UserRole.SCHOOL_OWNER) {
      const owned = Array.from(new Set([...(req.user!.schoolIds || []), req.user!.schoolId].filter(Boolean).map(String)));
      filter.schoolId = { $in: owned.length ? owned : ['none'] };
      filter.adminStatus = 'APPROVED';
    } else if (req.user!.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const reports: any[] = await db.InspectionReports.find(filter).sort({ createdAt: -1 }).lean();
    const schoolIds = Array.from(new Set(reports.map((r) => String(r.schoolId))));
    const groupIds = Array.from(new Set(reports.map((r) => String(r.groupId))));
    const [schools, groups] = await Promise.all([
      schoolIds.length ? db.Schools.find({ _id: { $in: schoolIds } }).lean() : [],
      groupIds.length ? db.InspectionGroups.find({ _id: { $in: groupIds } }).lean() : [],
    ]);
    const schoolMap = new Map(schools.map((s: any) => [String(s._id), s]));
    const groupMap = new Map(groups.map((g: any) => [String(g._id), g]));

    const items = reports.map((r) => ({
      ...r,
      school: schoolMap.get(String(r.schoolId)) || null,
      group: groupMap.get(String(r.groupId)) || null,
    }));
    return res.json({ items });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/inspection-reports', requireAuth, requireRoles(UserRole.GROUP_LEADER, UserRole.SUPER_ADMIN), async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const {
      groupId,
      detailedFindings,
      violations = [],
      riskAssessment = 'MODERATE',
      recommendations,
      correctiveActionRequirements = '',
      finalConclusion,
      evidenceAttachments = [],
    } = req.body || {};

    if (!groupId || !detailedFindings || !recommendations || !finalConclusion) {
      return res.status(400).json({ error: 'Detailed findings, recommendations, and final conclusion are required' });
    }

    const group: any = await db.InspectionGroups.findById(groupId).lean();
    if (!group) return res.status(404).json({ error: 'Inspection group not found' });

    if (req.user!.role !== UserRole.SUPER_ADMIN && String(group.groupLeaderId) !== req.user!._id) {
      return res.status(403).json({ error: 'Only the appointed Group Leader can submit the final report' });
    }

    const existing = await db.InspectionReports.findOne({ groupId }).lean();
    let report: any;
    if (existing) {
      report = await db.InspectionReports.findByIdAndUpdate(
        String((existing as any)._id),
        {
          $set: {
            detailedFindings,
            violations,
            riskAssessment,
            recommendations,
            correctiveActionRequirements,
            finalConclusion,
            evidenceAttachments,
            adminStatus: 'PENDING_REVIEW',
            submittedAt: new Date().toISOString(),
          },
        },
        { new: true }
      ).lean();
    } else {
      report = await db.InspectionReports.create({
        groupId,
        schoolId: group.targetSchoolId,
        schoolType: group.schoolType,
        submittedBy: req.user!._id,
        detailedFindings,
        violations,
        riskAssessment,
        recommendations,
        correctiveActionRequirements,
        finalConclusion,
        evidenceAttachments,
        adminStatus: 'PENDING_REVIEW',
      });
    }

    // Rule: Submitted report sets status REPORT_SUBMITTED; NEVER auto-closes the group!
    await db.InspectionGroups.findByIdAndUpdate(groupId, { $set: { status: InspectionGroupStatus.REPORT_SUBMITTED } });

    for (const cmpId of group.relatedComplaints || []) {
      await db.Complaints.findByIdAndUpdate(String(cmpId), { $set: { status: ComplaintStatus.REPORT_SUBMITTED } });
      await db.ComplaintTimeline.create({
        complaintId: cmpId,
        status: ComplaintStatus.REPORT_SUBMITTED,
        title: 'Inspection Report Submitted',
        description: `Final report submitted by Group Leader for Education Department review.`,
        actorId: req.user!._id,
        actorName: req.user!.fullName,
        isPublic: true,
      });
    }

    await notifySuperAdmins({
      type: 'INSPECTION_REPORT_SUBMITTED',
      title: `Final Report Submitted (${group.inspectionId})`,
      message: `${req.user!.fullName} submitted the final inspection report for "${group.groupName}".`,
      resourceType: 'InspectionReport',
      resourceId: String(report._id),
    });

    return res.status(201).json({ report, message: 'Final report submitted for Super Admin review.' });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// Super Admin: Approve Report (closes group!) or Request Revisions
router.post('/inspection-reports/:id/review', requireAuth, requireRoles(UserRole.SUPER_ADMIN), async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const { decision, adminRemarks = '' } = req.body || {};
    if (!['APPROVE', 'REQUEST_REVISION'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be APPROVE or REQUEST_REVISION' });
    }
    const report: any = await db.InspectionReports.findById(req.params.id).lean();
    if (!report) return res.status(404).json({ error: 'Inspection report not found' });

    const now = new Date().toISOString();
    const adminStatus = decision === 'APPROVE' ? 'APPROVED' : 'REVISION_REQUESTED';

    const updatedReport = await db.InspectionReports.findByIdAndUpdate(
      String(report._id),
      {
        $set: {
          adminStatus,
          adminRemarks,
          reviewedBy: req.user!._id,
          reviewedAt: now,
        },
      },
      { new: true }
    ).lean();

    if (decision === 'APPROVE') {
      await db.InspectionGroups.findByIdAndUpdate(String(report.groupId), {
        $set: { status: InspectionGroupStatus.CLOSED, closedAt: now },
      });
    } else {
      await db.InspectionGroups.findByIdAndUpdate(String(report.groupId), {
        $set: { status: InspectionGroupStatus.REVISION_REQUESTED },
      });
    }

    await notifyUser({
      recipientId: String(report.submittedBy),
      type: `REPORT_${adminStatus}`,
      title: decision === 'APPROVE' ? 'Inspection Report Approved & Group Closed' : 'Report Revision Requested',
      message: adminRemarks || `Your inspection report status is now ${adminStatus}.`,
      resourceType: 'InspectionGroup',
      resourceId: String(report.groupId),
    });

    await recordAuditLog({
      userId: req.user!._id,
      userName: req.user!.fullName,
      role: req.user!.role,
      action: `INSPECTION_REPORT_${adminStatus}`,
      targetResource: 'InspectionReports',
      targetId: String(report._id),
      newValues: { adminStatus, adminRemarks },
      ipAddress: getClientIp(req),
    });

    return res.json({ report: updatedReport });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ==========================================
// CORRECTIVE ACTIONS
// ==========================================
router.get('/corrective-actions', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const filter: Record<string, any> = {};
    if (req.user!.role === UserRole.SCHOOL_OWNER) {
      const owned = Array.from(new Set([...(req.user!.schoolIds || []), req.user!.schoolId].filter(Boolean).map(String)));
      filter.schoolId = { $in: owned.length ? owned : ['none'] };
    } else if (req.user!.role !== UserRole.SUPER_ADMIN && req.user!.role !== UserRole.GROUP_LEADER) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.query.schoolType && req.query.schoolType !== 'ALL') filter.schoolType = req.query.schoolType;
    if (req.query.status && req.query.status !== 'ALL') filter.status = req.query.status;

    const actions: any[] = await db.CorrectiveActions.find(filter).sort({ createdAt: -1 }).lean();
    const schoolIds = Array.from(new Set(actions.map((a) => String(a.schoolId))));
    const schools: any[] = schoolIds.length ? await db.Schools.find({ _id: { $in: schoolIds } }).lean() : [];
    const schoolMap = new Map(schools.map((s) => [String(s._id), s]));

    return res.json({
      items: actions.map((a) => ({ ...a, school: schoolMap.get(String(a.schoolId)) || null })),
    });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/corrective-actions', requireAuth, requireRoles(UserRole.SUPER_ADMIN), async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const {
      schoolId,
      inspectionReportId = null,
      identifiedIssue,
      requiredCorrection,
      responsibleParty,
      deadline,
      priority = 'HIGH',
      supportingDocuments = [],
    } = req.body || {};

    if (!schoolId || !identifiedIssue || !requiredCorrection || !responsibleParty || !deadline) {
      return res.status(400).json({ error: 'All corrective action fields are required' });
    }

    const school: any = await db.Schools.findById(schoolId).lean();
    if (!school) return res.status(404).json({ error: 'School not found' });

    const item = await db.CorrectiveActions.create({
      schoolId: school._id,
      schoolType: school.schoolType,
      inspectionReportId: inspectionReportId || null,
      identifiedIssue,
      requiredCorrection,
      responsibleParty,
      deadline: new Date(deadline).toISOString(),
      priority,
      supportingDocuments,
      status: CorrectiveActionStatus.PENDING,
      createdBy: req.user!._id,
    });

    await notifyUser({
      recipientId: String(school.owner),
      type: 'CORRECTIVE_ACTION_ISSUED',
      title: 'Corrective Action Order Issued',
      message: `${school.name}: ${identifiedIssue}. Deadline: ${new Date(deadline).toLocaleDateString()}.`,
      resourceType: 'CorrectiveAction',
      resourceId: String((item as any)._id),
    });

    await recordAuditLog({
      userId: req.user!._id,
      userName: req.user!.fullName,
      role: req.user!.role,
      action: 'CORRECTIVE_ACTION_CREATED',
      targetResource: 'CorrectiveActions',
      targetId: String((item as any)._id),
      newValues: { schoolId: String(school._id), identifiedIssue, priority },
      ipAddress: getClientIp(req),
    });

    return res.status(201).json({ item });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// School submits evidence of corrective action
router.post('/corrective-actions/:id/submit-evidence', requireAuth, requireRoles(UserRole.SCHOOL_OWNER), async (req: AuthedRequest, res) => {
  const db = getDb();
  const action: any = await db.CorrectiveActions.findById(req.params.id).lean();
  if (!action) return res.status(404).json({ error: 'Corrective action not found' });

  const owned = new Set([...(req.user!.schoolIds || []), req.user!.schoolId].filter(Boolean).map(String));
  if (!owned.has(String(action.schoolId))) return res.status(403).json({ error: 'Access denied' });

  const { schoolEvidenceNotes, schoolEvidenceFiles = [] } = req.body || {};
  if (!schoolEvidenceNotes) return res.status(400).json({ error: 'Evidence notes are required' });

  const updated = await db.CorrectiveActions.findByIdAndUpdate(
    String(action._id),
    {
      $set: {
        status: CorrectiveActionStatus.COMPLETED,
        schoolEvidenceNotes,
        schoolEvidenceFiles,
        submittedAt: new Date().toISOString(),
      },
    },
    { new: true }
  ).lean();

  await notifySuperAdmins({
    type: 'CORRECTIVE_ACTION_EVIDENCE',
    title: 'Corrective Action Evidence Submitted',
    message: `Evidence submitted for "${action.identifiedIssue}".`,
    resourceType: 'CorrectiveAction',
    resourceId: String(action._id),
  });

  return res.json({ item: updated });
});

// Super Admin accepts or rejects corrective action evidence
router.post('/corrective-actions/:id/verify', requireAuth, requireRoles(UserRole.SUPER_ADMIN), async (req: AuthedRequest, res) => {
  const db = getDb();
  const { decision, adminReviewNotes = '' } = req.body || {};
  if (!['ACCEPT', 'REJECT'].includes(decision)) return res.status(400).json({ error: 'Decision must be ACCEPT or REJECT' });
  const action: any = await db.CorrectiveActions.findById(req.params.id).lean();
  if (!action) return res.status(404).json({ error: 'Corrective action not found' });

  const nextStatus = decision === 'ACCEPT' ? CorrectiveActionStatus.VERIFIED_BY_ADMIN : CorrectiveActionStatus.IN_PROGRESS;
  const updated = await db.CorrectiveActions.findByIdAndUpdate(
    String(action._id),
    {
      $set: {
        status: nextStatus,
        adminReviewNotes,
        verifiedBy: decision === 'ACCEPT' ? req.user!._id : null,
        verifiedAt: decision === 'ACCEPT' ? new Date().toISOString() : null,
      },
    },
    { new: true }
  ).lean();

  const school: any = await db.Schools.findById(String(action.schoolId)).lean();
  if (school?.owner) {
    await notifyUser({
      recipientId: String(school.owner),
      type: `CORRECTIVE_ACTION_${nextStatus}`,
      title: decision === 'ACCEPT' ? 'Corrective Action Verified' : 'Corrective Action Evidence Rejected',
      message: adminReviewNotes || `Corrective action status updated to ${nextStatus}.`,
      resourceType: 'CorrectiveAction',
      resourceId: String(action._id),
    });
  }

  return res.json({ item: updated });
});

export default router;
