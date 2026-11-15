import { Router } from 'express';
import crypto from 'crypto';
import { getDb } from '../db/connection.js';
import {
  AuthedRequest,
  requireAuth,
  requireOperationalSchoolAccess,
  requireRoles,
} from '../middleware/auth.js';
import { notifyUser } from '../services/auditAndNotify.js';
import { UserRole } from '../types.js';

const router = Router();

function computeGrade(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  if (pct >= 33) return 'E';
  return 'F';
}

// Helper for school-scoped queries
async function getAllowedSchoolId(req: AuthedRequest): Promise<string | null> {
  if ((req as any).resolvedSchoolId) return (req as any).resolvedSchoolId;
  const requested = (req.query.schoolId as string) || (req.body?.schoolId as string);
  if (req.user!.role === UserRole.SUPER_ADMIN) return requested || null;
  if (req.user!.role === UserRole.SCHOOL_OWNER) {
    const owned = new Set([...(req.user!.schoolIds || []), req.user!.schoolId].filter(Boolean).map(String));
    if (requested && owned.has(requested)) return requested;
    return req.user!.schoolId || Array.from(owned)[0] || null;
  }
  return req.user!.schoolId || null;
}

// ==========================================
// CLASSES, SECTIONS, SUBJECTS
// ==========================================
router.get('/classes', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const schoolId = await getAllowedSchoolId(req);
    const filter = schoolId ? { schoolId } : {};
    const items = await db.Classes.find(filter).sort({ name: 1 }).lean();
    return res.json({ items });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/classes', requireAuth, requireRoles(UserRole.SCHOOL_OWNER, UserRole.SUPER_ADMIN), requireOperationalSchoolAccess, async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const schoolId = await getAllowedSchoolId(req);
    const { name, gradeLevel, academicSession = '2026-2027', capacity = 40 } = req.body || {};
    if (!name || !gradeLevel) return res.status(400).json({ error: 'Class name and grade level are required' });
    const item = await db.Classes.create({ schoolId, name, gradeLevel, academicSession, capacity: Number(capacity) || 40 });
    return res.status(201).json({ item });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.delete('/classes/:id', requireAuth, requireRoles(UserRole.SCHOOL_OWNER, UserRole.SUPER_ADMIN), requireOperationalSchoolAccess, async (req: AuthedRequest, res) => {
  const db = getDb();
  const schoolId = await getAllowedSchoolId(req);
  const existing: any = await db.Classes.findById(req.params.id).lean();
  if (!existing || (schoolId && String(existing.schoolId) !== schoolId)) return res.status(404).json({ error: 'Class not found' });
  await db.Classes.findByIdAndDelete(req.params.id);
  return res.json({ deleted: true });
});

router.get('/sections', requireAuth, async (req: AuthedRequest, res) => {
  const db = getDb();
  const schoolId = await getAllowedSchoolId(req);
  const filter: Record<string, any> = schoolId ? { schoolId } : {};
  if (req.query.classId) filter.classId = req.query.classId;
  const items = await db.Sections.find(filter).sort({ name: 1 }).lean();
  return res.json({ items });
});

router.post('/sections', requireAuth, requireRoles(UserRole.SCHOOL_OWNER, UserRole.SUPER_ADMIN), requireOperationalSchoolAccess, async (req: AuthedRequest, res) => {
  const db = getDb();
  const schoolId = await getAllowedSchoolId(req);
  const { classId, name, classTeacherId = null, roomNumber = '', capacity = 40 } = req.body || {};
  if (!classId || !name) return res.status(400).json({ error: 'classId and section name are required' });
  const item = await db.Sections.create({ schoolId, classId, name, classTeacherId: classTeacherId || null, roomNumber, capacity: Number(capacity) || 40 });
  return res.status(201).json({ item });
});

router.get('/subjects', requireAuth, async (req: AuthedRequest, res) => {
  const db = getDb();
  const schoolId = await getAllowedSchoolId(req);
  const filter: Record<string, any> = schoolId ? { schoolId } : {};
  if (req.query.classId) filter.classId = req.query.classId;
  const items = await db.Subjects.find(filter).sort({ name: 1 }).lean();
  return res.json({ items });
});

router.post('/subjects', requireAuth, requireRoles(UserRole.SCHOOL_OWNER, UserRole.SUPER_ADMIN), requireOperationalSchoolAccess, async (req: AuthedRequest, res) => {
  const db = getDb();
  const schoolId = await getAllowedSchoolId(req);
  const { name, code, classId = null, teacherId = null } = req.body || {};
  if (!name || !code) return res.status(400).json({ error: 'Subject name and code are required' });
  const item = await db.Subjects.create({ schoolId, name, code, classId: classId || null, teacherId: teacherId || null });
  return res.status(201).json({ item });
});

// ==========================================
// TEACHERS
// ==========================================
router.get('/teachers', requireAuth, requireRoles(UserRole.SCHOOL_OWNER, UserRole.SUPER_ADMIN), requireOperationalSchoolAccess, async (req: AuthedRequest, res) => {
  const db = getDb();
  const schoolId = await getAllowedSchoolId(req);
  const items = await db.Teachers.find(schoolId ? { schoolId } : {}).sort({ fullName: 1 }).lean();
  return res.json({ items });
});

router.post('/teachers', requireAuth, requireRoles(UserRole.SCHOOL_OWNER, UserRole.SUPER_ADMIN), requireOperationalSchoolAccess, async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const schoolId = await getAllowedSchoolId(req);
    const { fullName, email, phone = '', employeeCode, qualification = '', subjects = [], assignedClassIds = [] } = req.body || {};
    if (!fullName || !email || !employeeCode) {
      return res.status(400).json({ error: 'Teacher name, email, and employee code are required' });
    }
    const item = await db.Teachers.create({
      schoolId,
      fullName,
      email,
      phone,
      employeeCode,
      qualification,
      subjects: Array.isArray(subjects) ? subjects : String(subjects).split(',').map((s) => s.trim()).filter(Boolean),
      assignedClassIds,
    });
    return res.status(201).json({ item });
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

router.patch('/teachers/:id', requireAuth, requireRoles(UserRole.SCHOOL_OWNER, UserRole.SUPER_ADMIN), requireOperationalSchoolAccess, async (req: AuthedRequest, res) => {
  const db = getDb();
  const schoolId = await getAllowedSchoolId(req);
  const existing: any = await db.Teachers.findById(req.params.id).lean();
  if (!existing || (schoolId && String(existing.schoolId) !== schoolId)) return res.status(404).json({ error: 'Teacher not found' });
  const item = await db.Teachers.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true }).lean();
  return res.json({ item });
});

