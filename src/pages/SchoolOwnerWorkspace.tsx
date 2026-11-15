import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Building,
  GraduationCap,
  Users,
  BookOpen,
  Layers,
  BookMarked,
  CalendarCheck,
  FileSpreadsheet,
  Award,
  CreditCard,
  Clock,
  Megaphone,
  UserCheck,
  MessageSquareWarning,
  Mail,
  Settings,
  Wrench,
  Lock,
  Upload,
} from 'lucide-react';
import { apiFetch, useAuth } from '../context/AuthContext';
import { NavItem, PortalShell } from '../components/layout/PortalShell';
import {
  EmptyState,
  OwnershipBadge,
  StatusBadge,
  VerificationBadge,
} from '../components/ui/Badges';
import { FileUploadField, UploadedDocItem } from '../components/ui/ThemeAndUpload';
import { RegistrationStatus, VerificationStatus } from '../../server/types';

export function SchoolOwnerWorkspace() {
  const { schools, activeSchoolId, applications, refreshMe } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const activeSchool = schools.find((s) => s._id === activeSchoolId) || schools[0] || null;
  const activeApp = applications.find((a) => String(a.schoolId) === String(activeSchool?._id)) || applications[0] || null;

  const isApproved = activeSchool?.registrationStatus === RegistrationStatus.APPROVED;
  const isSuspended = activeSchool?.verificationStatus === VerificationStatus.SUSPENDED;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, section: 'Overview' },
    { id: 'profile', label: 'School Profile', icon: <Building className="w-4 h-4" />, section: 'Overview' },
    { id: 'students', label: 'Students', icon: <GraduationCap className="w-4 h-4" />, section: 'Academics' },
    { id: 'teachers', label: 'Teachers', icon: <Users className="w-4 h-4" />, section: 'Academics' },
    { id: 'classes', label: 'Classes', icon: <BookOpen className="w-4 h-4" />, section: 'Academics' },
    { id: 'sections', label: 'Sections', icon: <Layers className="w-4 h-4" />, section: 'Academics' },
    { id: 'subjects', label: 'Subjects', icon: <BookMarked className="w-4 h-4" />, section: 'Academics' },
    { id: 'attendance', label: 'Attendance', icon: <CalendarCheck className="w-4 h-4" />, section: 'Operations' },
    { id: 'examinations', label: 'Examinations', icon: <FileSpreadsheet className="w-4 h-4" />, section: 'Operations' },
    { id: 'results', label: 'Results', icon: <Award className="w-4 h-4" />, section: 'Operations' },
    { id: 'fees', label: 'Fees', icon: <CreditCard className="w-4 h-4" />, section: 'Operations' },
    { id: 'timetable', label: 'Timetable', icon: <Clock className="w-4 h-4" />, section: 'Operations' },
    { id: 'announcements', label: 'Announcements', icon: <Megaphone className="w-4 h-4" />, section: 'Community & Oversight' },
    { id: 'parent_requests', label: 'Parent Requests', icon: <UserCheck className="w-4 h-4" />, section: 'Community & Oversight' },
    { id: 'complaints', label: 'Complaints', icon: <MessageSquareWarning className="w-4 h-4" />, section: 'Community & Oversight' },
    { id: 'corrective_actions', label: 'Corrective Actions', icon: <Wrench className="w-4 h-4" />, section: 'Community & Oversight' },
    { id: 'messages', label: 'Admin Messages', icon: <Mail className="w-4 h-4" />, section: 'School Admin' },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" />, section: 'School Admin' },
  ];

  const [resubmitDocs, setResubmitDocs] = useState<UploadedDocItem[]>([]);
  const [resubmitComment, setResubmitComment] = useState('');
  const [resubmitMsg, setResubmitMsg] = useState('');

  const handleResubmit = async () => {
    if (!activeApp) return;
    const res = await apiFetch(`/api/v1/school-applications/${activeApp._id}/resubmit`, {
      method: 'PUT',
      body: JSON.stringify({ comment: resubmitComment, documents: resubmitDocs }),
    });
    setResubmitMsg(res.message);
    setResubmitDocs([]);
    setResubmitComment('');
    refreshMe();
  };

  // Pre-approval Registration Progress Tracker (Operational Dashboard Locked)
  if (!activeSchool || !isApproved) {
    return (
      <PortalShell
        navItems={[{ id: 'tracker', label: 'Registration Tracker', icon: <LayoutDashboard className="w-4 h-4" /> }]}
        activeTab="tracker"
        onSelectTab={() => {}}
        title="School Registration Status Tracker"
        subtitle={activeSchool ? `${activeSchool.name} · ${activeSchool.schoolType}` : 'Pending Review'}
      >
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-5 text-xs">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {activeSchool && <OwnershipBadge schoolType={activeSchool.schoolType} />}
                <StatusBadge status={activeSchool?.registrationStatus || 'PENDING'} />
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                {activeSchool?.name || 'School Application'}
              </h2>
              <p className="text-slate-500 mt-0.5">Reg #: <span className="font-mono">{activeSchool?.registrationNumber}</span></p>
            </div>
            <Lock className="w-6 h-6 text-amber-600 shrink-0" />
          </div>

          <div className="p-4 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
            Operational school dashboard modules (students, teachers, attendance, examinations, and fees) remain locked until the Education Department approves your school registration.
          </div>

          {activeApp?.adminRemarks && (
            <div className="p-4 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="font-semibold">Education Department Remarks:</div>
              <p className="mt-1">{activeApp.adminRemarks}</p>
            </div>
          )}

          {activeApp && ['DRAFT', 'MORE_INFORMATION_REQUIRED'].includes(activeApp.status) && (
            <div className="p-4 rounded-md border border-blue-200 dark:border-blue-800 space-y-3">
              <div className="font-semibold text-sm flex items-center gap-1.5"><Upload className="w-4 h-4" /> Submit Additional Information / Resubmit</div>
              {resubmitMsg && <div className="p-2 rounded bg-emerald-50 text-emerald-700">{resubmitMsg}</div>}
              <FileUploadField label="Supporting Document" onUploaded={(d) => setResubmitDocs((p) => [...p, d])} />
              <textarea rows={2} value={resubmitComment} onChange={(e) => setResubmitComment(e.target.value)} placeholder="Describe updates or attached documents..." className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              <button type="button" onClick={handleResubmit} className="px-4 py-2 rounded bg-blue-700 text-white font-semibold">
                Resubmit to Education Department
              </button>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Application Progress History</h3>
            {(activeApp?.history || []).map((h: any, idx: number) => (
              <div key={idx} className="p-3 rounded bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-3">
                <div>
                  <span className="font-semibold">{h.status}</span> — {h.comment}
                </div>
                <span className="text-slate-400 tabular-nums shrink-0">{new Date(h.timestamp).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell
      navItems={navItems}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      title={activeSchool.name}
      subtitle={`${activeSchool.schoolCategory} · ${activeSchool.district}, ${activeSchool.province}`}
      headerActions={
        <div className="hidden sm:flex items-center gap-2">
          <OwnershipBadge schoolType={activeSchool.schoolType} />
          <VerificationBadge status={activeSchool.verificationStatus} />
        </div>
      }
    >
      {isSuspended && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200">
          <strong>School Suspended:</strong> {activeSchool.suspensionReason || 'Operational academic modules are restricted until Corrective Actions are verified by the Education Department. You may still view Complaints, Corrective Actions, and Admin Messages.'}
        </div>
      )}

      <SchoolModulesRouter
        school={activeSchool}
        activeTab={activeTab}
        isSuspended={isSuspended}
        onRefreshSchool={refreshMe}
        onSelectTab={setActiveTab}
      />
    </PortalShell>
  );
}

function SchoolModulesRouter({
  school,
  activeTab,
  isSuspended,
  onRefreshSchool,
  onSelectTab,
}: {
  school: any;
  activeTab: string;
  isSuspended: boolean;
  onRefreshSchool: () => void;
  onSelectTab: (tab: string) => void;
}) {
  const sid = school._id;
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [attSummary, setAttSummary] = useState<any>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [timetables, setTimetables] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [parentReqs, setParentReqs] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [correctiveActions, setCorrectiveActions] = useState<any[]>([]);
  const [convs, setConvs] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Form states
  const [newClass, setNewClass] = useState({ name: '', gradeLevel: 'Secondary', capacity: 40 });
  const [newSection, setNewSection] = useState({ classId: '', name: '', roomNumber: '', capacity: 40 });
  const [newSubject, setNewSubject] = useState({ name: '', code: '', classId: '', teacherId: '' });
  const [newTeacher, setNewTeacher] = useState({ fullName: '', email: '', phone: '', employeeCode: '', qualification: '', subjects: '' });
  const [newStudent, setNewStudent] = useState({ fullName: '', admissionNumber: '', rollNumber: '', classId: '', sectionId: '', gender: 'Male', guardianName: '', guardianPhone: '' });
  const [csvImport, setCsvImport] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [attStatusMap, setAttStatusMap] = useState<Record<string, string>>({});
  const [newExam, setNewExam] = useState({ title: '', term: 'Annual', classId: '', startDate: '2026-11-20', endDate: '2026-11-30' });
  const [newResult, setNewResult] = useState({ examinationId: '', studentId: '', classId: '', subjectName: 'Mathematics', obtainedMarks: 80, maxMarks: 100 });
  const [newFee, setNewFee] = useState({ title: '', classId: '', amount: 5000, frequency: 'MONTHLY', dueDate: '2026-12-05' });
  const [newPayment, setNewPayment] = useState({ studentId: '', feeStructureId: '', amountPaid: 5000, paymentMethod: 'CHALLAN' });
  const [newSlot, setNewSlot] = useState({ classId: '', subjectId: '', teacherId: '', dayOfWeek: 'Monday', startTime: '08:30', endTime: '09:15', classroom: 'Room 101' });
  const [newAnn, setNewAnn] = useState({ title: '', content: '', audience: 'ALL' });
  const [cmpResp, setCmpResp] = useState<Record<string, string>>({});
  const [caEvidence, setCaEvidence] = useState<Record<string, string>>({});
  const [profileForm, setProfileForm] = useState({ overview: school.overview || '', website: school.website || '', contactNumber: school.contactNumber || '', officialEmail: school.officialEmail || '' });
  const [ownershipReq, setOwnershipReq] = useState({ requestedSchoolType: school.schoolType === 'GOVERNMENT' ? 'PRIVATE' : 'GOVERNMENT', justification: '' });
  const [activeConv, setActiveConv] = useState<any>(null);
  const [convMsgs, setConvMsgs] = useState<any[]>([]);
  const [replyBody, setReplyBody] = useState('');

  const loadAll = async () => {
    setErrorMsg('');
    try {
      const [cRes, secRes, subRes, tRes, stRes, attRes, exRes, rRes, fRes, pRes, ttRes, aRes, prRes, cmpRes, caRes, msgRes] = await Promise.all([
        apiFetch(`/api/v1/classes?schoolId=${sid}`),
        apiFetch(`/api/v1/sections?schoolId=${sid}`),
        apiFetch(`/api/v1/subjects?schoolId=${sid}`),
        isSuspended ? Promise.resolve({ items: [] }) : apiFetch(`/api/v1/teachers?schoolId=${sid}`),
        isSuspended ? Promise.resolve({ items: [] }) : apiFetch(`/api/v1/students?schoolId=${sid}`),
        apiFetch(`/api/v1/attendance?schoolId=${sid}`),
        apiFetch(`/api/v1/examinations?schoolId=${sid}`),
        apiFetch(`/api/v1/results?schoolId=${sid}`),
        apiFetch(`/api/v1/fees?schoolId=${sid}`),
        apiFetch(`/api/v1/payments?schoolId=${sid}`),
        apiFetch(`/api/v1/timetables?schoolId=${sid}`),
        apiFetch(`/api/v1/announcements?schoolId=${sid}`),
        apiFetch(`/api/v1/parent-student?schoolId=${sid}`),
        apiFetch(`/api/v1/complaints`),
        apiFetch(`/api/v1/corrective-actions`),
        apiFetch(`/api/v1/messages/conversations`),
      ]);
      setClasses(cRes.items || []);
      setSections(secRes.items || []);
      setSubjects(subRes.items || []);
      setTeachers(tRes.items || []);
      setStudents(stRes.items || []);
      setAttendance(attRes.items || []);
      setAttSummary(attRes.summary || null);
      setExams(exRes.items || []);
      setResults(rRes.items || []);
      setFees(fRes.items || []);
      setPayments(pRes.items || []);
      setTimetables(ttRes.items || []);
      setAnnouncements(aRes.items || []);
      setParentReqs(prRes.items || []);
      setComplaints(cmpRes.items || []);
      setCorrectiveActions(caRes.items || []);
      setConvs(msgRes.items || []);

      if (cRes.items?.length) {
        const firstC = cRes.items[0]._id;
        setNewSection((s) => ({ ...s, classId: s.classId || firstC }));
        setNewSubject((s) => ({ ...s, classId: s.classId || firstC }));
        setNewStudent((s) => ({ ...s, classId: s.classId || firstC }));
        setNewExam((s) => ({ ...s, classId: s.classId || firstC }));
        setNewResult((s) => ({ ...s, classId: s.classId || firstC }));
        setNewSlot((s) => ({ ...s, classId: s.classId || firstC }));
      }
      if (tRes.items?.length) setNewSlot((s) => ({ ...s, teacherId: s.teacherId || tRes.items[0]._id }));
      if (subRes.items?.length) setNewSlot((s) => ({ ...s, subjectId: s.subjectId || subRes.items[0]._id }));
      if (exRes.items?.length) setNewResult((s) => ({ ...s, examinationId: s.examinationId || exRes.items[0]._id }));
      if (stRes.items?.length) {
        setNewResult((s) => ({ ...s, studentId: s.studentId || stRes.items[0]._id }));
        setNewPayment((s) => ({ ...s, studentId: s.studentId || stRes.items[0]._id }));
      }
      if (fRes.items?.length) setNewPayment((s) => ({ ...s, feeStructureId: s.feeStructureId || fRes.items[0]._id }));
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  useEffect(() => {
    loadAll();
  }, [sid]);

  const runAction = async (fn: () => Promise<any>, successText: string) => {
    setErrorMsg('');
    setInfoMsg('');
    try {
      await fn();
      setInfoMsg(successText);
      await loadAll();
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const classMap = new Map(classes.map((c) => [c._id, c.name]));
  const studentMap = new Map(students.map((s) => [s._id, s.fullName]));
  const teacherMap = new Map(teachers.map((t) => [t._id, t.fullName]));
  const subjectMap = new Map(subjects.map((s) => [s._id, s.name]));

  return (
    <div className="space-y-5 text-xs">
      {errorMsg && <div className="p-3 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">{errorMsg}</div>}
      {infoMsg && <div className="p-3 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">{infoMsg}</div>}

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
              <div className="text-xs text-slate-500">Enrolled Students</div>
              <div className="font-mono text-2xl font-bold tabular-nums mt-1.5">{students.length}</div>
              <div className="text-[11px] text-slate-500 mt-1 tabular-nums">{classes.length} classes · {sections.length} sections</div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
              <div className="text-xs text-slate-500">Teaching Staff</div>
              <div className="font-mono text-2xl font-bold tabular-nums mt-1.5">{teachers.length}</div>
              <div className="text-[11px] text-slate-500 mt-1 tabular-nums">{subjects.length} subjects configured</div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
              <div className="text-xs text-slate-500">Attendance Rate</div>
              <div className="font-mono text-2xl font-bold tabular-nums mt-1.5">{attSummary?.percentage ?? 0}%</div>
              <div className="text-[11px] text-slate-500 mt-1 tabular-nums">{attendance.length} attendance entries</div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
              <div className="text-xs text-slate-500">Oversight & Requests</div>
              <div className="font-mono text-2xl font-bold tabular-nums mt-1.5">{complaints.length + correctiveActions.length}</div>
              <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
                Complaints: {complaints.length} · Corrective: {correctiveActions.length}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-display text-sm font-bold">Institution Summary</h3>
                <div className="flex items-center gap-2">
                  <OwnershipBadge schoolType={school.schoolType} />
                  <VerificationBadge status={school.verificationStatus} />
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-slate-500">Registration #</dt>
                  <dd className="font-mono font-semibold mt-0.5">{school.registrationNumber}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">District & Province</dt>
                  <dd className="font-medium mt-0.5">{school.district}, {school.province}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Pending Parent Requests</dt>
                  <dd className="font-mono font-semibold mt-0.5">{parentReqs.filter((r) => r.status === 'PENDING').length}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Fee Structures / Exams</dt>
                  <dd className="font-mono font-semibold mt-0.5">{fees.length} / {exams.length}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => onSelectTab('students')} className="px-3 py-1.5 rounded bg-blue-700 text-white font-medium">Manage Students</button>
                <button type="button" onClick={() => onSelectTab('attendance')} className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 font-medium">Mark Attendance</button>
                <button type="button" onClick={() => onSelectTab('complaints')} className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 font-medium">View Complaints</button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-display text-sm font-bold">Recent Announcements</h3>
                <button type="button" onClick={() => onSelectTab('announcements')} className="text-xs text-blue-700 dark:text-blue-400 hover:underline">Manage →</button>
              </div>
              {announcements.length === 0 ? (
                <EmptyState title="No announcements published" description="Publish school notices for parents, students, and teachers from the Announcements tab." />
              ) : (
                <div className="space-y-2">
                  {announcements.slice(0, 3).map((a) => (
                    <div key={a._id} className="p-3 rounded bg-slate-50 dark:bg-slate-800/70">
                      <div className="font-semibold text-slate-900 dark:text-white">{a.title}</div>
                      <div className="text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{a.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
            <h3 className="font-display text-sm font-bold">Public School Profile</h3>
            <textarea rows={3} value={profileForm.overview} onChange={(e) => setProfileForm({ ...profileForm, overview: e.target.value })} className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" placeholder="School Overview" />
            <input value={profileForm.contactNumber} onChange={(e) => setProfileForm({ ...profileForm, contactNumber: e.target.value })} className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" placeholder="Contact Number" />
            <input value={profileForm.officialEmail} onChange={(e) => setProfileForm({ ...profileForm, officialEmail: e.target.value })} className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" placeholder="Official Email" />
            <input value={profileForm.website} onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })} className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" placeholder="Website" />
            <button type="button" onClick={() => runAction(async () => { await apiFetch(`/api/v1/schools/${sid}/profile`, { method: 'PATCH', body: JSON.stringify(profileForm) }); onRefreshSchool(); }, 'School profile updated.')} className="px-4 py-2 rounded bg-blue-700 text-white font-semibold">
              Save Profile
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
            <h3 className="font-display text-sm font-bold">Ownership Classification Lock</h3>
            <p className="text-slate-600 dark:text-slate-300">
              Current Ownership: <strong>{school.schoolType}</strong>. Schools cannot alter ownership classification directly after approval; any change requires formal administrative review and an audit log entry.
            </p>
            <select value={ownershipReq.requestedSchoolType} onChange={(e) => setOwnershipReq({ ...ownershipReq, requestedSchoolType: e.target.value })} className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
              <option value="GOVERNMENT">GOVERNMENT</option>
              <option value="PRIVATE">PRIVATE</option>
            </select>
            <textarea rows={2} value={ownershipReq.justification} onChange={(e) => setOwnershipReq({ ...ownershipReq, justification: e.target.value })} placeholder="Official justification for ownership review..." className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            <button type="button" onClick={() => runAction(() => apiFetch(`/api/v1/schools/${sid}/ownership-change-request`, { method: 'POST', body: JSON.stringify(ownershipReq) }), 'Administrative ownership review request logged.')} className="px-4 py-2 rounded border border-slate-300 dark:border-slate-700 font-semibold">
              Request Administrative Review
            </button>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <form onSubmit={(e) => { e.preventDefault(); runAction(() => apiFetch('/api/v1/students', { method: 'POST', body: JSON.stringify({ ...newStudent, schoolId: sid }) }), 'Student enrolled.'); }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-sm">Enroll Student</h3>
              <div className="grid grid-cols-2 gap-2">
                <input required placeholder="Full Name" value={newStudent.fullName} onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
                <input required placeholder="Admission #" value={newStudent.admissionNumber} onChange={(e) => setNewStudent({ ...newStudent, admissionNumber: e.target.value })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
                <input placeholder="Roll #" value={newStudent.rollNumber} onChange={(e) => setNewStudent({ ...newStudent, rollNumber: e.target.value })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
                <select value={newStudent.classId} onChange={(e) => setNewStudent({ ...newStudent, classId: e.target.value })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                  {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                <input placeholder="Guardian Name" value={newStudent.guardianName} onChange={(e) => setNewStudent({ ...newStudent, guardianName: e.target.value })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
                <select value={newStudent.gender} onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                  <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                </select>
              </div>
              <button type="submit" className="px-4 py-1.5 rounded bg-blue-700 text-white font-semibold">Add Student</button>
            </form>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-sm">Bulk CSV Import</h3>
              <p className="text-slate-500">Format: fullName, admissionNumber, rollNumber, gender, guardianName, guardianPhone</p>
              <textarea rows={3} value={csvImport} onChange={(e) => setCsvImport(e.target.value)} placeholder="Ali Hassan, ADM-2026-099, 10-09, Male, Tariq, 03001234567" className="w-full px-2.5 py-1.5 font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              <button type="button" onClick={() => runAction(() => apiFetch('/api/v1/students/bulk-import', { method: 'POST', body: JSON.stringify({ schoolId: sid, csvText: csvImport, defaultClassId: newStudent.classId }) }), 'Bulk CSV students imported.')} className="px-4 py-1.5 rounded bg-slate-900 dark:bg-slate-700 text-white font-semibold">
                Import CSV
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <tr><th className="px-4 py-2.5">Admission #</th><th className="px-4 py-2.5">Name</th><th className="px-4 py-2.5">Class</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5 text-right">Lifecycle</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map((st) => (
                  <tr key={st._id}>
                    <td className="px-4 py-2.5 font-mono">{st.admissionNumber}</td>
                    <td className="px-4 py-2.5 font-semibold">{st.fullName}</td>
                    <td className="px-4 py-2.5">{classMap.get(st.classId) || '—'}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={st.academicStatus} /></td>
                    <td className="px-4 py-2.5 text-right space-x-1">
                      <button type="button" onClick={() => runAction(() => apiFetch(`/api/v1/students/${st._id}/action`, { method: 'POST', body: JSON.stringify({ schoolId: sid, action: 'TRANSFER' }) }), 'Student transferred.')} className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700">Transfer</button>
                      <button type="button" onClick={() => runAction(() => apiFetch(`/api/v1/students/${st._id}/action`, { method: 'POST', body: JSON.stringify({ schoolId: sid, action: 'ARCHIVE' }) }), 'Student archived.')} className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700">Archive</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'teachers' && (
        <div className="space-y-4">
          <form onSubmit={(e) => { e.preventDefault(); runAction(() => apiFetch('/api/v1/teachers', { method: 'POST', body: JSON.stringify({ ...newTeacher, schoolId: sid }) }), 'Teacher added.'); }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-6 gap-2">
            <input required placeholder="Teacher Name" value={newTeacher.fullName} onChange={(e) => setNewTeacher({ ...newTeacher, fullName: e.target.value })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            <input required type="email" placeholder="Email" value={newTeacher.email} onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            <input required placeholder="Employee Code" value={newTeacher.employeeCode} onChange={(e) => setNewTeacher({ ...newTeacher, employeeCode: e.target.value })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            <input placeholder="Qualification" value={newTeacher.qualification} onChange={(e) => setNewTeacher({ ...newTeacher, qualification: e.target.value })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            <input placeholder="Subjects (comma sep)" value={newTeacher.subjects} onChange={(e) => setNewTeacher({ ...newTeacher, subjects: e.target.value })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            <button type="submit" className="px-3 py-1.5 rounded bg-blue-700 text-white font-semibold">Add Teacher</button>
          </form>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800"><tr><th className="px-4 py-2.5">Code</th><th className="px-4 py-2.5">Name</th><th className="px-4 py-2.5">Qualification</th><th className="px-4 py-2.5">Subjects</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {teachers.map((t) => (
                  <tr key={t._id}><td className="px-4 py-2.5 font-mono">{t.employeeCode}</td><td className="px-4 py-2.5 font-semibold">{t.fullName}</td><td className="px-4 py-2.5">{t.qualification}</td><td className="px-4 py-2.5">{(t.subjects || []).join(', ')}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(activeTab === 'classes' || activeTab === 'sections' || activeTab === 'subjects') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Classes ({classes.length})</h3>
            <form onSubmit={(e) => { e.preventDefault(); runAction(() => apiFetch('/api/v1/classes', { method: 'POST', body: JSON.stringify({ ...newClass, schoolId: sid }) }), 'Class created.'); }} className="space-y-2">
              <input required placeholder="Class Name (e.g. Grade 10)" value={newClass.name} onChange={(e) => setNewClass({ ...newClass, name: e.target.value })} className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              <input required placeholder="Level (e.g. Secondary)" value={newClass.gradeLevel} onChange={(e) => setNewClass({ ...newClass, gradeLevel: e.target.value })} className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              <button type="submit" className="w-full py-1.5 rounded bg-blue-700 text-white font-semibold">Add Class</button>
            </form>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">{classes.map((c) => <div key={c._id} className="py-1.5 flex justify-between"><span>{c.name}</span><span className="text-slate-400">{c.gradeLevel}</span></div>)}</div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Sections ({sections.length})</h3>
            <form onSubmit={(e) => { e.preventDefault(); runAction(() => apiFetch('/api/v1/sections', { method: 'POST', body: JSON.stringify({ ...newSection, schoolId: sid }) }), 'Section created.'); }} className="space-y-2">
              <select value={newSection.classId} onChange={(e) => setNewSection({ ...newSection, classId: e.target.value })} className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">{classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
              <input required placeholder="Section Name (e.g. Section B)" value={newSection.name} onChange={(e) => setNewSection({ ...newSection, name: e.target.value })} className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              <input placeholder="Room Number" value={newSection.roomNumber} onChange={(e) => setNewSection({ ...newSection, roomNumber: e.target.value })} className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              <button type="submit" className="w-full py-1.5 rounded bg-blue-700 text-white font-semibold">Add Section</button>
            </form>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">{sections.map((s) => <div key={s._id} className="py-1.5 flex justify-between"><span>{classMap.get(s.classId)} — {s.name}</span><span className="text-slate-400">{s.roomNumber}</span></div>)}</div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Subjects ({subjects.length})</h3>
            <form onSubmit={(e) => { e.preventDefault(); runAction(() => apiFetch('/api/v1/subjects', { method: 'POST', body: JSON.stringify({ ...newSubject, schoolId: sid }) }), 'Subject created.'); }} className="space-y-2">
              <input required placeholder="Subject Name" value={newSubject.name} onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })} className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              <input required placeholder="Code (e.g. PHY-10)" value={newSubject.code} onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })} className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              <button type="submit" className="w-full py-1.5 rounded bg-blue-700 text-white font-semibold">Add Subject</button>
            </form>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">{subjects.map((sub) => <div key={sub._id} className="py-1.5 flex justify-between"><span>{sub.name}</span><span className="font-mono text-slate-400">{sub.code}</span></div>)}</div>
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-sm">Daily Attendance Marking (Overall Rate: {attSummary?.percentage ?? 0}%)</h3>
              <p className="text-slate-500">Marking ABSENT or LATE automatically sends a parent alert.</p>
            </div>
            <input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {students.map((st) => (
              <div key={st._id} className="py-2 flex items-center justify-between gap-3">
                <div><span className="font-semibold">{st.fullName}</span> <span className="font-mono text-slate-400">({st.admissionNumber})</span></div>
                <select
                  value={attStatusMap[st._id] || 'PRESENT'}
                  onChange={(e) => setAttStatusMap({ ...attStatusMap, [st._id]: e.target.value })}
                  className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="PRESENT">PRESENT</option><option value="ABSENT">ABSENT</option><option value="LATE">LATE</option><option value="EXCUSED">EXCUSED</option>
                </select>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => runAction(() => apiFetch('/api/v1/attendance/mark', { method: 'POST', body: JSON.stringify({ schoolId: sid, targetType: 'STUDENT', date: attDate, entries: students.map((st) => ({ studentId: st._id, classId: st.classId, status: attStatusMap[st._id] || 'PRESENT' })) }) }), 'Daily attendance saved & parent alerts dispatched.')}
            className="px-4 py-2 rounded bg-blue-700 text-white font-semibold"
          >
            Save Student Attendance
          </button>
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <h4 className="font-semibold mb-2">Recent Attendance Log ({attendance.length} records)</h4>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {attendance.slice(0, 15).map((a) => (
                <div key={a._id} className="flex justify-between py-1">
                  <span>{a.date} · {a.targetType === 'STUDENT' ? studentMap.get(a.studentId) || 'Student' : teacherMap.get(a.teacherId) || 'Teacher'}</span>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(activeTab === 'examinations' || activeTab === 'results') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Examinations</h3>
            <form onSubmit={(e) => { e.preventDefault(); runAction(() => apiFetch('/api/v1/examinations', { method: 'POST', body: JSON.stringify({ ...newExam, schoolId: sid }) }), 'Examination created.'); }} className="space-y-2">
              <input required placeholder="Exam Title" value={newExam.title} onChange={(e) => setNewExam({ ...newExam, title: e.target.value })} className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              <div className="grid grid-cols-3 gap-2">
                <select value={newExam.classId} onChange={(e) => setNewExam({ ...newExam, classId: e.target.value })} className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">{classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
                <input type="date" value={newExam.startDate} onChange={(e) => setNewExam({ ...newExam, startDate: e.target.value })} className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
                <input type="date" value={newExam.endDate} onChange={(e) => setNewExam({ ...newExam, endDate: e.target.value })} className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              </div>
              <button type="submit" className="px-4 py-1.5 rounded bg-blue-700 text-white font-semibold">Create Exam</button>
            </form>
            {exams.map((ex) => <div key={ex._id} className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 flex justify-between"><span className="font-semibold">{ex.title}</span><span className="tabular-nums">{ex.startDate}</span></div>)}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Enter & Publish Marks</h3>
            <form onSubmit={(e) => { e.preventDefault(); runAction(() => apiFetch('/api/v1/results', { method: 'POST', body: JSON.stringify({ schoolId: sid, examinationId: newResult.examinationId, studentId: newResult.studentId, classId: newResult.classId, marks: [{ subjectName: newResult.subjectName, obtainedMarks: newResult.obtainedMarks, maxMarks: newResult.maxMarks }], isPublished: true }) }), 'Result published with calculated grade.'); }} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <select value={newResult.examinationId} onChange={(e) => setNewResult({ ...newResult, examinationId: e.target.value })} className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">{exams.map((ex) => <option key={ex._id} value={ex._id}>{ex.title}</option>)}</select>
                <select value={newResult.studentId} onChange={(e) => setNewResult({ ...newResult, studentId: e.target.value })} className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">{students.map((st) => <option key={st._id} value={st._id}>{st.fullName}</option>)}</select>
                <input value={newResult.subjectName} onChange={(e) => setNewResult({ ...newResult, subjectName: e.target.value })} placeholder="Subject" className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
                <input type="number" value={newResult.obtainedMarks} onChange={(e) => setNewResult({ ...newResult, obtainedMarks: Number(e.target.value) })} placeholder="Obtained" className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              </div>
              <button type="submit" className="px-4 py-1.5 rounded bg-blue-700 text-white font-semibold">Publish Result</button>
            </form>
            {results.map((r) => (
              <div key={r._id} className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
                <div><span className="font-semibold">{studentMap.get(r.studentId) || 'Student'}</span> · {r.percentage}% (Grade {r.overallGrade})</div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'fees' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Fee Structures</h3>
            <form onSubmit={(e) => { e.preventDefault(); runAction(() => apiFetch('/api/v1/fees', { method: 'POST', body: JSON.stringify({ ...newFee, schoolId: sid }) }), 'Fee structure created.'); }} className="space-y-2">
              <input required placeholder="Fee Title" value={newFee.title} onChange={(e) => setNewFee({ ...newFee, title: e.target.value })} className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" required value={newFee.amount} onChange={(e) => setNewFee({ ...newFee, amount: Number(e.target.value) })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
                <select value={newFee.frequency} onChange={(e) => setNewFee({ ...newFee, frequency: e.target.value })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                  <option value="MONTHLY">MONTHLY</option><option value="ANNUAL">ANNUAL</option><option value="ONE_TIME">ONE TIME</option>
                </select>
              </div>
              <button type="submit" className="px-4 py-1.5 rounded bg-blue-700 text-white font-semibold">Add Fee Structure</button>
            </form>
            {fees.map((f) => <div key={f._id} className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 flex justify-between"><span>{f.title} ({f.frequency})</span><span className="font-mono font-semibold tabular-nums">PKR {f.amount}</span></div>)}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Record Payment & Receipts</h3>
            <form onSubmit={(e) => { e.preventDefault(); runAction(() => apiFetch('/api/v1/payments', { method: 'POST', body: JSON.stringify({ ...newPayment, schoolId: sid }) }), 'Payment recorded & receipt generated.'); }} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <select value={newPayment.studentId} onChange={(e) => setNewPayment({ ...newPayment, studentId: e.target.value })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">{students.map((st) => <option key={st._id} value={st._id}>{st.fullName}</option>)}</select>
                <select value={newPayment.feeStructureId} onChange={(e) => setNewPayment({ ...newPayment, feeStructureId: e.target.value })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">{fees.map((f) => <option key={f._id} value={f._id}>{f.title}</option>)}</select>
                <input type="number" value={newPayment.amountPaid} onChange={(e) => setNewPayment({ ...newPayment, amountPaid: Number(e.target.value) })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
                <select value={newPayment.paymentMethod} onChange={(e) => setNewPayment({ ...newPayment, paymentMethod: e.target.value })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"><option value="CHALLAN">CHALLAN</option><option value="CASH">CASH</option><option value="BANK_TRANSFER">BANK TRANSFER</option></select>
              </div>
              <button type="submit" className="px-4 py-1.5 rounded bg-blue-700 text-white font-semibold">Record Payment</button>
            </form>
            {payments.map((p) => (
              <div key={p._id} className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
                <div><span className="font-mono font-semibold">{p.receiptNumber}</span> · {studentMap.get(p.studentId) || 'Student'}</div>
                <span className="font-mono tabular-nums">PKR {p.amountPaid}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'timetable' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
          <h3 className="font-semibold text-sm">Timetable Scheduler (With Automatic Teacher & Classroom Conflict Detection)</h3>
          <form onSubmit={(e) => { e.preventDefault(); runAction(() => apiFetch('/api/v1/timetables', { method: 'POST', body: JSON.stringify({ ...newSlot, schoolId: sid }) }), 'Timetable slot added.'); }} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            <select value={newSlot.classId} onChange={(e) => setNewSlot({ ...newSlot, classId: e.target.value })} className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">{classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
            <select value={newSlot.subjectId} onChange={(e) => setNewSlot({ ...newSlot, subjectId: e.target.value })} className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">{subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}</select>
            <select value={newSlot.teacherId} onChange={(e) => setNewSlot({ ...newSlot, teacherId: e.target.value })} className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">{teachers.map((t) => <option key={t._id} value={t._id}>{t.fullName}</option>)}</select>
            <select value={newSlot.dayOfWeek} onChange={(e) => setNewSlot({ ...newSlot, dayOfWeek: e.target.value })} className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">{['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => <option key={d} value={d}>{d}</option>)}</select>
            <input type="time" value={newSlot.startTime} onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })} className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            <input type="time" value={newSlot.endTime} onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })} className="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            <div className="flex gap-1">
              <input value={newSlot.classroom} onChange={(e) => setNewSlot({ ...newSlot, classroom: e.target.value })} placeholder="Room" className="w-20 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              <button type="submit" className="px-3 py-1.5 rounded bg-blue-700 text-white font-semibold">Add</button>
            </div>
          </form>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {timetables.map((t) => (
              <div key={t._id} className="py-2 flex justify-between">
                <span><strong>{t.dayOfWeek}</strong> {t.startTime}–{t.endTime} · {classMap.get(t.classId)} · {subjectMap.get(t.subjectId)} ({teacherMap.get(t.teacherId)})</span>
                <span className="font-mono text-slate-500">{t.classroom}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
          <form onSubmit={(e) => { e.preventDefault(); runAction(() => apiFetch('/api/v1/announcements', { method: 'POST', body: JSON.stringify({ ...newAnn, schoolId: sid }) }), 'Announcement published.'); setNewAnn({ title: '', content: '', audience: 'ALL' }); }} className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input required placeholder="Announcement Title" value={newAnn.title} onChange={(e) => setNewAnn({ ...newAnn, title: e.target.value })} className="sm:col-span-2 px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              <select value={newAnn.audience} onChange={(e) => setNewAnn({ ...newAnn, audience: e.target.value })} className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                <option value="ALL">All</option><option value="PUBLIC">Public</option><option value="PARENTS">Parents</option><option value="STUDENTS">Students</option>
              </select>
            </div>
            <textarea required rows={2} placeholder="Message..." value={newAnn.content} onChange={(e) => setNewAnn({ ...newAnn, content: e.target.value })} className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            <button type="submit" className="px-4 py-2 rounded bg-blue-700 text-white font-semibold">Publish Announcement</button>
          </form>
          <div className="space-y-2">
            {announcements.map((a) => (
              <div key={a._id} className="p-3 rounded bg-slate-50 dark:bg-slate-800">
                <div className="font-semibold">{a.title} ({a.audience})</div>
                <p className="mt-1 text-slate-600 dark:text-slate-300">{a.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'parent_requests' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
          <h3 className="font-semibold text-sm">Parent-Student Connection Requests</h3>
          {parentReqs.length === 0 ? <EmptyState title="No connection requests" description="Requests from parents to link their children will appear here." /> : parentReqs.map((r) => (
            <div key={r._id} className="p-3 rounded border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{r.parent?.fullName} → {r.student?.fullName} ({r.student?.admissionNumber})</div>
                <div className="text-slate-500">Relationship: {r.relationship}</div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={r.status} />
                {r.status === 'PENDING' && (
                  <>
                    <button type="button" onClick={() => runAction(() => apiFetch(`/api/v1/parent-student/${r._id}/review`, { method: 'POST', body: JSON.stringify({ schoolId: sid, status: 'APPROVED' }) }), 'Parent link approved.')} className="px-2.5 py-1 rounded bg-emerald-600 text-white">Approve</button>
                    <button type="button" onClick={() => runAction(() => apiFetch(`/api/v1/parent-student/${r._id}/review`, { method: 'POST', body: JSON.stringify({ schoolId: sid, status: 'REJECTED' }) }), 'Parent link rejected.')} className="px-2.5 py-1 rounded bg-red-600 text-white">Reject</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'complaints' && (
        <div className="space-y-3">
          {complaints.length === 0 ? <EmptyState title="No complaints" description="Parent complaints filed against your school appear here. Complaints cannot be deleted or edited by schools." /> : complaints.map((c) => (
            <div key={c._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center gap-2">
                <span className="font-mono font-semibold">{c.complaintNumber} — {c.title}</span>
                <StatusBadge status={c.status} />
              </div>
              <p className="text-slate-600 dark:text-slate-300">{c.description}</p>
              {c.schoolResponse && <div className="p-2.5 rounded bg-blue-50 dark:bg-blue-950/30"><strong>Your Response:</strong> {c.schoolResponse}</div>}
              <div className="flex gap-2">
                <input value={cmpResp[c._id] || ''} onChange={(e) => setCmpResp({ ...cmpResp, [c._id]: e.target.value })} placeholder="Submit official school response..." className="flex-1 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
                <button type="button" onClick={() => runAction(() => apiFetch(`/api/v1/complaints/${c._id}/school-response`, { method: 'POST', body: JSON.stringify({ response: cmpResp[c._id] }) }), 'Official response submitted.')} className="px-3.5 py-1.5 rounded bg-blue-700 text-white font-semibold">
                  Respond
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'corrective_actions' && (
        <div className="space-y-3">
          {correctiveActions.length === 0 ? <EmptyState title="No corrective actions" description="No corrective action orders issued by the Education Department." /> : correctiveActions.map((ca) => (
            <div key={ca._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center"><span className="font-semibold text-sm">{ca.identifiedIssue}</span><StatusBadge status={ca.status} /></div>
              <p>{ca.requiredCorrection}</p>
              <div className="flex gap-2">
                <input value={caEvidence[ca._id] || ''} onChange={(e) => setCaEvidence({ ...caEvidence, [ca._id]: e.target.value })} placeholder="Describe corrective evidence..." className="flex-1 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
                <button type="button" onClick={() => runAction(() => apiFetch(`/api/v1/corrective-actions/${ca._id}/submit-evidence`, { method: 'POST', body: JSON.stringify({ schoolEvidenceNotes: caEvidence[ca._id] }) }), 'Corrective action evidence submitted.')} className="px-3.5 py-1.5 rounded bg-blue-700 text-white font-semibold">Submit Evidence</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm">Admin Conversations</h3>
            {convs.map((c) => (
              <button key={c._id} type="button" onClick={async () => { setActiveConv(c); const d = await apiFetch(`/api/v1/messages/conversations/${c._id}`); setConvMsgs(d.items || []); }} className={`w-full text-left p-2.5 rounded border ${activeConv?._id === c._id ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 dark:border-slate-800'}`}>
                <div className="font-semibold">{c.subject}</div>
              </button>
            ))}
          </div>
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
            {!activeConv ? <EmptyState title="Select a thread" description="Choose an Education Department thread on the left." /> : (
              <>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {convMsgs.map((m) => <div key={m._id} className="p-2.5 rounded bg-slate-50 dark:bg-slate-800"><div className="font-semibold">{m.senderName}</div><p>{m.body}</p></div>)}
                </div>
                <div className="flex gap-2">
                  <input value={replyBody} onChange={(e) => setReplyBody(e.target.value)} placeholder="Reply to Education Department..." className="flex-1 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
                  <button type="button" onClick={async () => { await apiFetch(`/api/v1/messages/conversations/${activeConv._id}`, { method: 'POST', body: JSON.stringify({ body: replyBody }) }); setReplyBody(''); const d = await apiFetch(`/api/v1/messages/conversations/${activeConv._id}`); setConvMsgs(d.items || []); }} className="px-4 py-1.5 rounded bg-blue-700 text-white font-semibold">Send</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-2">
          <h3 className="font-semibold text-sm">School Portal Settings</h3>
          <p className="text-slate-600 dark:text-slate-300">All academic modules operate uniformly for Government and Private schools with school-level data isolation.</p>
        </div>
      )}
    </div>
  );
}
