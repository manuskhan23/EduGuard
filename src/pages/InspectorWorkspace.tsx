import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  School,
  CheckSquare,
  FileSearch,
  Upload,
  FileSpreadsheet,
  Bell,
  User,
} from 'lucide-react';
import { apiFetch, useAuth } from '../context/AuthContext';
import { NavItem, PortalShell } from '../components/layout/PortalShell';
import { EmptyState, OwnershipBadge, StatusBadge } from '../components/ui/Badges';
import { FileUploadField, UploadedDocItem } from '../components/ui/ThemeAndUpload';
import { UserRole } from '../../server/types';

export function InspectorWorkspace() {
  const { user } = useAuth();
  const isLeader = user?.role === UserRole.GROUP_LEADER;
  const [activeTab, setActiveTab] = useState('dashboard');
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const [taskForm, setTaskForm] = useState({ title: '', description: '', assignedTo: user?._id || '', dueDate: '' });
  const [findingForm, setFindingForm] = useState({
    title: '',
    observations: '',
    severity: 'MODERATE',
    notes: '',
    photos: [] as string[],
    documents: [] as UploadedDocItem[],
  });
  const [reportForm, setReportForm] = useState({
    detailedFindings: '',
    violations: '',
    riskAssessment: 'MODERATE',
    recommendations: '',
    correctiveActionRequirements: '',
    finalConclusion: '',
  });

  const loadAll = async () => {
    try {
      const [gData, rData, nData] = await Promise.all([
        apiFetch('/api/v1/inspection-groups'),
        apiFetch('/api/v1/inspection-reports'),
        apiFetch('/api/v1/notifications'),
      ]);
      setGroups(gData.items || []);
      setReports(rData.items || []);
      setNotifications(nData.items || []);
      if (gData.items?.length && !selectedGroup) {
        openGroup(gData.items[0]._id);
      } else if (selectedGroup) {
        openGroup(selectedGroup);
      }
    } catch {
      // ignore
    }
  };

  const openGroup = async (id: string) => {
    setSelectedGroup(id);
    const d = await apiFetch(`/api/v1/inspection-groups/${id}`);
    setDetail(d);
    if (d.report) {
      setReportForm({
        detailedFindings: d.report.detailedFindings || '',
        violations: (d.report.violations || []).join(', '),
        riskAssessment: d.report.riskAssessment || 'MODERATE',
        recommendations: d.report.recommendations || '',
        correctiveActionRequirements: d.report.correctiveActionRequirements || '',
        finalConclusion: d.report.finalConclusion || '',
      });
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'groups', label: 'My Inspection Groups', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'schools', label: 'Assigned Schools', icon: <School className="w-4 h-4" /> },
    { id: 'tasks', label: 'Investigation Tasks', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'findings', label: 'Findings', icon: <FileSearch className="w-4 h-4" /> },
    { id: 'evidence', label: 'Evidence Uploads', icon: <Upload className="w-4 h-4" /> },
    { id: 'reports', label: 'Inspection Reports', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  ];

  const runAction = async (fn: () => Promise<any>, text: string) => {
    setMsg('');
    setErr('');
    try {
      await fn();
      setMsg(text);
      await loadAll();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <PortalShell
      navItems={navItems}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      title={isLeader ? 'Inspection Group Leader Portal' : 'Field Inspector Portal'}
      subtitle={user?.fullName}
    >
      <div className="space-y-5 text-xs">
        {msg && <div className="p-3 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">{msg}</div>}
        {err && <div className="p-3 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">{err}</div>}

        {groups.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex flex-wrap items-center gap-3">
            <span className="font-semibold">Active Assigned Inspection Group:</span>
            <select value={selectedGroup || ''} onChange={(e) => openGroup(e.target.value)} className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
              {groups.map((g) => (
                <option key={g._id} value={g._id}>
                  {g.inspectionId} — {g.groupName} ({g.school?.name}) [{g.status}]
                </option>
              ))}
            </select>
            {detail?.group && <StatusBadge status={detail.group.status} />}
            {detail?.school && <OwnershipBadge schoolType={detail.school.schoolType} />}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
                <div className="text-xs text-slate-500">Assigned Groups</div>
                <div className="font-mono text-2xl font-bold mt-1.5 tabular-nums">{groups.length}</div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
                <div className="text-xs text-slate-500">Group Tasks</div>
                <div className="font-mono text-2xl font-bold mt-1.5 tabular-nums">{detail?.tasks?.length || 0}</div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
                <div className="text-xs text-slate-500">Findings Logged</div>
                <div className="font-mono text-2xl font-bold mt-1.5 tabular-nums">{detail?.findings?.length || 0}</div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
                <div className="text-xs text-slate-500">Submitted Reports</div>
                <div className="font-mono text-2xl font-bold mt-1.5 tabular-nums">{reports.length}</div>
              </div>
            </div>

            {!detail?.group ? (
              <EmptyState
                title="No inspection groups assigned"
                description="Inspection assignments created by the Super Admin will appear here once dispatched to your team."
              />
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <div className="font-mono text-xs text-slate-500">{detail.group.inspectionId}</div>
                    <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">{detail.group.groupName}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {detail.school && <OwnershipBadge schoolType={detail.school.schoolType} />}
                    <StatusBadge status={detail.group.status} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="text-slate-500">Target School</div>
                    <div className="font-semibold mt-0.5">{detail.school?.name}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Inspection Type</div>
                    <div className="font-semibold mt-0.5">{detail.group.inspectionType}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Deadline</div>
                    <div className="font-mono font-semibold mt-0.5 tabular-nums">
                      {detail.group.deadline ? new Date(detail.group.deadline).toLocaleDateString() : '—'}
                    </div>
                  </div>
                </div>
                {detail.group.instructions && (
                  <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/70">
                    <strong>Admin Instructions:</strong> {detail.group.instructions}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button type="button" onClick={() => setActiveTab('tasks')} className="px-3.5 py-2 rounded bg-blue-700 text-white font-semibold">Manage Tasks</button>
                  <button type="button" onClick={() => setActiveTab('findings')} className="px-3.5 py-2 rounded border border-slate-200 dark:border-slate-700 font-medium">Log Field Findings</button>
                  <button type="button" onClick={() => setActiveTab('reports')} className="px-3.5 py-2 rounded border border-slate-200 dark:border-slate-700 font-medium">Final Report</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="space-y-3">
            {groups.length === 0 ? <EmptyState title="No assigned groups" description="You can only access inspection groups assigned by the Super Admin." /> : groups.map((g) => (
              <div key={g._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-semibold">{g.inspectionId}</span> · <strong>{g.groupName}</strong>
                  </div>
                  <div className="flex gap-2"><OwnershipBadge schoolType={g.schoolType} /><StatusBadge status={g.status} /></div>
                </div>
                <p className="text-slate-600 dark:text-slate-300">Target School: {g.school?.name} ({g.district}) · Reason: {g.reason}</p>
                {g.instructions && <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800"><strong>Admin Instructions:</strong> {g.instructions}</div>}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'schools' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-2">
            {!detail?.school ? <EmptyState title="No target school selected" description="Select an inspection group above." /> : (
              <>
                <div className="flex items-center gap-2"><h3 className="font-display text-base font-bold">{detail.school.name}</h3><OwnershipBadge schoolType={detail.school.schoolType} /></div>
                <p>Reg #: <span className="font-mono">{detail.school.registrationNumber}</span> · Category: {detail.school.schoolCategory}</p>
                <p>Address: {detail.school.address}, {detail.school.city}, {detail.school.district}, {detail.school.province}</p>
                <p>Principal: {detail.school.principalName} · Contact: {detail.school.contactNumber}</p>
              </>
            )}
          </div>
        )}

        {activeTab === 'tasks' && detail && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
            <h3 className="font-display text-sm font-bold">Investigation Tasks</h3>
            {isLeader && (
              <form onSubmit={(e) => { e.preventDefault(); runAction(() => apiFetch('/api/v1/inspection-tasks', { method: 'POST', body: JSON.stringify({ ...taskForm, groupId: detail.group._id }) }), 'Task assigned.'); setTaskForm({ ...taskForm, title: '', description: '' }); }} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input required placeholder="Task Title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
                <input placeholder="Details" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
                <select value={taskForm.assignedTo} onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })} className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                  {(detail.members || []).map((m: any) => <option key={m.inspectorId} value={m.inspectorId}>{m.inspector?.fullName}</option>)}
                </select>
                <button type="submit" className="px-3 py-1.5 rounded bg-blue-700 text-white font-semibold">Assign Task</button>
              </form>
            )}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {(detail.tasks || []).map((t: any) => (
                <div key={t._id} className="py-2.5 flex items-center justify-between gap-3">
                  <div><div className="font-semibold">{t.title}</div><div className="text-slate-500">{t.description}</div></div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={t.status} />
                    {t.status !== 'COMPLETED' && (
                      <button type="button" onClick={() => runAction(() => apiFetch(`/api/v1/inspection-tasks/${t._id}`, { method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED' }) }), 'Task marked complete.')} className="px-2.5 py-1 rounded bg-emerald-600 text-white">Complete</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(activeTab === 'findings' || activeTab === 'evidence') && detail && (
          <div className="space-y-4">
            <form onSubmit={(e) => { e.preventDefault(); runAction(() => apiFetch('/api/v1/inspection-findings', { method: 'POST', body: JSON.stringify({ ...findingForm, groupId: detail.group._id }) }), 'Finding & evidence submitted.'); setFindingForm({ title: '', observations: '', severity: 'MODERATE', notes: '', photos: [], documents: [] }); }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
              <h3 className="font-display text-sm font-bold">Record Observation & Upload Evidence</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input required placeholder="Finding Title" value={findingForm.title} onChange={(e) => setFindingForm({ ...findingForm, title: e.target.value })} className="sm:col-span-2 px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
                <select value={findingForm.severity} onChange={(e) => setFindingForm({ ...findingForm, severity: e.target.value })} className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                  <option value="LOW">LOW</option><option value="MODERATE">MODERATE</option><option value="HIGH">HIGH</option><option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
              <textarea required rows={3} placeholder="Detailed field observations..." value={findingForm.observations} onChange={(e) => setFindingForm({ ...findingForm, observations: e.target.value })} className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
              <div className="flex flex-wrap gap-2">
                <FileUploadField label="Evidence Photo / Document" onUploaded={(d) => setFindingForm((f) => ({ ...f, documents: [...f.documents, d] }))} />
              </div>
              <button type="submit" className="px-4 py-2 rounded bg-blue-700 text-white font-semibold">Submit Individual Finding</button>
            </form>

            <div className="space-y-2">
              {(detail.findings || []).map((f: any) => (
                <div key={f._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm">{f.title} — by {f.inspectorName}</span>
                    <div className="flex gap-2"><StatusBadge status={f.severity} /><StatusBadge status={f.evidenceStatus} /></div>
                  </div>
                  <p>{f.observations}</p>
                  {isLeader && (
                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => runAction(() => apiFetch(`/api/v1/inspection-findings/${f._id}/review`, { method: 'PATCH', body: JSON.stringify({ evidenceStatus: 'ACCEPTED' }) }), 'Finding accepted.')} className="px-2.5 py-1 rounded bg-emerald-600 text-white">Accept Finding</button>
                      <button type="button" onClick={() => runAction(() => apiFetch(`/api/v1/inspection-findings/${f._id}/review`, { method: 'PATCH', body: JSON.stringify({ evidenceStatus: 'MORE_EVIDENCE_REQUESTED', leaderFeedback: 'Please attach photographic proof.' }) }), 'Additional evidence requested.')} className="px-2.5 py-1 rounded bg-amber-600 text-white">Request More Evidence</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reports' && detail && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
            <h3 className="font-display text-sm font-bold">
              {isLeader ? 'Prepare & Submit Final Inspection Report to Super Admin' : 'Inspection Group Final Reports'}
            </h3>
            {isLeader && !['CLOSED', 'COMPLETED'].includes(detail.group.status) && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runAction(
                    () =>
                      apiFetch('/api/v1/inspection-reports', {
                        method: 'POST',
                        body: JSON.stringify({
                          groupId: detail.group._id,
                          ...reportForm,
                          violations: reportForm.violations.split(',').map((s) => s.trim()).filter(Boolean),
                        }),
                      }),
                    'Final report submitted to Super Admin (Status: REPORT_SUBMITTED).'
                  );
                }}
                className="space-y-3"
              >
                <textarea required rows={3} placeholder="Detailed Findings Summary *" value={reportForm.detailedFindings} onChange={(e) => setReportForm({ ...reportForm, detailedFindings: e.target.value })} className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input placeholder="Violations (comma separated)" value={reportForm.violations} onChange={(e) => setReportForm({ ...reportForm, violations: e.target.value })} className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
                  <select value={reportForm.riskAssessment} onChange={(e) => setReportForm({ ...reportForm, riskAssessment: e.target.value })} className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                    <option value="LOW">LOW RISK</option><option value="MODERATE">MODERATE RISK</option><option value="HIGH">HIGH RISK</option><option value="CRITICAL">CRITICAL RISK</option>
                  </select>
                </div>
                <textarea required rows={2} placeholder="Recommendations *" value={reportForm.recommendations} onChange={(e) => setReportForm({ ...reportForm, recommendations: e.target.value })} className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
                <input placeholder="Corrective Action Requirements" value={reportForm.correctiveActionRequirements} onChange={(e) => setReportForm({ ...reportForm, correctiveActionRequirements: e.target.value })} className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
                <textarea required rows={2} placeholder="Final Conclusion *" value={reportForm.finalConclusion} onChange={(e) => setReportForm({ ...reportForm, finalConclusion: e.target.value })} className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
                <button type="submit" className="px-5 py-2.5 rounded bg-blue-700 text-white font-semibold">Submit Final Report to Super Admin</button>
              </form>
            )}

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              {reports.map((r) => (
                <div key={r._id} className="p-3 rounded bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{r.group?.inspectionId} — {r.school?.name}</div>
                    <div className="text-slate-500">{r.finalConclusion}</div>
                  </div>
                  <StatusBadge status={r.adminStatus} />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map((n) => (
              <div key={n._id} className="p-4"><div className="font-semibold">{n.title}</div><div className="text-slate-500">{n.message}</div></div>
            ))}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-2">
            <h3 className="font-display text-sm font-bold">Inspector Profile</h3>
            <p>Name: {user?.fullName}</p>
            <p>Email: {user?.email}</p>
            <p>Role: {user?.role}</p>
            <p>Specialization: {user?.specialization || 'General Compliance'}</p>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