// ==========================================
// STUDENTS (+ Promote, Transfer, Archive, Bulk CSV Import)
// ==========================================
router.get('/students', requireAuth, async (req: AuthedRequest, res) => {
  const db = getDb();
  if (req.user!.role === UserRole.STUDENT) {
    const student = await db.Students.findOne({ userId: req.user!._id }).lean();
    return res.json({ items: student ? [student] : [] });
  }
  if (req.user!.role === UserRole.PARENT) {
    const links: any[] = await db.ParentStudentRelationships.find({ parentId: req.user!._id, status: 'APPROVED' }).lean();
    const studentIds = links.map((l) => String(l.studentId));
    const items = studentIds.length > 0 ? await db.Students.find({ _id: { $in: studentIds } }).lean() : [];
    return res.json({ items });
  }
  const schoolId = await getAllowedSchoolId(req);
  const filter: Record<string, any> = schoolId ? { schoolId } : {};
  if (req.query.classId) filter.classId = req.query.classId;
  if (req.query.academicStatus) filter.academicStatus = req.query.academicStatus;
  if (req.query.q) {
    const rx = new RegExp(String(req.query.q), 'i');
    filter.$or = [{ fullName: rx }, { admissionNumber: rx }, { rollNumber: rx }];
  }
  const items = await db.Students.find(filter).sort({ createdAt: -1 }).lean();
  return res.json({ items });
});

