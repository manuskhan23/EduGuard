import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Eye,
  CheckCircle2,
  XCircle,
  MessageSquarePlus,
  ShieldCheck,
  ShieldOff,
  Ban,
  RotateCcw,
  Download,
  Printer,
  FileText,
  X,
} from 'lucide-react';
import { apiFetch } from '../../context/AuthContext';
import {
  EmptyState,
  OwnershipBadge,
  StatusBadge,
  TableSkeleton,
  VerificationBadge,
} from '../../components/ui/Badges';
import { DocumentPreviewModal, UploadedDocItem } from '../../components/ui/ThemeAndUpload';
import { SchoolType } from '../../../server/types';

const CHART_COLORS = ['#1d4ed8', '#0d9488', '#d97706', '#dc2626', '#475569'];

export function SuperAdminOverviewAndAnalytics({
  mode = 'overview',
  onNavigate,
}: {
  mode?: 'overview' | 'analytics';
  onNavigate?: (tab: string) => void;
}) {
  const [data, setData] = useState<any>(null);
  const [meta, setMeta] = useState<any>({ provinces: [], districts: [], schoolCategories: [] });
  const [loading, setLoading] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [chartTab, setChartTab] = useState<'schools' | 'complaints' | 'inspections' | 'trends' | 'all'>('schools');
  const [filters, setFilters] = useState({
    schoolType: 'ALL',
    province: 'ALL',
    district: 'ALL',
    city: '',
    schoolCategory: 'ALL',
    registrationStatus: 'ALL',
    verificationStatus: 'ALL',
    dateFrom: '',
    dateTo: '',
  });
  const [reportType, setReportType] = useState('SCHOOLS');
  const [generatedReport, setGeneratedReport] = useState<any>(null);

  useEffect(() => {
    apiFetch('/api/v1/settings/metadata').then(setMeta).catch(() => {});
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v && v !== 'ALL') qs.set(k, v);
      });
      const res = await apiFetch(`/api/v1/analytics/dashboard?${qs.toString()}`);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [filters]);

  const generateReport = async () => {
    const qs = new URLSearchParams({ reportType });
    if (filters.schoolType !== 'ALL') qs.set('schoolType', filters.schoolType);
    if (filters.province !== 'ALL') qs.set('province', filters.province);
    if (filters.district !== 'ALL') qs.set('district', filters.district);
    const rep = await apiFetch(`/api/v1/reports/generate?${qs.toString()}`);
    setGeneratedReport(rep);
  };

  const downloadCsv = async () => {
    const token = localStorage.getItem('eduguard_access_token');
    const res = await fetch(`/api/v1/reports/export.csv?reportType=${reportType}&schoolType=${filters.schoolType}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eduguard-${reportType.toLowerCase()}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () =>
    setFilters({
      schoolType: 'ALL',
      province: 'ALL',
      district: 'ALL',
      city: '',
      schoolCategory: 'ALL',
      registrationStatus: 'ALL',
      verificationStatus: 'ALL',
      dateFrom: '',
      dateTo: '',
    });

  const g = data?.globalStats;
  const gov = data?.comparison?.government;
  const prv = data?.comparison?.private;
  const c = data?.charts;
  const hasSchoolData = (g?.totalSchools || 0) > 0;

  if (loading || !data) {
    return <TableSkeleton rows={5} />;
  }

  // =====================================
  // CLEAN EXECUTIVE OVERVIEW MODE
  // =====================================
  if (mode === 'overview') {
    return (
      <div className="space-y-6">
        {/* 4 Focused Primary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Registered Schools</div>
            <div className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1.5">
              {g.totalSchools}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 tabular-nums">
              Gov: {g.totalGovernmentSchools} · Private: {g.totalPrivateSchools}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate?.('applications')}
            className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 rounded-lg p-5 transition-colors"
          >
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Applications</div>
            <div className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1.5">
              {g.totalPendingApplications}
            </div>
            <div className="text-[11px] text-blue-700 dark:text-blue-400 mt-1.5 tabular-nums">
              Approved: {g.totalApprovedSchools} · Review queue →
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.('verification')}
            className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 rounded-lg p-5 transition-colors"
          >
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Verification Status</div>
            <div className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1.5">
              {g.totalVerifiedSchools} <span className="text-sm font-normal text-slate-400">verified</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 tabular-nums">
              Unverified: {g.totalUnverifiedSchools} · Suspended: {g.totalSuspendedSchools}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.('inspection_groups')}
            className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 rounded-lg p-5 transition-colors"
          >
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Oversight</div>
            <div className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1.5">
              {g.totalComplaints + g.totalActiveInspectionGroups}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 tabular-nums">
              Complaints: {g.totalComplaints} · Active Inspections: {g.totalActiveInspectionGroups}
            </div>
          </button>
        </div>

        {/* Clean Structured Comparison Table + System Population Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                Government vs Private Sector Summary
              </h3>
              <button
                type="button"
                onClick={() => onNavigate?.('analytics')}
                className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
              >
                Full Analytics →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="px-5 py-2.5 font-semibold">Metric</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Government Schools</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Private Schools</th>
                    <th className="px-5 py-2.5 font-semibold text-right">Combined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                  {[
                    ['Registered Schools', gov.totalRegistered, prv.totalRegistered],
                    ['Approved Schools', gov.approved, prv.approved],
                    ['Pending Review', gov.pending, prv.pending],
                    ['Verified by Department', gov.verified, prv.verified],
                    ['Unverified / Suspended', gov.unverified + gov.suspended, prv.unverified + prv.suspended],
                    ['Enrolled Students', gov.students, prv.students],
                    ['Faculty / Teachers', gov.teachers, prv.teachers],
                    ['Complaints Logged', gov.complaints, prv.complaints],
                    ['Completed Inspections', gov.completedInspections, prv.completedInspections],
                  ].map(([label, govVal, prvVal]) => (
                    <tr key={String(label)} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-2.5 font-medium text-slate-700 dark:text-slate-200">{label}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-900 dark:text-white">{govVal}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-900 dark:text-white">{prvVal}</td>
                      <td className="px-5 py-2.5 text-right font-mono font-semibold text-slate-900 dark:text-white">
                        {Number(govVal) + Number(prvVal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">Department Quick Actions</h3>
              <div className="space-y-2 text-xs">
                <button
                  type="button"
                  onClick={() => onNavigate?.('applications')}
                  className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between font-medium"
                >
                  <span>Review School Applications</span>
                  <span className="font-mono text-slate-500">{g.totalPendingApplications}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.('verification')}
                  className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between font-medium"
                >
                  <span>Manage School Verification</span>
                  <span className="font-mono text-slate-500">{g.totalUnverifiedSchools}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.('complaints')}
                  className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between font-medium"
                >
                  <span>Investigate Parent Complaints</span>
                  <span className="font-mono text-slate-500">{g.totalComplaints}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.('inspection_groups')}
                  className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between font-medium"
                >
                  <span>Dispatch Inspection Groups</span>
                  <span className="font-mono text-slate-500">{g.totalActiveInspectionGroups}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.('users')}
                  className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between font-medium"
                >
                  <span>Registered Parents & Users</span>
                  <span className="font-mono text-slate-500">{g.totalParents}</span>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
              Total Students: <strong className="font-mono text-slate-800 dark:text-slate-200">{g.totalStudents}</strong> · Total Teachers:{' '}
              <strong className="font-mono text-slate-800 dark:text-slate-200">{g.totalTeachers}</strong>
            </div>
          </div>
        </div>

        {/* Executive Visual Snapshot (Only render charts when schools exist) */}
        {!hasSchoolData ? (
          <EmptyState
            title="No schools registered yet"
            description="Once Government or Private schools submit registrations, ownership distributions and verification charts will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Government vs Private School Distribution">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={c.schoolDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={78} label>
                    {c.schoolDistribution.map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Verification Status by Ownership">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={c.verificationBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="government" name="Government" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="private" name="Private" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}
      </div>
    );
  }

  // =====================================
  // ANALYTICS & REPORT WORKBENCH MODE
  // =====================================
  return (
    <div className="space-y-6">
      {/* Clean Filter Bar with Progressive Disclosure */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs flex-1 min-w-[260px]">
            <select value={filters.schoolType} onChange={(e) => setFilters({ ...filters, schoolType: e.target.value })} className="px-2.5 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
              <option value="ALL">All Ownership</option>
              <option value="GOVERNMENT">Government</option>
              <option value="PRIVATE">Private</option>
            </select>
            <select value={filters.province} onChange={(e) => setFilters({ ...filters, province: e.target.value, district: 'ALL' })} className="px-2.5 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
              <option value="ALL">All Provinces</option>
              {meta.provinces.map((p: any) => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
            <select value={filters.district} onChange={(e) => setFilters({ ...filters, district: e.target.value })} className="px-2.5 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
              <option value="ALL">All Districts</option>
              {meta.districts.filter((d: any) => filters.province === 'ALL' || d.province === filters.province).map((d: any) => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
            <select value={filters.verificationStatus} onChange={(e) => setFilters({ ...filters, verificationStatus: e.target.value })} className="px-2.5 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
              <option value="ALL">All Verification</option>
              <option value="VERIFIED">Verified</option>
              <option value="UNVERIFIED">Unverified</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
          <div className="flex items-center gap-3 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters((v) => !v)}
              className="px-3 py-2 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
            >
              {showAdvancedFilters ? 'Hide Filters' : 'More Filters'}
            </button>
            <button type="button" onClick={resetFilters} className="text-blue-700 dark:text-blue-400 hover:underline">
              Reset
            </button>
          </div>
        </div>

        {showAdvancedFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            <input value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} placeholder="City..." className="px-2.5 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            <select value={filters.schoolCategory} onChange={(e) => setFilters({ ...filters, schoolCategory: e.target.value })} className="px-2.5 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
              <option value="ALL">All Categories</option>
              {meta.schoolCategories.map((cat: any) => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
            </select>
            <select value={filters.registrationStatus} onChange={(e) => setFilters({ ...filters, registrationStatus: e.target.value })} className="px-2.5 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
              <option value="ALL">All Reg Status</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="MORE_INFORMATION_REQUIRED">More Info Req</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} title="From date" className="px-2.5 py-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
          </div>
        )}
      </div>

      {/* Compact 4-Card Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <div className="text-[11px] text-slate-500">Filtered Schools</div>
          <div className="font-mono text-2xl font-bold tabular-nums mt-1">{g.totalSchools}</div>
          <div className="text-[11px] text-slate-500 mt-1 tabular-nums">Gov {g.totalGovernmentSchools} · Private {g.totalPrivateSchools}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <div className="text-[11px] text-slate-500">Students & Faculty</div>
          <div className="font-mono text-2xl font-bold tabular-nums mt-1">{g.totalStudents}</div>
          <div className="text-[11px] text-slate-500 mt-1 tabular-nums">Teachers: {g.totalTeachers} · Parents: {g.totalParents}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <div className="text-[11px] text-slate-500">Applications & Verification</div>
          <div className="font-mono text-2xl font-bold tabular-nums mt-1">{g.totalVerifiedSchools} <span className="text-xs font-normal text-slate-400">verified</span></div>
          <div className="text-[11px] text-slate-500 mt-1 tabular-nums">Pending: {g.totalPendingApplications} · Rejected: {g.totalRejectedApplications}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <div className="text-[11px] text-slate-500">Complaints & Inspections</div>
          <div className="font-mono text-2xl font-bold tabular-nums mt-1">{g.totalComplaints}</div>
          <div className="text-[11px] text-slate-500 mt-1 tabular-nums">Active Insp: {g.totalActiveInspectionGroups} · Suspended: {g.totalSuspendedSchools}</div>
        </div>
      </div>

      {/* Tabbed Chart Explorer instead of 10-chart scroll wall */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 no-print">
          {[
            ['schools', 'Schools & Enrollment'],
            ['complaints', 'Complaints & Resolution'],
            ['inspections', 'Inspections & Compliance'],
            ['trends', 'Districts & Monthly Trends'],
            ['all', 'View All 10 Charts'],
          ].map(([id, lbl]) => (
            <button
              key={id}
              type="button"
              onClick={() => setChartTab(id as any)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                chartTab === id
                  ? 'bg-blue-700 text-white'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>

        {!hasSchoolData ? (
          <EmptyState
            title="No matching analytics records"
            description="Adjust the filters above or register Government and Private schools to view comparative charts."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {(chartTab === 'schools' || chartTab === 'all') && (
              <>
                <ChartCard title="1. Government vs Private School Distribution">
                  <ResponsiveContainer width="100%" height={230}>
                    <PieChart>
                      <Pie data={c.schoolDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={78} label>
                        {c.schoolDistribution.map((_: any, i: number) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="2. Student Enrollment by Ownership">
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={c.studentEnrollment}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="students" name="Students" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="3. Teacher Distribution by Ownership">
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={c.studentEnrollment}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="teachers" name="Teachers" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="4. Verification Breakdown by Ownership">
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={c.verificationBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="government" name="Government" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="private" name="Private" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </>
            )}

            {(chartTab === 'complaints' || chartTab === 'all') && (
              <>
                <ChartCard title="5. Complaint Trends by Status & Ownership">
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={c.complaintTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                      <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="government" name="Government" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="private" name="Private" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="6. Complaint Resolution Rates (%)">
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={c.complaintResolutionRates}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="rate" name="Resolution Rate %" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </>
            )}

            {(chartTab === 'inspections' || chartTab === 'all') && (
              <>
                <ChartCard title="7. Inspection Statistics (Active vs Completed)">
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={c.inspectionStatistics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="active" name="Active" fill="#d97706" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" name="Completed" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="8. Inspection Completion Rates (%)">
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={c.inspectionCompletionRates}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="rate" name="Completion Rate %" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </>
            )}

            {(chartTab === 'trends' || chartTab === 'all') && (
              <>
                <ChartCard title="9. District-Wise School Distribution">
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={c.districtDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                      <XAxis dataKey="district" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="government" name="Government" stackId="a" fill="#1d4ed8" />
                      <Bar dataKey="private" name="Private" stackId="a" fill="#0d9488" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="10. Monthly Registration Trends">
                  <ResponsiveContainer width="100%" height={230}>
                    <LineChart data={c.monthlyRegistrations}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="government" name="Government" stroke="#1d4ed8" strokeWidth={2} />
                      <Line type="monotone" dataKey="private" name="Private" stroke="#0d9488" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              </>
            )}
          </div>
        )}
      </div>

      {/* Reporting & Export Module */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Official Department Report Generator
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generate filtered institutional reports and export as CSV or printable PDF.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 no-print">
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="SCHOOLS">Schools Registry Report</option>
              <option value="COMPLAINTS">Complaints Report</option>
              <option value="INSPECTIONS">Inspections Report</option>
            </select>
            <button
              type="button"
              onClick={generateReport}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md bg-blue-700 hover:bg-blue-800 text-white"
            >
              <FileText className="w-3.5 h-3.5" /> Generate Report
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </button>
          </div>
        </div>

        {generatedReport && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">{generatedReport.title}</span>
              <span className="text-slate-500 tabular-nums">
                Generated {new Date(generatedReport.generatedAt).toLocaleString()} · {generatedReport.rows?.length || 0} records
              </span>
            </div>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="px-3 py-2">Identifier</th>
                    <th className="px-3 py-2">Ownership</th>
                    <th className="px-3 py-2">District</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(generatedReport.rows || []).slice(0, 20).map((row: any) => (
                    <tr key={row._id}>
                      <td className="px-3 py-2 font-medium">{row.name || row.complaintNumber || row.inspectionId}</td>
                      <td className="px-3 py-2">{row.schoolType}</td>
                      <td className="px-3 py-2">{row.district}</td>
                      <td className="px-3 py-2">{row.registrationStatus || row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
      <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">{title}</h3>
      {children}
    </div>
  );
}

// ======================================================
// SCHOOL REGISTRATION MANAGEMENT
// ======================================================
export function SchoolRegistrationManagement() {
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [remarks, setRemarks] = useState('');
  const [noteText, setNoteText] = useState('');
  const [previewDoc, setPreviewDoc] = useState<UploadedDocItem | null>(null);
  const [feedback, setFeedback] = useState('');

  const loadList = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/v1/school-applications?tab=${tab}&q=${encodeURIComponent(q)}`);
      setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, [tab]);

  const openDetail = async (id: string) => {
    setSelectedId(id);
    setFeedback('');
    const d = await apiFetch(`/api/v1/school-applications/${id}`);
    setDetail(d);
    setRemarks(d.application?.adminRemarks || '');
  };

  const takeDecision = async (decision: string) => {
    if (!selectedId) return;
    setFeedback('');
    try {
      await apiFetch(`/api/v1/school-applications/${selectedId}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision, remarks }),
      });
      await openDetail(selectedId);
      await loadList();
      setFeedback(`Application decision "${decision}" recorded.`);
    } catch (err) {
      setFeedback((err as Error).message);
    }
  };

  const addNote = async () => {
    if (!selectedId || !noteText.trim()) return;
    await apiFetch(`/api/v1/school-applications/${selectedId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note: noteText }),
    });
    setNoteText('');
    openDetail(selectedId);
  };

  const TABS = [
    { id: 'all', label: 'All Applications' },
    { id: 'government', label: 'Government Schools' },
    { id: 'private', label: 'Private Schools' },
    { id: 'pending', label: 'Pending' },
    { id: 'under_review', label: 'Under Review' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'more_info', label: 'Additional Information Required' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadList();
          }}
          className="flex gap-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by school name, registration number, district, or representative..."
            className="flex-1 px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
          />
          <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-md bg-slate-900 dark:bg-blue-700 text-white">
            Filter
          </button>
        </form>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : items.length === 0 ? (
        <EmptyState title="No school applications in this tab" description="Applications matching the selected status or ownership filter will appear here." />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Ownership</th>
                <th className="px-4 py-3">Reg #</th>
                <th className="px-4 py-3">Representative / Owner</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Applied</th>
                <th className="px-4 py-3">Reg. Status</th>
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((row) => (
                <tr key={row._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={row.school?.logo || '/src/assets/images/gov_school_emblem_1794737229739.jpg'}
                        alt={row.school?.name || 'School'}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded object-cover border border-slate-200 dark:border-slate-700 bg-white shrink-0"
                      />
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{row.school?.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <OwnershipBadge schoolType={row.schoolType} />
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums">{row.school?.registrationNumber}</td>
                  <td className="px-4 py-3">{row.applicant?.fullName}</td>
                  <td className="px-4 py-3">
                    {row.school?.district}, {row.school?.province}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{new Date(row.submittedAt || row.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3">
                    <VerificationBadge status={row.school?.verificationStatus || 'UNVERIFIED'} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openDetail(row._id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Eye className="w-3.5 h-3.5" /> Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Application Details Modal */}
      {selectedId && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">{detail.school?.name}</h3>
                <OwnershipBadge schoolType={detail.school?.schoolType} />
                <StatusBadge status={detail.application?.status} />
                <VerificationBadge status={detail.school?.verificationStatus} />
              </div>
              <button type="button" onClick={() => setSelectedId(null)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs">
              {feedback && (
                <div className="p-3 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200">
                  {feedback}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Institution Details</h4>
                  <p>Category: {detail.school?.schoolCategory}</p>
                  <p>Registration #: <span className="font-mono">{detail.school?.registrationNumber}</span></p>
                  {detail.school?.schoolCode && <p>School Code: <span className="font-mono">{detail.school?.schoolCode}</span></p>}
                  {detail.school?.emisCode && <p>EMIS Code: <span className="font-mono">{detail.school?.emisCode}</span></p>}
                  <p>Education Levels: {(detail.school?.educationLevels || []).join(', ')}</p>
                  <p>Address: {detail.school?.address}, {detail.school?.city}, {detail.school?.district}, {detail.school?.province}</p>
                  {detail.school?.educationDepartment && <p>Department: {detail.school?.educationDepartment}</p>}
                  {detail.school?.departmentReferenceNumber && <p>Dept Ref #: {detail.school?.departmentReferenceNumber}</p>}
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Authorized Representative / Owner</h4>
                  <p>Name: {detail.applicant?.fullName}</p>
                  <p>Email: {detail.applicant?.email}</p>
                  <p>Phone: {detail.applicant?.phone}</p>
                  <p>Designation: {detail.applicant?.designation}</p>
                  {detail.applicant?.employeeId && <p>Employee ID: <span className="font-mono">{detail.applicant?.employeeId}</span></p>}
                  {detail.applicant?.cnicOrReference && <p>CNIC / Ref: <span className="font-mono">{detail.applicant?.cnicOrReference}</span></p>}
                </div>
              </div>

              {/* Inline Document Preview Section */}
              <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                  Supporting Documents (Inline Preview — No Download Required)
                </h4>
                {detail.documents?.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {detail.documents.map((doc: any) => (
                      <div key={doc._id} className="p-3 rounded-md border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{doc.title}</div>
                          <div className="text-[11px] text-slate-500">{doc.documentType} · {doc.mimeType}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-blue-700 text-white font-medium shrink-0"
                        >
                          <Eye className="w-3.5 h-3.5" /> Inspect
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">No documents attached to this submission.</p>
                )}
              </div>

              {/* Decision Controls */}
              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Administrative Decision</h4>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter official remarks, rejection reason, or requested additional documentation..."
                  className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => takeDecision('APPROVE')} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve Application
                  </button>
                  <button type="button" onClick={() => takeDecision('UNDER_REVIEW')} className="px-3.5 py-2 rounded-md bg-blue-700 hover:bg-blue-800 text-white font-semibold">
                    Mark Under Review
                  </button>
                  <button type="button" onClick={() => takeDecision('REQUEST_INFO')} className="px-3.5 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                    Request Additional Info
                  </button>
                  <button type="button" onClick={() => takeDecision('KEEP_PENDING')} className="px-3.5 py-2 rounded-md border border-slate-300 dark:border-slate-700 font-medium">
                    Keep Pending
                  </button>
                  <button type="button" onClick={() => takeDecision('REJECT')} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold">
                    <XCircle className="w-3.5 h-3.5" /> Reject Application
                  </button>
                </div>
              </div>

              {/* Internal Admin Notes & History */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Internal Department Notes</h4>
                  <div className="flex gap-2">
                    <input
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Add confidential internal note..."
                      className="flex-1 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                    <button type="button" onClick={addNote} className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-slate-900 dark:bg-slate-700 text-white font-medium">
                      <MessageSquarePlus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {(detail.application?.internalNotes || []).map((n: any, i: number) => (
                      <div key={i} className="p-2 rounded bg-slate-50 dark:bg-slate-800">
                        <div className="font-semibold">{n.authorName}</div>
                        <div>{n.note}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Application History</h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {(detail.application?.history || []).map((h: any, i: number) => (
                      <div key={i} className="p-2 rounded bg-slate-50 dark:bg-slate-800">
                        <div className="flex justify-between">
                          <span className="font-semibold">{h.status}</span>
                          <span className="text-slate-400 tabular-nums">{new Date(h.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-300">{h.comment} ({h.actionByName})</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </div>
  );
}

// ======================================================
// SCHOOLS REGISTRY & INDEPENDENT VERIFICATION SYSTEM
// ======================================================
export function SchoolsAndVerificationView({
  ownershipFilter = 'ALL',
  verificationMode = false,
}: {
  ownershipFilter?: 'ALL' | 'GOVERNMENT' | 'PRIVATE';
  verificationMode?: boolean;
}) {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [previewDoc, setPreviewDoc] = useState<UploadedDocItem | null>(null);
  const [msg, setMsg] = useState('');

  const loadSchools = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/v1/schools?schoolType=${ownershipFilter}&q=${encodeURIComponent(q)}`);
      setSchools(data.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchools();
  }, [ownershipFilter]);

  const openVerifyDrawer = async (s: any) => {
    setSelectedSchool(s);
    setReason('');
    setMsg('');
    const h = await apiFetch(`/api/v1/verification/${s._id}/history`);
    setHistoryData(h);
  };

  const applyVerification = async (newStatus: 'VERIFIED' | 'UNVERIFIED' | 'SUSPENDED') => {
    if (!selectedSchool) return;
    setMsg('');
    try {
      const res = await apiFetch(`/api/v1/verification/${selectedSchool._id}`, {
        method: 'POST',
        body: JSON.stringify({ newStatus, reason }),
      });
      setSelectedSchool(res.school);
      setReason('');
      await openVerifyDrawer(res.school);
      await loadSchools();
      setMsg(`Verification status updated to ${newStatus}.`);
    } catch (err) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="text-xs text-slate-600 dark:text-slate-300">
          {verificationMode
            ? 'Independent Verification Control: Approval and ownership never grant automatic verification.'
            : `Registered ${ownershipFilter === 'ALL' ? 'Government & Private' : ownershipFilter} Schools`}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadSchools();
          }}
          className="flex gap-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search schools..."
            className="px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
          />
          <button type="submit" className="px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-700 text-white">
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : schools.length === 0 ? (
        <EmptyState title="No schools found" description="No school records match the current filter." />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Ownership</th>
                <th className="px-4 py-3">Reg # / Code</th>
                <th className="px-4 py-3">District</th>
                <th className="px-4 py-3">Registration</th>
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {schools.map((s) => (
                <tr key={s._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{s.name}</td>
                  <td className="px-4 py-3"><OwnershipBadge schoolType={s.schoolType} /></td>
                  <td className="px-4 py-3 font-mono tabular-nums">{s.registrationNumber}</td>
                  <td className="px-4 py-3">{s.district}, {s.province}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.registrationStatus} /></td>
                  <td className="px-4 py-3"><VerificationBadge status={s.verificationStatus} /></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openVerifyDrawer(s)}
                      className="px-3 py-1.5 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Manage Verification
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-base font-bold">{selectedSchool.name}</h3>
                <OwnershipBadge schoolType={selectedSchool.schoolType} />
                <VerificationBadge status={selectedSchool.verificationStatus} />
              </div>
              <button type="button" onClick={() => setSelectedSchool(null)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {msg && <div className="p-3 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">{msg}</div>}

              <div className="space-y-3">
                <label className="block font-semibold">Official Verification / Suspension Reason *</label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter mandatory audit reason for verifying, unverifying, suspending, or reinstating this school..."
                  className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyVerification('VERIFIED')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Verify School
                  </button>
                  <button
                    type="button"
                    onClick={() => applyVerification('UNVERIFIED')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                  >
                    {selectedSchool.verificationStatus === 'SUSPENDED' ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" /> Reinstate School
                      </>
                    ) : (
                      <>
                        <ShieldOff className="w-3.5 h-3.5" /> Remove Verification
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyVerification('SUSPENDED')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold"
                  >
                    <Ban className="w-3.5 h-3.5" /> Suspend School
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="font-semibold mb-2">Verification Audit History</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(historyData?.history || []).map((h: any) => (
                      <div key={h._id} className="p-2.5 rounded bg-slate-50 dark:bg-slate-800">
                        <div className="font-semibold">{h.previousStatus} → {h.newStatus}</div>
                        <div className="text-slate-600 dark:text-slate-300 mt-0.5">{h.reason}</div>
                        <div className="text-[11px] text-slate-400 mt-1 tabular-nums">{h.adminName} · {new Date(h.createdAt).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">School Documents & Inspection Reports</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(historyData?.documents || []).map((d: any) => (
                      <div key={d._id} className="p-2 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                        <span className="truncate">{d.title}</span>
                        <button type="button" onClick={() => setPreviewDoc(d)} className="text-blue-700 dark:text-blue-400 hover:underline shrink-0">
                          Preview
                        </button>
                      </div>
                    ))}
                    {(historyData?.inspectionReports || []).map((r: any) => (
                      <div key={r._id} className="p-2 rounded bg-slate-50 dark:bg-slate-800">
                        <div className="font-semibold">Inspection Report ({r.riskAssessment} Risk)</div>
                        <div className="text-slate-600 dark:text-slate-300">{r.finalConclusion}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </div>
  );
}
