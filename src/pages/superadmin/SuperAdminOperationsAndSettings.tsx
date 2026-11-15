import React, { useEffect, useState } from 'react';
import {
  UserPlus,
  Ban,
  CheckCircle2,
  Plus,
  Send,
  ShieldAlert,
  X,
  ClipboardCheck,
} from 'lucide-react';
import { apiFetch } from '../../context/AuthContext';
import {
  EmptyState,
  OwnershipBadge,
  StatusBadge,
  TableSkeleton,
} from '../../components/ui/Badges';
import {
  COMPLAINT_CATEGORIES,
  ComplaintStatus,
  INSPECTION_TYPES,
  SchoolType,
  UserRole,
} from '../../../server/types';

// ======================================================
// USERS & INSPECTOR ACCOUNT MANAGEMENT
// ======================================================
export function SuperAdminUsersView() {
  const [users, setUsers] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: UserRole.INSPECTOR,
    phone: '',
    employeeId: '',
    designation: 'Compliance Inspector',
    province: 'Punjab',
    district: 'Lahore',
    specialization: '',
  });
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/v1/users?role=${roleFilter}&q=${encodeURIComponent(q)}`);
      setUsers(data.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [roleFilter]);

  const toggleBlock = async (u: any) => {
    await apiFetch(`/api/v1/users/${u._id}/block`, {
      method: 'POST',
      body: JSON.stringify({ isBlocked: !u.isBlocked, reason: !u.isBlocked ? 'Blocked by Super Admin' : '' }),
    });
    load();
  };

  const createInspector = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    try {
      await apiFetch('/api/v1/users/inspectors', { method: 'POST', body: JSON.stringify(form) });
      setShowCreate(false);
      setForm({ ...form, fullName: '', email: '', password: '', employeeId: '' });
      load();
    } catch (err) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
            <option value="ALL">All Roles</option>
            {Object.values(UserRole).map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
          </select>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search user..." className="px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950" />
          <button type="button" onClick={load} className="px-3 py-1.5 text-xs font-medium rounded bg-slate-900 dark:bg-slate-700 text-white">Filter</button>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md bg-blue-700 hover:bg-blue-800 text-white"
        >
          <UserPlus className="w-3.5 h-3.5" /> Create Inspector / Group Leader
        </button>
      </div>

      {loading ? <TableSkeleton rows={6} /> : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">District / Emp ID</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => (
                <tr key={u._id}>
                  <td className="px-4 py-3 font-semibold">{u.fullName}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3"><StatusBadge status={u.role} /></td>
                  <td className="px-4 py-3">{u.district || '—'} {u.employeeId ? `· ${u.employeeId}` : ''}</td>
                  <td className="px-4 py-3"><StatusBadge status={u.isBlocked ? 'BLOCKED' : 'APPROVED'} /></td>
                  <td className="px-4 py-3 text-right">
                    {u.role !== UserRole.SUPER_ADMIN && (
                      <button
                        type="button"
                        onClick={() => toggleBlock(u)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium ${
                          u.isBlocked
                            ? 'bg-emerald-600 text-white'
                            : 'border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400'
                        }`}
                      >
                        <Ban className="w-3 h-3" /> {u.isBlocked ? 'Unblock' : 'Block'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <form onSubmit={createInspector} className="w-full max-w-lg rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold">Create Inspector Account</h3>
              <button type="button" onClick={() => setShowCreate(false)}><X className="w-4 h-4" /></button>
            </div>
            {msg && <div className="p-2 rounded bg-red-50 text-red-700">{msg}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input required placeholder="Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              <input required type="email" placeholder="Official Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              <input required type="password" placeholder="Initial Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                <option value={UserRole.INSPECTOR}>INSPECTOR</option>
                <option value={UserRole.GROUP_LEADER}>GROUP LEADER</option>
              </select>
              <input placeholder="Employee ID" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              <input placeholder="District" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              <input placeholder="Specialization" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="sm:col-span-2 px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded border border-slate-200 dark:border-slate-700">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded bg-blue-700 text-white font-semibold">Create Account</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ======================================================
// COMPLAINTS MANAGEMENT & OWNERSHIP ANALYTICS
// ======================================================
export function SuperAdminComplaintsView() {
  const [items, setItems] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [filters, setFilters] = useState({ schoolType: 'ALL', category: 'ALL', status: 'ALL', priority: 'ALL', q: '' });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [nextStatus, setNextStatus] = useState('');
  const [summary, setSummary] = useState('');
  const [internalNote, setInternalNote] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams(filters);
      const [listData, analData] = await Promise.all([
        apiFetch(`/api/v1/complaints?${qs.toString()}`),
        apiFetch('/api/v1/complaints/analytics/summary'),
      ]);
      setItems(listData.items || []);
      setAnalytics(analData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filters.schoolType, filters.category, filters.status, filters.priority]);

  const openComplaint = async (id: string) => {
    const d = await apiFetch(`/api/v1/complaints/${id}`);
    setSelected(d);
    setNextStatus(d.complaint.status);
    setSummary(d.complaint.resolutionSummary || '');
  };

  const updateStatus = async () => {
    if (!selected) return;
    await apiFetch(`/api/v1/complaints/${selected.complaint._id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status: nextStatus, summary }),
    });
    await openComplaint(selected.complaint._id);
    load();
  };

  const addInternalNote = async () => {
    if (!selected || !internalNote.trim()) return;
    await apiFetch(`/api/v1/complaints/${selected.complaint._id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message: internalNote, isInternalAdminNote: true }),
    });
    setInternalNote('');
    openComplaint(selected.complaint._id);
  };

  return (
    <div className="space-y-6">
      {/* Ownership-Based Complaint Analytics (Raw vs Normalized Rates) */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { title: 'Government School Complaints', d: analytics.government, type: SchoolType.GOVERNMENT },
            { title: 'Private School Complaints', d: analytics.private, type: SchoolType.PRIVATE },
          ].map((box) => (
            <div key={box.title} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold">{box.title}</h3>
                <OwnershipBadge schoolType={box.type} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-[11px] text-slate-500">Raw Count</div>
                  <div className="font-mono text-base font-bold tabular-nums">{box.d.rawCount}</div>
                </div>
                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-[11px] text-slate-500">Per School</div>
                  <div className="font-mono text-base font-bold tabular-nums">{box.d.complaintsPerSchool}</div>
                </div>
                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-[11px] text-slate-500">Per 100 Students</div>
                  <div className="font-mono text-base font-bold tabular-nums">{box.d.complaintsPer100Students}</div>
                </div>
                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-[11px] text-slate-500">Resolution Rate</div>
                  <div className="font-mono text-base font-bold tabular-nums">{box.d.resolutionRate}%</div>
                </div>
                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-[11px] text-slate-500">Avg Days</div>
                  <div className="font-mono text-base font-bold tabular-nums">{box.d.avgResolutionDays}d</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
        <select value={filters.schoolType} onChange={(e) => setFilters({ ...filters, schoolType: e.target.value })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
          <option value="ALL">All Ownership</option>
          <option value="GOVERNMENT">Government</option>
          <option value="PRIVATE">Private</option>
        </select>
        <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
          <option value="ALL">All Categories</option>
          {COMPLAINT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
          <option value="ALL">All Statuses</option>
          {Object.values(ComplaintStatus).map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
          <option value="ALL">All Priorities</option>
          {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="flex gap-1.5">
          <input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="Search # or title..." className="flex-1 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950" />
          <button type="button" onClick={load} className="px-3 py-1.5 rounded bg-blue-700 text-white font-medium">Go</button>
        </div>
      </div>

      {loading ? <TableSkeleton rows={5} /> : items.length === 0 ? (
        <EmptyState title="No complaints found" description="Parent complaints matching the filters will appear here." />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Complaint #</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Ownership</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((c) => (
                <tr key={c._id}>
                  <td className="px-4 py-3 font-mono font-semibold">{c.complaintNumber}</td>
                  <td className="px-4 py-3">{c.school?.name}</td>
                  <td className="px-4 py-3"><OwnershipBadge schoolType={c.schoolType} /></td>
                  <td className="px-4 py-3">{c.category}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.priority} /></td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => openComplaint(c._id)} className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 text-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-slate-500">{selected.complaint.complaintNumber}</div>
                <h3 className="font-display text-lg font-bold">{selected.complaint.title}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <OwnershipBadge schoolType={selected.complaint.schoolType} />
                  <StatusBadge status={selected.complaint.status} />
                </div>
              </div>
              <button type="button" onClick={() => setSelected(null)}><X className="w-4 h-4" /></button>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded">
              {selected.complaint.description}
            </p>

            {selected.complaint.schoolResponse && (
              <div className="p-3 rounded border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
                <div className="font-semibold">School Management Official Response:</div>
                <p className="mt-1">{selected.complaint.schoolResponse}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="space-y-2">
                <h4 className="font-semibold">Lifecycle Status Transition</h4>
                <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                  {Object.values(ComplaintStatus).map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
                <textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Resolution or transition summary..." className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
                <button type="button" onClick={updateStatus} className="px-4 py-2 rounded bg-blue-700 text-white font-semibold">Update Status</button>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Confidential Admin Discussion (Hidden from School/Parent)</h4>
                <div className="flex gap-2">
                  <input value={internalNote} onChange={(e) => setInternalNote(e.target.value)} placeholder="Add confidential note..." className="flex-1 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
                  <button type="button" onClick={addInternalNote} className="px-3 py-1.5 rounded bg-slate-900 dark:bg-slate-700 text-white">Save</button>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {selected.messages.map((m: any) => (
                    <div key={m._id} className={`p-2 rounded ${m.isInternalAdminNote ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800' : 'bg-slate-50 dark:bg-slate-800'}`}>
                      <div className="font-semibold">{m.senderName} {m.isInternalAdminNote ? '(Internal Only)' : ''}</div>
                      <div>{m.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ======================================================
// INSPECTION GROUPS, REPORTS & CORRECTIVE ACTIONS
// ======================================================
export function SuperAdminInspectionsView({ tab }: { tab: 'groups' | 'reports' | 'corrective' }) {
  const [groups, setGroups] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [inspectors, setInspectors] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateAction, setShowCreateAction] = useState(false);
  const [groupDetail, setGroupDetail] = useState<any>(null);
  const [groupForm, setGroupForm] = useState({
    groupName: '',
    targetSchoolId: '',
    reason: '',
    inspectionType: INSPECTION_TYPES[0],
    priority: 'HIGH',
    deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    instructions: '',
    groupLeaderId: '',
    inspectorIds: [] as string[],
    relatedComplaints: [] as string[],
  });
  const [actionForm, setActionForm] = useState({
    schoolId: '',
    identifiedIssue: '',
    requiredCorrection: '',
    responsibleParty: '',
    deadline: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
    priority: 'HIGH',
  });
  const [reviewRemarks, setReviewRemarks] = useState('');

  const load = async () => {
    const [gData, rData, aData, sData, iData, cData] = await Promise.all([
      apiFetch('/api/v1/inspection-groups'),
      apiFetch('/api/v1/inspection-reports'),
      apiFetch('/api/v1/corrective-actions'),
      apiFetch('/api/v1/schools?registrationStatus=APPROVED'),
      apiFetch('/api/v1/users/inspectors'),
      apiFetch('/api/v1/complaints'),
    ]);
    setGroups(gData.items || []);
    setReports(rData.items || []);
    setActions(aData.items || []);
    setSchools(sData.items || []);
    setInspectors(iData.items || []);
    setComplaints(cData.items || []);
    if (sData.items?.length && !groupForm.targetSchoolId) {
      setGroupForm((f) => ({ ...f, targetSchoolId: sData.items[0]._id }));
      setActionForm((f) => ({ ...f, schoolId: sData.items[0]._id }));
    }
    if (iData.items?.length && !groupForm.groupLeaderId) {
      const leader = iData.items.find((u: any) => u.role === UserRole.GROUP_LEADER) || iData.items[0];
      setGroupForm((f) => ({ ...f, groupLeaderId: leader._id, inspectorIds: iData.items.map((u: any) => u._id) }));
    }
  };

  useEffect(() => {
    load();
  }, [tab]);

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/v1/inspection-groups', { method: 'POST', body: JSON.stringify(groupForm) });
    setShowCreateGroup(false);
    load();
  };

  const reviewReport = async (reportId: string, decision: 'APPROVE' | 'REQUEST_REVISION') => {
    await apiFetch(`/api/v1/inspection-reports/${reportId}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, adminRemarks: reviewRemarks }),
    });
    setReviewRemarks('');
    load();
  };

  const createAction = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/v1/corrective-actions', { method: 'POST', body: JSON.stringify(actionForm) });
    setShowCreateAction(false);
    load();
  };

  const verifyAction = async (id: string, decision: 'ACCEPT' | 'REJECT') => {
    await apiFetch(`/api/v1/corrective-actions/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ decision, adminReviewNotes: decision === 'ACCEPT' ? 'Evidence verified by Super Admin.' : 'Additional proof required.' }),
    });
    load();
  };

  if (tab === 'reports') {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold">Final Inspection Reports Queue</h2>
          <p className="text-xs text-slate-500">Submitted reports never close inspection groups automatically. Review and approve to close.</p>
        </div>
        {reports.length === 0 ? (
          <EmptyState title="No inspection reports" description="Final reports submitted by Group Leaders will appear here." />
        ) : (
          <div className="space-y-4">
            {reports.map((rep) => (
              <div key={rep._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-mono text-slate-500">{rep.group?.inspectionId} · {rep.group?.groupName}</div>
                    <h3 className="font-display text-base font-bold mt-0.5">{rep.school?.name}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <OwnershipBadge schoolType={rep.schoolType} />
                    <StatusBadge status={rep.adminStatus} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded">
                  <div>
                    <div className="font-semibold">Detailed Findings</div>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">{rep.detailedFindings}</p>
                    <div className="font-semibold mt-2">Conclusion (Risk: {rep.riskAssessment})</div>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">{rep.finalConclusion}</p>
                  </div>
                  <div>
                    <div className="font-semibold">Recommendations & Corrective Requirements</div>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">{rep.recommendations}</p>
                    {rep.correctiveActionRequirements && <p className="mt-1 text-amber-700 dark:text-amber-300">{rep.correctiveActionRequirements}</p>}
                  </div>
                </div>
                {rep.adminStatus === 'PENDING_REVIEW' && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <input value={reviewRemarks} onChange={(e) => setReviewRemarks(e.target.value)} placeholder="Admin review remarks..." className="flex-1 min-w-[200px] px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
                    <button type="button" onClick={() => reviewReport(rep._id, 'APPROVE')} className="inline-flex items-center gap-1 px-4 py-2 rounded bg-emerald-600 text-white font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Close Group
                    </button>
                    <button type="button" onClick={() => reviewReport(rep._id, 'REQUEST_REVISION')} className="px-4 py-2 rounded bg-amber-600 text-white font-semibold">
                      Request Revisions
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (tab === 'corrective') {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Corrective Action Orders</h2>
            <p className="text-xs text-slate-500">Tracked independently from complaint statuses for both Government & Private schools.</p>
          </div>
          <button type="button" onClick={() => setShowCreateAction(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md bg-blue-700 text-white">
            <Plus className="w-3.5 h-3.5" /> Issue Corrective Action
          </button>
        </div>

        <div className="space-y-3">
          {actions.map((a) => (
            <div key={a._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-sm">{a.school?.name} — {a.identifiedIssue}</div>
                <div className="flex gap-2">
                  <OwnershipBadge schoolType={a.schoolType} />
                  <StatusBadge status={a.priority} />
                  <StatusBadge status={a.status} />
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-300">Required Correction: {a.requiredCorrection}</p>
              <div className="text-slate-500 tabular-nums">Responsible: {a.responsibleParty} · Deadline: {new Date(a.deadline).toLocaleDateString()}</div>
              {a.schoolEvidenceNotes && (
                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800">
                  <span className="font-semibold">School Evidence:</span> {a.schoolEvidenceNotes}
                </div>
              )}
              {a.status === 'COMPLETED' && (
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => verifyAction(a._id, 'ACCEPT')} className="px-3 py-1.5 rounded bg-emerald-600 text-white font-semibold">Accept & Verify</button>
                  <button type="button" onClick={() => verifyAction(a._id, 'REJECT')} className="px-3 py-1.5 rounded bg-red-600 text-white font-semibold">Reject Evidence</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {showCreateAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <form onSubmit={createAction} className="w-full max-w-lg rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-3 text-xs">
              <div className="flex justify-between items-center"><h3 className="font-display text-base font-bold">Issue Corrective Action</h3><button type="button" onClick={() => setShowCreateAction(false)}><X className="w-4 h-4" /></button></div>
              <select value={actionForm.schoolId} onChange={(e) => setActionForm({ ...actionForm, schoolId: e.target.value })} className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                {schools.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.schoolType})</option>)}
              </select>
              <input required placeholder="Identified Issue" value={actionForm.identifiedIssue} onChange={(e) => setActionForm({ ...actionForm, identifiedIssue: e.target.value })} className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              <textarea required rows={2} placeholder="Required Correction" value={actionForm.requiredCorrection} onChange={(e) => setActionForm({ ...actionForm, requiredCorrection: e.target.value })} className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              <div className="grid grid-cols-3 gap-2">
                <input required placeholder="Responsible Party" value={actionForm.responsibleParty} onChange={(e) => setActionForm({ ...actionForm, responsibleParty: e.target.value })} className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
                <input type="date" required value={actionForm.deadline} onChange={(e) => setActionForm({ ...actionForm, deadline: e.target.value })} className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
                <select value={actionForm.priority} onChange={(e) => setActionForm({ ...actionForm, priority: e.target.value })} className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                  <option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option><option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateAction(false)} className="px-4 py-2 rounded border border-slate-200 dark:border-slate-700">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-700 text-white font-semibold">Issue Order</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Centralized Inspection & Raid Groups</h2>
          <p className="text-xs text-slate-500">Dispatch inspector teams to any approved Government or Private school.</p>
        </div>
        <button type="button" onClick={() => setShowCreateGroup(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md bg-blue-700 text-white">
          <ClipboardCheck className="w-3.5 h-3.5" /> Create Inspection Group
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3">Inspection ID</th>
              <th className="px-4 py-3">Group Name</th>
              <th className="px-4 py-3">Target School</th>
              <th className="px-4 py-3">Ownership</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Leader & Team</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {groups.map((g) => (
              <tr key={g._id}>
                <td className="px-4 py-3 font-mono font-semibold">{g.inspectionId}</td>
                <td className="px-4 py-3 font-medium">{g.groupName}</td>
                <td className="px-4 py-3">{g.school?.name}</td>
                <td className="px-4 py-3"><OwnershipBadge schoolType={g.schoolType} /></td>
                <td className="px-4 py-3">{g.inspectionType}</td>
                <td className="px-4 py-3">{g.groupLeader?.fullName} ({g.members?.length || 0} members)</td>
                <td className="px-4 py-3"><StatusBadge status={g.status} /></td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={async () => {
                      const d = await apiFetch(`/api/v1/inspection-groups/${g._id}`);
                      setGroupDetail(d);
                    }}
                    className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700"
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <form onSubmit={createGroup} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center"><h3 className="font-display text-base font-bold">Create Inspection Group</h3><button type="button" onClick={() => setShowCreateGroup(false)}><X className="w-4 h-4" /></button></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input required placeholder="Group Name" value={groupForm.groupName} onChange={(e) => setGroupForm({ ...groupForm, groupName: e.target.value })} className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              <select value={groupForm.targetSchoolId} onChange={(e) => setGroupForm({ ...groupForm, targetSchoolId: e.target.value })} className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                {schools.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.schoolType})</option>)}
              </select>
              <select value={groupForm.inspectionType} onChange={(e) => setGroupForm({ ...groupForm, inspectionType: e.target.value as any })} className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                {INSPECTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={groupForm.groupLeaderId} onChange={(e) => setGroupForm({ ...groupForm, groupLeaderId: e.target.value })} className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                {inspectors.map((i) => <option key={i._id} value={i._id}>Leader: {i.fullName} ({i.role})</option>)}
              </select>
              <input type="date" required value={groupForm.deadline} onChange={(e) => setGroupForm({ ...groupForm, deadline: e.target.value })} className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              <select value={groupForm.priority} onChange={(e) => setGroupForm({ ...groupForm, priority: e.target.value })} className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                <option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option><option value="CRITICAL">CRITICAL</option>
              </select>
              <input required placeholder="Inspection Reason" value={groupForm.reason} onChange={(e) => setGroupForm({ ...groupForm, reason: e.target.value })} className="sm:col-span-2 px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              <textarea rows={2} placeholder="Official Instructions for Team" value={groupForm.instructions} onChange={(e) => setGroupForm({ ...groupForm, instructions: e.target.value })} className="sm:col-span-2 px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <div className="font-semibold mb-1">Link Related Complaints (optional)</div>
              <div className="flex flex-wrap gap-1.5">
                {complaints.slice(0, 8).map((c) => {
                  const active = groupForm.relatedComplaints.includes(c._id);
                  return (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() =>
                        setGroupForm((f) => ({
                          ...f,
                          relatedComplaints: active ? f.relatedComplaints.filter((id) => id !== c._id) : [...f.relatedComplaints, c._id],
                        }))
                      }
                      className={`px-2 py-1 rounded border ${active ? 'bg-blue-700 text-white border-blue-700' : 'border-slate-200 dark:border-slate-700'}`}
                    >
                      {c.complaintNumber}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreateGroup(false)} className="px-4 py-2 rounded border border-slate-200 dark:border-slate-700">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded bg-blue-700 text-white font-semibold">Dispatch Inspection Group</button>
            </div>
          </form>
        </div>
      )}

      {groupDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-mono text-slate-500">{groupDetail.group.inspectionId}</div>
                <h3 className="font-display text-base font-bold">{groupDetail.group.groupName}</h3>
              </div>
              <button type="button" onClick={() => setGroupDetail(null)}><X className="w-4 h-4" /></button>
            </div>
            <p>Target School: <span className="font-semibold">{groupDetail.school?.name}</span> · Status: {groupDetail.group.status}</p>
            <div>
              <h4 className="font-semibold mb-1">Submitted Findings ({groupDetail.findings.length})</h4>
              {groupDetail.findings.map((f: any) => (
                <div key={f._id} className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 mb-2">
                  <div className="font-semibold">{f.title} ({f.severity}) — by {f.inspectorName}</div>
                  <p className="mt-0.5 text-slate-600 dark:text-slate-300">{f.observations}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ======================================================
// ADMIN MESSAGES & SETTINGS (CATEGORIES, POLICIES, AUDIT LOGS)
// ======================================================
export function SuperAdminMessagesView() {
  const [convs, setConvs] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState('');
  const [newForm, setNewForm] = useState({ schoolId: '', subject: '', initialMessage: '' });

  const load = async () => {
    const [cData, sData] = await Promise.all([apiFetch('/api/v1/messages/conversations'), apiFetch('/api/v1/schools')]);
    setConvs(cData.items || []);
    setSchools(sData.items || []);
    if (sData.items?.length && !newForm.schoolId) setNewForm((f) => ({ ...f, schoolId: sData.items[0]._id }));
  };

  useEffect(() => {
    load();
  }, []);

  const openConv = async (c: any) => {
    setActiveConv(c);
    const d = await apiFetch(`/api/v1/messages/conversations/${c._id}`);
    setMessages(d.items || []);
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !reply.trim()) return;
    await apiFetch(`/api/v1/messages/conversations/${activeConv._id}`, { method: 'POST', body: JSON.stringify({ body: reply }) });
    setReply('');
    openConv(activeConv);
  };

  const startConv = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/v1/messages/conversations', { method: 'POST', body: JSON.stringify(newForm) });
    setNewForm({ ...newForm, subject: '', initialMessage: '' });
    load();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-4 text-xs">
        <h3 className="font-semibold text-sm">Official School Communications</h3>
        <form onSubmit={startConv} className="space-y-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <select value={newForm.schoolId} onChange={(e) => setNewForm({ ...newForm, schoolId: e.target.value })} className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
            {schools.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <input required placeholder="Subject" value={newForm.subject} onChange={(e) => setNewForm({ ...newForm, subject: e.target.value })} className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
          <input required placeholder="Initial message..." value={newForm.initialMessage} onChange={(e) => setNewForm({ ...newForm, initialMessage: e.target.value })} className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
          <button type="submit" className="w-full py-1.5 rounded bg-blue-700 text-white font-semibold">Start Conversation</button>
        </form>
        <div className="space-y-1.5">
          {convs.map((c) => (
            <button
              key={c._id}
              type="button"
              onClick={() => openConv(c)}
              className={`w-full text-left p-2.5 rounded border ${activeConv?._id === c._id ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 dark:border-slate-800'}`}
            >
              <div className="font-semibold truncate">{c.subject}</div>
              <div className="text-[11px] text-slate-500">{c.school?.name}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex flex-col justify-between min-h-[380px]">
        {!activeConv ? (
          <EmptyState title="Select a conversation" description="Choose an official thread on the left or start a new message to a school." />
        ) : (
          <>
            <div className="space-y-3">
              <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-semibold text-sm">{activeConv.subject}</h3>
                <p className="text-xs text-slate-500">{activeConv.school?.name}</p>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {messages.map((m) => (
                  <div key={m._id} className="p-3 rounded bg-slate-50 dark:bg-slate-800 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span>{m.senderName} ({m.senderRole.replace(/_/g, ' ')})</span>
                      <span className="text-slate-400 font-normal tabular-nums">{new Date(m.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1">{m.body}</p>
                  </div>
                ))}
              </div>
            </div>
            <form onSubmit={sendReply} className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type official reply..." className="flex-1 px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              <button type="submit" className="inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold rounded bg-blue-700 text-white">
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export function SuperAdminSettingsAndAuditView() {
  const [meta, setMeta] = useState<any>({ schoolCategories: [], ownershipPolicies: [] });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<SchoolType>(SchoolType.GOVERNMENT);
  const [polForm, setPolForm] = useState({
    title: '',
    schoolType: SchoolType.GOVERNMENT,
    province: 'All Provinces',
    district: 'All Districts',
    schoolCategory: 'All Categories',
    effectiveDate: new Date().toISOString().slice(0, 10),
    requiredDocuments: '',
    reportingRequirements: '',
  });

  const load = async () => {
    const [m, logs] = await Promise.all([apiFetch('/api/v1/settings/metadata'), apiFetch('/api/v1/audit-logs')]);
    setMeta(m);
    setAuditLogs(logs.items || []);
  };

  useEffect(() => {
    load();
  }, []);

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/v1/settings/categories', { method: 'POST', body: JSON.stringify({ name: catName, schoolType: catType }) });
    setCatName('');
    load();
  };

  const toggleCategory = async (c: any) => {
    await apiFetch(`/api/v1/settings/categories/${c.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !c.isActive }) });
    load();
  };

  const addPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/v1/settings/policies', { method: 'POST', body: JSON.stringify(polForm) });
    setPolForm({ ...polForm, title: '', requiredDocuments: '', reportingRequirements: '' });
    load();
  };

  return (
    <div className="space-y-6 text-xs">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* School Categories Management */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
          <h3 className="font-display text-sm font-bold">School Categories Configuration</h3>
          <form onSubmit={addCategory} className="flex gap-2">
            <input required value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="New Category Name..." className="flex-1 px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            <select value={catType} onChange={(e) => setCatType(e.target.value as SchoolType)} className="px-2.5 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
              <option value={SchoolType.GOVERNMENT}>GOVERNMENT</option>
              <option value={SchoolType.PRIVATE}>PRIVATE</option>
            </select>
            <button type="submit" className="px-3 py-2 rounded bg-blue-700 text-white font-semibold">Add</button>
          </form>
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {meta.schoolCategories.map((c: any) => (
              <div key={c.id} className="py-2 flex items-center justify-between gap-2">
                <div>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-slate-400 ml-2">({c.schoolType})</span>
                </div>
                <button type="button" onClick={() => toggleCategory(c)} className={`px-2 py-0.5 rounded border ${c.isActive ? 'border-emerald-300 text-emerald-700 dark:text-emerald-300' : 'border-slate-300 text-slate-400'}`}>
                  {c.isActive ? 'Active' : 'Disabled'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Ownership-Specific Administrative Policies */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
          <h3 className="font-display text-sm font-bold">Ownership-Specific Administrative Policies</h3>
          <form onSubmit={addPolicy} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input required placeholder="Policy Title" value={polForm.title} onChange={(e) => setPolForm({ ...polForm, title: e.target.value })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              <select value={polForm.schoolType} onChange={(e) => setPolForm({ ...polForm, schoolType: e.target.value as SchoolType })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                <option value={SchoolType.GOVERNMENT}>GOVERNMENT</option>
                <option value={SchoolType.PRIVATE}>PRIVATE</option>
              </select>
            </div>
            <input placeholder="Required Documents (comma separated)" value={polForm.requiredDocuments} onChange={(e) => setPolForm({ ...polForm, requiredDocuments: e.target.value })} className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            <input placeholder="Reporting Requirements" value={polForm.reportingRequirements} onChange={(e) => setPolForm({ ...polForm, reportingRequirements: e.target.value })} className="w-full px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            <button type="submit" className="px-4 py-1.5 rounded bg-blue-700 text-white font-semibold">Add Policy</button>
          </form>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {meta.ownershipPolicies.map((p: any) => (
              <div key={p.id} className="p-3 rounded bg-slate-50 dark:bg-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{p.title}</span>
                  <OwnershipBadge schoolType={p.schoolType} />
                </div>
                <div className="text-slate-500">Required: {(p.requiredDocuments || []).join(', ')}</div>
                <div className="text-slate-600 dark:text-slate-300">{p.reportingRequirements}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Immutable Audit Logs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          <h3 className="font-display text-sm font-bold">Immutable Security & Governance Audit Logs</h3>
        </div>
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Resource</th>
                <th className="px-3 py-2">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {auditLogs.map((l) => (
                <tr key={l._id}>
                  <td className="px-3 py-2 font-mono tabular-nums">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2">{l.userName} ({l.role})</td>
                  <td className="px-3 py-2 font-mono font-semibold">{l.action}</td>
                  <td className="px-3 py-2">{l.targetResource} {l.targetId ? `#${l.targetId.slice(-6)}` : ''}</td>
                  <td className="px-3 py-2 font-mono tabular-nums">{l.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