router.post('/students', requireAuth, requireRoles(UserRole.SCHOOL_OWNER, UserRole.SUPER_ADMIN), requireOperationalSchoolAccess, async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const schoolId = await getAllowedSchoolId(req);
    const { fullName, admissionNumber, rollNumber = '', classId, sectionId = null, gender = 'Male', dateOfBirth = '', guardianName = '', guardianPhone = '', address = '' } = req.body || {};
    if (!fullName || !admissionNumber || !classId) {
      return res.status(400).json({ error: 'Student name, admission number, and class are required' });
    }
    const item = await db.Students.create({
      schoolId,
      fullName,
      admissionNumber,
      rollNumber,
      classId,
      sectionId: sectionId || null,
      gender,
      dateOfBirth,
      guardianName,
      guardianPhone,
      address,
    });
    return res.status(201).json({ item });
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

router.patch('/students/:id', requireAuth, requireRoles(UserRole.SCHOOL_OWNER, UserRole.SUPER_ADMIN), requireOperationalSchoolAccess, async (req: AuthedRequest, res) => {
  const db = getDb();
  const schoolId = await getAllowedSchoolId(req);
  const existing: any = await db.Students.findById(req.params.id).lean();
  if (!existing || (schoolId && String(existing.schoolId) !== schoolId)) return res.status(404).json({ error: 'Student not found' });
  const item = await db.Students.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true }).lean();
  return res.json({ item });
});

router.post('/students/:id/action', requireAuth, requireRoles(UserRole.SCHOOL_OWNER, UserRole.SUPER_ADMIN), requireOperationalSchoolAccess, async (req: AuthedRequest, res) => {
  const db = getDb();
  const schoolId = await getAllowedSchoolId(req);
  const existing: any = await db.Students.findById(req.params.id).lean();
  if (!existing || (schoolId && String(existing.schoolId) !== schoolId)) return res.status(404).json({ error: 'Student not found' });

  const { action, targetClassId, targetSectionId } = req.body || {};
  const patch: Record<string, any> = {};
  if (action === 'PROMOTE') {
    if (!targetClassId) return res.status(400).json({ error: 'Target class is required for promotion' });
    patch.classId = targetClassId;
    patch.sectionId = targetSectionId || null;
    patch.academicStatus = 'PROMOTED';
  } else if (action === 'TRANSFER') {
    patch.academicStatus = 'TRANSFERRED';
  } else if (action === 'ARCHIVE') {
    patch.academicStatus = 'ARCHIVED';
  } else if (action === 'ACTIVATE') {
    patch.academicStatus = 'ACTIVE';
  } else {
    return res.status(400).json({ error: 'Invalid student action' });
  }
  const item = await db.Students.findByIdAndUpdate(req.params.id, { $set: patch }, { new: true }).lean();
  return res.json({ item });
});

router.post('/students/bulk-import', requireAuth, requireRoles(UserRole.SCHOOL_OWNER, UserRole.SUPER_ADMIN), requireOperationalSchoolAccess, async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const schoolId = await getAllowedSchoolId(req);
    const { csvText, defaultClassId } = req.body || {};
    if (!csvText || !defaultClassId) return res.status(400).json({ error: 'csvText and defaultClassId are required' });

    const lines = String(csvText)
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const created: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      if (i === 0 && cols[0].toLowerCase().includes('name')) continue; // skip header
      const [fullName, admissionNumber, rollNumber = '', gender = 'Male', guardianName = '', guardianPhone = ''] = cols;
      if (!fullName || !admissionNumber) {
        errors.push(`Row ${i + 1}: missing fullName or admissionNumber`);
        continue;
      }
      try {
        const s = await db.Students.create({
          schoolId,
          fullName,
          admissionNumber,
          rollNumber,
          classId: defaultClassId,
          gender: ['Male', 'Female', 'Other'].includes(gender) ? gender : 'Male',
          guardianName,
          guardianPhone,
        });
        created.push(s);
      } catch (e) {
        errors.push(`Row ${i + 1} (${admissionNumber}): ${(e as Error).message}`);
      }
    }
    return res.status(201).json({ importedCount: created.length, errors, items: created });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ==========================================
