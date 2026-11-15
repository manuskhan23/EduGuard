import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Search,
  Users,
  CalendarCheck,
  Award,
  CreditCard,
  Clock,
  Megaphone,
  MessageSquarePlus,
  FileWarning,
  Bell,
  User,
} from 'lucide-react';
import { apiFetch, useAuth } from '../context/AuthContext';
import { NavItem, PortalShell } from '../components/layout/PortalShell';
import { EmptyState, OwnershipBadge, StatusBadge } from '../components/ui/Badges';
import { FileUploadField } from '../components/ui/ThemeAndUpload';
import { SchoolDirectorySection } from './PublicLandingAndDirectory';
import { COMPLAINT_CATEGORIES, UserRole } from '../../server/types';

export function ParentAndStudentWorkspace() {
  const { user } = useAuth();
  const isStudent = user?.role === UserRole.STUDENT;
  const [activeTab, setActiveTab] = useState('dashboard');

  const [childrenLinks, setChildrenLinks] = useState<any[]>([]);
  const [directorySchools, setDirectorySchools] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [attSummary, setAttSummary] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [timetables, setTimetables] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);

  // Forms
  const [linkForm, setLinkForm] = useState({ schoolId: '', admissionNumber: '', relationship: 'Parent/Guardian' });
  const [complaintForm, setComplaintForm] = useState({
    schoolId: '',
    schoolType: '',
    category: COMPLAINT_CATEGORIES[0] as string,
    title: '',
    description: '',
    relatedStudentId: '',
    priority: 'MEDIUM',
    evidencePhotos: [] as string[],
    supportingDocuments: [] as any[],
  });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const loadData = async () => {
    try {
      const [attRes, rRes, ttRes, aRes, nRes] = await Promise.all([
        apiFetch('/api/v1/attendance'),
        apiFetch('/api/v1/results'),
        apiFetch('/api/v1/timetables'),
        apiFetch('/api/v1/announcements'),
        apiFetch('/api/v1/notifications'),
      ]);
      setAttendance(attRes.items || []);
      setAttSummary(attRes.summary || null);
      setResults(rRes.items || []);
      setTimetables(ttRes.items || []);
      setAnnouncements(aRes.items || []);
      setNotifications(nRes.items || []);

      if (!isStudent) {
        const [linksRes, dirRes, fRes, pRes, cmpRes] = await Promise.all([
          apiFetch('/api/v1/parent-student'),
          apiFetch('/api/v1/schools/directory?limit=50'),
          apiFetch('/api/v1/fees'),
          apiFetch('/api/v1/payments'),
          apiFetch('/api/v1/complaints'),
        ]);
        setChildrenLinks(linksRes.items || []);
        setDirectorySchools(dirRes.items || []);
        setFees(fRes.items || []);
        setPayments(pRes.items || []);
        setComplaints(cmpRes.items || []);
        if (dirRes.items?.length && !linkForm.schoolId) {
          const first = dirRes.items[0];
          setLinkForm((f) => ({ ...f, schoolId: first._id }));
          setComplaintForm((f) => ({ ...f, schoolId: first._id, schoolType: first.schoolType }));
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.role]);

  const parentNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'directory', label: 'School Directory', icon: <Search className="w-4 h-4" /> },
    { id: 'children', label: 'My Children', icon: <Users className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'results', label: 'Results', icon: <Award className="w-4 h-4" /> },
    { id: 'fees', label: 'Fees', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'timetable', label: 'Timetable', icon: <Clock className="w-4 h-4" /> },
    { id: 'announcements', label: 'Announcements', icon: <Megaphone className="w-4 h-4" /> },
    { id: 'submit_complaint', label: 'Submit Complaint', icon: <MessageSquarePlus className="w-4 h-4" /> },
    { id: 'my_complaints', label: 'My Complaints', icon: <FileWarning className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  ];

  const studentNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'results', label: 'Results', icon: <Award className="w-4 h-4" /> },
    { id: 'timetable', label: 'Timetable', icon: <Clock className="w-4 h-4" /> },
    { id: 'announcements', label: 'Announcements', icon: <Megaphone className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  ];

  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setErr('');
    try {
      const res = await apiFetch('/api/v1/parent-student/request', { method: 'POST', body: JSON.stringify(linkForm) });
      setMsg(res.message);
      setLinkForm({ ...linkForm, admissionNumber: '' });
      loadData();
    } catch (error) {
      setErr((error as Error).message);
    }
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setErr('');
    try {
      const selectedStudent = childrenLinks.find((l) => String(l.studentId) === complaintForm.relatedStudentId)?.student;
      const res = await apiFetch('/api/v1/complaints', {
        method: 'POST',
        body: JSON.stringify({
          ...complaintForm,
          relatedStudentName: selectedStudent?.fullName || '',
        }),
      });
      setMsg(res.message);
      setComplaintForm({ ...complaintForm, title: '', description: '', evidencePhotos: [], supportingDocuments: [] });
      await loadData();
      setActiveTab('my_complaints');
    } catch (error) {
      setErr((error as Error).message);
    }
  };

  const openComplaintDetail = async (id: string) => {
    const d = await apiFetch(`/api/v1/complaints/${id}`);
    setSelectedComplaint(d);
  };

  return (
    <PortalShell
      navItems={isStudent ? studentNav : parentNav}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      title={isStudent ? 'Student Academic Portal' : 'Parent & Guardian Portal'}
      subtitle={user?.fullName}
    >
      <div className="space-y-5 text-xs">
        {msg && <div className="p-3 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">{msg}</div>}
        {err && <div className="p-3 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">{err}</div>}

        {activeTab === 'dashboard' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {!isStudent ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
                  <div className="text-xs text-slate-500">Connected Children</div>
                  <div className="font-mono text-2xl font-bold tabular-nums mt-1.5">
                    {childrenLinks.filter((l) => l.status === 'APPROVED').length}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
                    Pending links: {childrenLinks.filter((l) => l.status === 'PENDING').length}
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
                  <div className="text-xs text-slate-500">Timetable Slots</div>
                  <div className="font-mono text-2xl font-bold tabular-nums mt-1.5">{timetables.length}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Weekly schedule entries</div>
                </div>
              )}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
                <div className="text-xs text-slate-500">Attendance Rate</div>
                <div className="font-mono text-2xl font-bold tabular-nums mt-1.5">{attSummary?.percentage ?? 0}%</div>
                <div className="text-[11px] text-slate-500 mt-1 tabular-nums">{attendance.length} records logged</div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
                <div className="text-xs text-slate-500">Published Results</div>
                <div className="font-mono text-2xl font-bold tabular-nums mt-1.5">{results.length}</div>
                <div className="text-[11px] text-slate-500 mt-1">Academic report cards</div>
              </div>
              {!isStudent ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
                  <div className="text-xs text-slate-500">My Complaints</div>
                  <div className="font-mono text-2xl font-bold tabular-nums mt-1.5">{complaints.length}</div>
                  <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
                    Fee schedules: {fees.length} · Receipts: {payments.length}
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
                  <div className="text-xs text-slate-500">Announcements</div>
                  <div className="font-mono text-2xl font-bold tabular-nums mt-1.5">{announcements.length}</div>
                  <div className="text-[11px] text-slate-500 mt-1">School notices</div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="font-display text-sm font-bold">Recent Announcements</h3>
                  <button type="button" onClick={() => setActiveTab('announcements')} className="text-xs text-blue-700 dark:text-blue-400 hover:underline">View all →</button>
                </div>
                {announcements.length === 0 ? (
                  <EmptyState title="No school announcements" description="Notices published by your school will appear here." />
                ) : (
                  <div className="space-y-2">
                    {announcements.slice(0, 3).map((a) => (
                      <div key={a._id} className="p-3 rounded bg-slate-50 dark:bg-slate-800/70">
                        <div className="font-semibold text-slate-900 dark:text-white">{a.title}</div>
                        <p className="text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{a.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!isStudent ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="font-display text-sm font-bold">Parent Quick Actions</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setActiveTab('directory')} className="px-4 py-2 rounded bg-blue-700 text-white font-semibold">Browse Gov & Private Schools</button>
                    <button type="button" onClick={() => setActiveTab('submit_complaint')} className="px-4 py-2 rounded bg-red-600 text-white font-semibold">Submit Complaint</button>
                    <button type="button" onClick={() => setActiveTab('children')} className="px-4 py-2 rounded border border-slate-200 dark:border-slate-700 font-medium">Link Child Account</button>
                  </div>
                  {complaints.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="text-[11px] font-semibold text-slate-500">Latest Complaint</div>
                      <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/70 flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{complaints[0].complaintNumber} — {complaints[0].title}</span>
                        <StatusBadge status={complaints[0].status} />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="font-display text-sm font-bold">Quick Navigation</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setActiveTab('attendance')} className="px-4 py-2 rounded bg-blue-700 text-white font-semibold">View Attendance</button>
                    <button type="button" onClick={() => setActiveTab('results')} className="px-4 py-2 rounded border border-slate-200 dark:border-slate-700 font-medium">Check Results</button>
                    <button type="button" onClick={() => setActiveTab('timetable')} className="px-4 py-2 rounded border border-slate-200 dark:border-slate-700 font-medium">Class Timetable</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'directory' && !isStudent && (
          <SchoolDirectorySection
            onSubmitComplaintForSchool={(school) => {
              setComplaintForm((f) => ({ ...f, schoolId: school._id, schoolType: school.schoolType }));
              setActiveTab('submit_complaint');
            }}
          />
        )}

        {activeTab === 'children' && !isStudent && (
          <div className="space-y-4">
            <form onSubmit={handleRequestLink} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
              <h3 className="font-display text-sm font-bold">Connect a Child to Your Parent Account</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select value={linkForm.schoolId} onChange={(e) => setLinkForm({ ...linkForm, schoolId: e.target.value })} className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                  {directorySchools.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.schoolType})</option>)}
                </select>
                <input required placeholder="Student Admission Number (e.g. GMHS-2026-001)" value={linkForm.admissionNumber} onChange={(e) => setLinkForm({ ...linkForm, admissionNumber: e.target.value })} className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
                <input placeholder="Relationship (Mother / Father)" value={linkForm.relationship} onChange={(e) => setLinkForm({ ...linkForm, relationship: e.target.value })} className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              </div>
              <button type="submit" className="px-4 py-2 rounded bg-blue-700 text-white font-semibold">Request Student Link</button>
            </form>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
              {childrenLinks.map((l) => (
                <div key={l._id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-sm">{l.student?.fullName} <span className="font-mono text-slate-400">({l.student?.admissionNumber})</span></div>
                    <div className="text-slate-500 mt-0.5">{l.school?.name} · {l.relationship}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.school && <OwnershipBadge schoolType={l.school.schoolType} />}
                    <StatusBadge status={l.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
            <h3 className="font-display text-sm font-bold">Attendance Summary ({attSummary?.percentage ?? 0}%)</h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {attendance.map((a) => (
                <div key={a._id} className="py-2 flex justify-between items-center">
                  <span className="font-mono tabular-nums">{a.date}</span>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="space-y-3">
            {results.length === 0 ? <EmptyState title="No published results" description="Published examination report cards will appear here." /> : results.map((r) => (
              <div key={r._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="font-semibold text-sm">Report Card · Overall {r.percentage}% (Grade {r.overallGrade})</div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {(r.marks || []).map((m: any, i: number) => (
                    <div key={i} className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 flex justify-between">
                      <span>{m.subjectName}</span>
                      <span className="font-mono tabular-nums">{m.obtainedMarks}/{m.maxMarks} ({m.grade})</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'fees' && !isStudent && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
            <h3 className="font-display text-sm font-bold">Fee Structures & Payment Receipts</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fees.map((f) => (
                <div key={f._id} className="p-3 rounded border border-slate-200 dark:border-slate-700 flex justify-between">
                  <span>{f.title} ({f.frequency})</span>
                  <span className="font-mono font-semibold">PKR {f.amount}</span>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="font-semibold">Payment Receipts</h4>
              {payments.map((p) => (
                <div key={p._id} className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 flex justify-between">
                  <span className="font-mono font-semibold">{p.receiptNumber} · {p.paymentDate}</span>
                  <span className="font-mono">PKR {p.amountPaid} ({p.status})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'timetable' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-2">
            <h3 className="font-display text-sm font-bold">Weekly Class Timetable</h3>
            {timetables.map((t) => (
              <div key={t._id} className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 flex justify-between">
                <span><strong>{t.dayOfWeek}</strong> · {t.startTime}–{t.endTime}</span>
                <span className="font-mono text-slate-500">{t.classroom}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="space-y-2">
            {announcements.map((a) => (
              <div key={a._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                <div className="font-semibold text-sm">{a.title}</div>
                <p className="mt-1 text-slate-600 dark:text-slate-300">{a.content}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'submit_complaint' && !isStudent && (
          <form onSubmit={handleSubmitComplaint} className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4">
            <h3 className="font-display text-lg font-bold">Submit Parent Complaint (Government or Private School)</h3>
            <div>
              <label className="block font-medium mb-1">Target School *</label>
              <select
                value={complaintForm.schoolId}
                onChange={(e) => {
                  const s = directorySchools.find((x) => x._id === e.target.value);
                  setComplaintForm({ ...complaintForm, schoolId: e.target.value, schoolType: s?.schoolType || '' });
                }}
                className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {directorySchools.map((s) => (
                  <option key={s._id} value={s._id}>{s.name} — {s.schoolType} ({s.district})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Ownership Type (Auto-Populated)</label>
                <div className="py-1.5">
                  <OwnershipBadge schoolType={directorySchools.find((s) => s._id === complaintForm.schoolId)?.schoolType || 'GOVERNMENT'} />
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">Complaint Category *</label>
                <select value={complaintForm.category} onChange={(e) => setComplaintForm({ ...complaintForm, category: e.target.value })} className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                  {COMPLAINT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Related Student (Optional)</label>
                <select value={complaintForm.relatedStudentId} onChange={(e) => setComplaintForm({ ...complaintForm, relatedStudentId: e.target.value })} className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                  <option value="">General / Not Student-Specific</option>
                  {childrenLinks.filter((l) => l.status === 'APPROVED').map((l) => (
                    <option key={l.studentId} value={l.studentId}>{l.student?.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Priority</label>
                <select value={complaintForm.priority} onChange={(e) => setComplaintForm({ ...complaintForm, priority: e.target.value })} className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                  <option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option><option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>
            <input required placeholder="Complaint Title *" value={complaintForm.title} onChange={(e) => setComplaintForm({ ...complaintForm, title: e.target.value })} className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            <textarea required rows={4} placeholder="Detailed description of the issue..." value={complaintForm.description} onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })} className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            <div className="flex flex-wrap gap-2">
              <FileUploadField label="Evidence Photo / Document" onUploaded={(d) => setComplaintForm((f) => ({ ...f, supportingDocuments: [...f.supportingDocuments, { title: d.title, fileUrl: d.fileUrl, mimeType: d.mimeType }] }))} />
            </div>
            <button type="submit" className="px-5 py-2.5 rounded bg-red-600 hover:bg-red-700 text-white font-semibold">Submit Complaint</button>
          </form>
        )}

        {activeTab === 'my_complaints' && !isStudent && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              {complaints.length === 0 ? <EmptyState title="No complaints filed" description="Your submitted complaints will appear here." /> : complaints.map((c) => (
                <div key={c._id} onClick={() => openComplaintDetail(c._id)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 cursor-pointer hover:border-blue-600">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-mono font-semibold">{c.complaintNumber}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="font-semibold text-sm mt-1">{c.title}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <OwnershipBadge schoolType={c.schoolType} />
                    <span className="text-slate-500">{c.school?.name}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
              {!selectedComplaint ? <EmptyState title="Select a complaint" description="Click any complaint to track its public timeline and school response." /> : (
                <>
                  <div className="font-mono text-slate-500">{selectedComplaint.complaint.complaintNumber}</div>
                  <h3 className="font-display text-base font-bold">{selectedComplaint.complaint.title}</h3>
                  <p className="text-slate-600 dark:text-slate-300">{selectedComplaint.complaint.description}</p>
                  {selectedComplaint.complaint.schoolResponse && (
                    <div className="p-3 rounded bg-blue-50 dark:bg-blue-950/30"><strong>School Response:</strong> {selectedComplaint.complaint.schoolResponse}</div>
                  )}
                  <h4 className="font-semibold pt-2">Public Tracking Timeline</h4>
                  <div className="space-y-2">
                    {selectedComplaint.timeline.map((t: any) => (
                      <div key={t._id} className="p-2.5 rounded bg-slate-50 dark:bg-slate-800">
                        <div className="flex justify-between font-semibold"><span>{t.title}</span><span className="tabular-nums text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</span></div>
                        <div className="text-slate-500">{t.description}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map((n) => (
              <div key={n._id} className="p-4">
                <div className="font-semibold">{n.title}</div>
                <div className="text-slate-500 mt-0.5">{n.message}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-2">
            <h3 className="font-display text-sm font-bold">Account Profile</h3>
            <p>Name: {user?.fullName}</p>
            <p>Email: {user?.email}</p>
            <p>Role: {user?.role}</p>
            <p>District: {user?.district || 'N/A'}</p>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