// PARENT-STUDENT CONNECTIONS
// ==========================================
router.get('/parent-student', requireAuth, async (req: AuthedRequest, res) => {
  const db = getDb();
  let filter: Record<string, any> = {};
  if (req.user!.role === UserRole.PARENT) {
    filter.parentId = req.user!._id;
  } else if (req.user!.role === UserRole.SCHOOL_OWNER) {
    const schoolId = await getAllowedSchoolId(req);
    filter.schoolId = schoolId;
  }

  const links: any[] = await db.ParentStudentRelationships.find(filter).sort({ createdAt: -1 }).lean();
  const studentIds = links.map((l) => String(l.studentId));
  const schoolIds = links.map((l) => String(l.schoolId));
  const parentIds = links.map((l) => String(l.parentId));

  const [students, schools, parents] = await Promise.all([
    studentIds.length ? db.Students.find({ _id: { $in: studentIds } }).lean() : [],
    schoolIds.length ? db.Schools.find({ _id: { $in: schoolIds } }).lean() : [],
    parentIds.length ? db.Users.find({ _id: { $in: parentIds } }).lean() : [],
  ]);

  const stMap = new Map(students.map((s: any) => [String(s._id), s]));
  const scMap = new Map(schools.map((s: any) => [String(s._id), s]));
  const pMap = new Map(parents.map((p: any) => [String(p._id), p]));

  const items = links.map((l) => ({
    ...l,
    student: stMap.get(String(l.studentId)) || null,
    school: scMap.get(String(l.schoolId)) || null,
    parent: pMap.get(String(l.parentId))
      ? { _id: (pMap.get(String(l.parentId)) as any)._id, fullName: (pMap.get(String(l.parentId)) as any).fullName, email: (pMap.get(String(l.parentId)) as any).email, phone: (pMap.get(String(l.parentId)) as any).phone }
      : null,
  }));
  return res.json({ items });
});

router.post('/parent-student/request', requireAuth, requireRoles(UserRole.PARENT), async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const { schoolId, admissionNumber, relationship = 'Parent/Guardian' } = req.body || {};
    if (!schoolId || !admissionNumber) {
      return res.status(400).json({ error: 'School and student admission number are required' });
    }
    const student: any = await db.Students.findOne({ schoolId, admissionNumber: String(admissionNumber).trim() }).lean();
    if (!student) {
      return res.status(404).json({ error: 'No student found with that admission number at the selected school' });
    }
    const school: any = await db.Schools.findById(schoolId).lean();
    const existing = await db.ParentStudentRelationships.findOne({ parentId: req.user!._id, studentId: String(student._id) }).lean();
    if (existing) {
      return res.status(409).json({ error: 'A connection request for this student already exists' });
    }

    const link = await db.ParentStudentRelationships.create({
      parentId: req.user!._id,
      studentId: student._id,
      schoolId,
      relationship,
      status: 'PENDING',
    });

    if (school?.owner) {
      await notifyUser({
        recipientId: String(school.owner),
        type: 'STUDENT_CONNECTION_REQUEST',
        title: 'New Parent-Student Connection Request',
        message: `${req.user!.fullName} requested access to link student ${student.fullName} (${student.admissionNumber}).`,
        resourceType: 'ParentStudent',
        resourceId: String((link as any)._id),
      });
    }
    return res.status(201).json({ link, message: 'Connection request sent to the school for approval.' });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/parent-student/:id/review', requireAuth, requireRoles(UserRole.SCHOOL_OWNER, UserRole.SUPER_ADMIN), requireOperationalSchoolAccess, async (req: AuthedRequest, res) => {
  const db = getDb();
  const { status } = req.body || {};
  if (!['APPROVED', 'REJECTED'].includes(status)) return res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
  const link: any = await db.ParentStudentRelationships.findById(req.params.id).lean();
  if (!link) return res.status(404).json({ error: 'Request not found' });

  const updated = await db.ParentStudentRelationships.findByIdAndUpdate(
    req.params.id,
    { $set: { status, reviewedBy: req.user!._id, reviewedAt: new Date().toISOString() } },
    { new: true }
  ).lean();

  await notifyUser({
    recipientId: String(link.parentId),
    type: `STUDENT_CONNECTION_${status}`,
    title: `Student Connection ${status}`,
    message: `Your parent-student link request has been ${status.toLowerCase()}.`,
    resourceType: 'ParentStudent',
    resourceId: String(link._id),
  });

  return res.json({ item: updated });
});

// ==========================================
// ATTENDANCE
// ==========================================
router.get('/attendance', requireAuth, async (req: AuthedRequest, res) => {
  const db = getDb();
  const filter: Record<string, any> = {};

  if (req.user!.role === UserRole.STUDENT) {
    const student: any = await db.Students.findOne({ userId: req.user!._id }).lean();
    if (!student) return res.json({ items: [], summary: { total: 0, present: 0, absent: 0, late: 0, percentage: 0 } });
    filter.studentId = String(student._id);
  } else if (req.user!.role === UserRole.PARENT) {
    const links: any[] = await db.ParentStudentRelationships.find({ parentId: req.user!._id, status: 'APPROVED' }).lean();
    const ids = links.map((l) => String(l.studentId));
    filter.studentId = { $in: ids.length ? ids : ['none'] };
    if (req.query.studentId && ids.includes(String(req.query.studentId))) {
      filter.studentId = String(req.query.studentId);
    }
  } else {
    const schoolId = await getAllowedSchoolId(req);
    if (schoolId) filter.schoolId = schoolId;
    if (req.query.targetType) filter.targetType = req.query.targetType;
    if (req.query.date) filter.date = req.query.date;
    if (req.query.classId) filter.classId = req.query.classId;
  }

  const items: any[] = await db.Attendance.find(filter).sort({ date: -1 }).lean();
  const total = items.length;
  const present = items.filter((a) => a.status === 'PRESENT').length;
  const late = items.filter((a) => a.status === 'LATE').length;
  const absent = items.filter((a) => a.status === 'ABSENT').length;
  const percentage = total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 0;

  return res.json({ items, summary: { total, present, absent, late, percentage } });
});

router.post('/attendance/mark', requireAuth, requireRoles(UserRole.SCHOOL_OWNER, UserRole.SUPER_ADMIN), requireOperationalSchoolAccess, async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const schoolId = await getAllowedSchoolId(req);
    const { targetType = 'STUDENT', date, entries = [] } = req.body || {};
    if (!date || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'Date and attendance entries are required' });
    }

    const saved: any[] = [];
    for (const entry of entries) {
      const query: Record<string, any> = { schoolId, targetType, date };
      if (targetType === 'STUDENT') query.studentId = entry.studentId;
      else query.teacherId = entry.teacherId;

      const existing: any = await db.Attendance.findOne(query).lean();
      if (existing) {
        const up = await db.Attendance.findByIdAndUpdate(
          String(existing._id),
          { $set: { status: entry.status, remarks: entry.remarks || '', markedBy: req.user!._id } },
          { new: true }
        ).lean();
        saved.push(up);
      } else {
        const cr = await db.Attendance.create({
          schoolId,
          targetType,
          studentId: entry.studentId || null,
          teacherId: entry.teacherId || null,
          classId: entry.classId || null,
          sectionId: entry.sectionId || null,
          date,
          status: entry.status,
          remarks: entry.remarks || '',
          markedBy: req.user!._id,
        });
        saved.push(cr);
      }

      // Notify linked parents on ABSENT or LATE
      if (targetType === 'STUDENT' && entry.studentId && ['ABSENT', 'LATE'].includes(entry.status)) {
        const links: any[] = await db.ParentStudentRelationships.find({ studentId: entry.studentId, status: 'APPROVED' }).lean();
        for (const l of links) {
          await notifyUser({
            recipientId: String(l.parentId),
            type: 'ATTENDANCE_ALERT',
            title: `Student Attendance Alert (${entry.status})`,
            message: `Your child was marked ${entry.status} on ${date}.`,
            resourceType: 'Attendance',
            resourceId: String(entry.studentId),
          });
        }
      }
    }
    return res.status(201).json({ items: saved });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ==========================================
// EXAMINATIONS & RESULTS
// ==========================================
router.get('/examinations', requireAuth, async (req: AuthedRequest, res) => {
  const db = getDb();
  const schoolId = await getAllowedSchoolId(req);
  const filter: Record<string, any> = schoolId ? { schoolId } : {};
  const items = await db.Examinations.find(filter).sort({ startDate: -1 }).lean();
  return res.json({ items });
});

router.post('/examinations', requireAuth, requireRoles(UserRole.SCHOOL_OWNER, UserRole.SUPER_ADMIN), requireOperationalSchoolAccess, async (req: AuthedRequest, res) => {
  const db = getDb();
  const schoolId = await getAllowedSchoolId(req);
  const { title, term = 'Annual', classId, startDate, endDate, subjects = [] } = req.body || {};
  if (!title || !classId || !startDate || !endDate) {
    return res.status(400).json({ error: 'Title, class, start date, and end date are required' });
  }
  const item = await db.Examinations.create({ schoolId, title, term, classId, startDate, endDate, subjects });
  return res.status(201).json({ item });
});

router.get('/results', requireAuth, async (req: AuthedRequest, res) => {
  const db = getDb();
  const filter: Record<string, any> = {};
  if (req.user!.role === UserRole.STUDENT) {
    const student: any = await db.Students.findOne({ userId: req.user!._id }).lean();
    if (!student) return res.json({ items: [] });
    filter.studentId = String(student._id);
    filter.isPublished = true;
  } else if (req.user!.role === UserRole.PARENT) {
    const links: any[] = await db.ParentStudentRelationships.find({ parentId: req.user!._id, status: 'APPROVED' }).lean();
    const ids = links.map((l) => String(l.studentId));
    filter.studentId = { $in: ids.length ? ids : ['none'] };
    filter.isPublished = true;
  } else {
    const schoolId = await getAllowedSchoolId(req);
    if (schoolId) filter.schoolId = schoolId;
    if (req.query.examinationId) filter.examinationId = req.query.examinationId;
  }
  const items = await db.Results.find(filter).sort({ createdAt: -1 }).lean();
  return res.json({ items });
});

router.post('/results', requireAuth, requireRoles(UserRole.SCHOOL_OWNER, UserRole.SUPER_ADMIN), requireOperationalSchoolAccess, async (req: AuthedRequest, res) => {
  try {
    const db = getDb();
    const schoolId = await getAllowedSchoolId(req);
    const { examinationId, studentId, classId, marks = [], isPublished = true } = req.body || {};
    if (!examinationId || !studentId || !classId || !Array.isArray(marks) || marks.length === 0) {
      return res.status(400).json({ error: 'Examination, student, class, and marks are required' });
    }
    const processed = marks.map((m: any) => {
      const obtained = Number(m.obtainedMarks) || 0;
      const max = Number(m.maxMarks) || 100;
      const pct = max > 0 ? (obtained / max) * 100 : 0;
      return { subjectName: m.subjectName, obtainedMarks: obtained, maxMarks: max, grade: computeGrade(pct) };
    });
    const totalObtained = processed.reduce((s, m) => s + m.obtainedMarks, 0);
    const totalMax = processed.reduce((s, m) => s + m.maxMarks, 0);
    const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 1000) / 10 : 0;
    const overallGrade = computeGrade(percentage);
    const status = percentage >= 33 ? 'PASS' : 'FAIL';

    const item = await db.Results.create({
      schoolId,
      examinationId,
      studentId,
      classId,
      marks: processed,
      totalObtained,
      totalMax,
      percentage,
      overallGrade,
      status,
      isPublished,
    });
    return res.status(201).json({ item });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});

// ==========================================
// FEES & PAYMENTS
// ==========================================
router.get('/fees', requireAuth, async (req: AuthedRequest, res) => {
  const db = getDb();
  if (req.user!.role === UserRole.PARENT) {
    const links: any[] = await db.ParentStudentRelationships.find({ parentId: req.user!._id, status: 'APPROVED' }).lean();
    const schoolIds = Array.from(new Set(links.map((l) => String(l.schoolId))));
    const items = schoolIds.length ? await db.FeeStructures.find({ schoolId: { $in: schoolIds } }).lean() : [];
    return res.json({ items });
  }
  const schoolId = await getAllowedSchoolId(req);
  const items = await db.FeeStructures.find(schoolId ? { schoolId } : {}).sort({ createdAt: -1 }).lean();
  return res.json({ items });
});

router.post('/fees', requireAuth, requireRoles(UserRole.SCHOOL_OWNER, UserRole.SUPER_ADMIN), requireOperationalSchoolAccess, async (req: AuthedRequest, res) => {
  const db = getDb();
  const schoolId = await getAllowedSchoolId(req);
  const { title, classId = null, amount, frequency = 'MONTHLY', dueDate = '', description = '' } = req.body || {};
  if (!title || amount === undefined) return res.status(400).json({ error: 'Fee title and amount are required' });
  const item = await db.FeeStructures.create({ schoolId, title, classId: classId || null, amount: Number(amount), frequency, dueDate, description });
  return res.status(201).json({ item });
});

router.get('/payments', requireAuth, async (req: AuthedRequest, res) => {
  const db = getDb();
  const filter: Record<string, any> = {};
  if (req.user!.role === UserRole.PARENT) {
    const links: any[] = await db.ParentStudentRelationships.find({ parentId: req.user!._id, status: 'APPROVED' }).lean();
    const ids = links.map((l) => String(l.studentId));
    filter.studentId = { $in: ids.length ? ids : ['none'] };
  } else if (req.user!.role === UserRole.STUDENT) {
    const st: any = await db.Students.findOne({ userId: req.user!._id }).lean();
    filter.studentId = st ? String(st._id) : 'none';
  } else {
    const schoolId = await getAllowedSchoolId(req);
    if (schoolId) filter.schoolId = schoolId;
  }
  const items = await db.Payments.find(filter).sort({ createdAt: -1 }).lean();
  return res.json({ items });
});

router.post('/payments', requireAuth, requireRoles(UserRole.SCHOOL_OWNER, UserRole.SUPER_ADMIN), requireOperationalSchoolAccess, async (req: AuthedRequest, res) => {
  const db = getDb();
  const schoolId = await getAllowedSchoolId(req);
  const { studentId, feeStructureId, amountPaid, amountDue = 0, paymentDate, paymentMethod = 'CHALLAN', status = 'PAID' } = req.body || {};
  if (!studentId || !feeStructureId || amountPaid === undefined) {
    return res.status(400).json({ error: 'Student, fee structure, and amountPaid are required' });
  }
  const receiptNumber = `RCPT-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const item = await db.Payments.create({
    schoolId,
    studentId,
    feeStructureId,
    receiptNumber,
    amountPaid: Number(amountPaid),
    amountDue: Number(amountDue) || 0,
    paymentDate: paymentDate || new Date().toISOString().slice(0, 10),
    paymentMethod,
    status,
    recordedBy: req.user!._id,
  });
  return res.status(201).json({ item });
});

// ==========================================
// TIMETABLES (with conflict detection!)
// ==========================================
router.get('/timetables', requireAuth, async (req: AuthedRequest, res) => {
  const db = getDb();
  const filter: Record<string, any> = {};
  if (req.user!.role === UserRole.STUDENT) {
    const st: any = await db.Students.findOne({ userId: req.user!._id }).lean();
    if (!st) return res.json({ items: [] });
    filter.classId = String(st.classId);
  } else if (req.user!.role === UserRole.PARENT) {
    const links: any[] = await db.ParentStudentRelationships.find({ parentId: req.user!._id, status: 'APPROVED' }).lean();
    const studentIds = links.map((l) => String(l.studentId));
    const students: any[] = studentIds.length ? await db.Students.find({ _id: { $in: studentIds } }).lean() : [];
    const classIds = students.map((s) => String(s.classId));
    filter.classId = { $in: classIds.length ? classIds : ['none'] };
  } else {
    const schoolId = await getAllowedSchoolId(req);
    if (schoolId) filter.schoolId = schoolId;
  }
  const items = await db.Timetables.find(filter).sort({ dayOfWeek: 1, startTime: 1 }).lean();
  return res.json({ items });
});

router.post('/timetables', requireAuth, requireRoles(UserRole.SCHOOL_OWNER, UserRole.SUPER_ADMIN), requireOperationalSchoolAccess, async (req: AuthedRequest, res) => {
  const db = getDb();
  const schoolId = await getAllowedSchoolId(req);
  const { classId, sectionId = null, subjectId, teacherId, dayOfWeek, startTime, endTime, classroom } = req.body || {};
  if (!classId || !subjectId || !teacherId || !dayOfWeek || !startTime || !endTime || !classroom) {
    return res.status(400).json({ error: 'All timetable fields are required' });
  }

  // Conflict detection: same day + overlapping time for teacher OR classroom
  const sameDaySlots: any[] = await db.Timetables.find({ schoolId, dayOfWeek }).lean();
  for (const slot of sameDaySlots) {
    const overlaps = startTime < slot.endTime && endTime > slot.startTime;
    if (overlaps) {
      if (String(slot.teacherId) === String(teacherId)) {
        return res.status(409).json({ error: `Schedule conflict: Teacher already assigned ${slot.startTime}–${slot.endTime} on ${dayOfWeek}.` });
      }
      if (String(slot.classroom).toLowerCase() === String(classroom).toLowerCase()) {
        return res.status(409).json({ error: `Schedule conflict: Classroom "${classroom}" is already booked ${slot.startTime}–${slot.endTime} on ${dayOfWeek}.` });
      }
    }
  }

  const item = await db.Timetables.create({
    schoolId,
    classId,
    sectionId: sectionId || null,
    subjectId,
    teacherId,
    dayOfWeek,
    startTime,
    endTime,
    classroom,
  });
  return res.status(201).json({ item });
});

router.delete('/timetables/:id', requireAuth, requireRoles(UserRole.SCHOOL_OWNER, UserRole.SUPER_ADMIN), requireOperationalSchoolAccess, async (req: AuthedRequest, res) => {
  const db = getDb();
  await db.Timetables.findByIdAndDelete(req.params.id);
  return res.json({ deleted: true });
});

// ==========================================
// ANNOUNCEMENTS
// ==========================================
router.get('/announcements', requireAuth, async (req: AuthedRequest, res) => {
  const db = getDb();
  const filter: Record<string, any> = {};
  if (req.user!.role === UserRole.PARENT) {
    const links: any[] = await db.ParentStudentRelationships.find({ parentId: req.user!._id, status: 'APPROVED' }).lean();
    const schoolIds = Array.from(new Set(links.map((l) => String(l.schoolId))));
    filter.schoolId = { $in: schoolIds.length ? schoolIds : ['none'] };
    filter.audience = { $in: ['PUBLIC', 'PARENTS', 'ALL'] };
  } else if (req.user!.role === UserRole.STUDENT) {
    filter.schoolId = req.user!.schoolId || 'none';
    filter.audience = { $in: ['PUBLIC', 'STUDENTS', 'ALL'] };
  } else {
    const schoolId = await getAllowedSchoolId(req);
    if (schoolId) filter.schoolId = schoolId;
  }
  const items = await db.Announcements.find(filter).sort({ createdAt: -1 }).lean();
  return res.json({ items });
});

router.post('/announcements', requireAuth, requireRoles(UserRole.SCHOOL_OWNER, UserRole.SUPER_ADMIN), requireOperationalSchoolAccess, async (req: AuthedRequest, res) => {
  const db = getDb();
  const schoolId = await getAllowedSchoolId(req);
  const { title, content, audience = 'ALL', isPinned = false } = req.body || {};
  if (!title || !content) return res.status(400).json({ error: 'Announcement title and content are required' });
  const item = await db.Announcements.create({ schoolId, title, content, audience, isPinned, createdBy: req.user!._id });
  return res.status(201).json({ item });
});

export default router;
