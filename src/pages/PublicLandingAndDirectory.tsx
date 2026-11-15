import React, { useEffect, useState } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Building2,
  Landmark,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { OwnershipBadge, VerificationBadge, EmptyState, TableSkeleton } from '../components/ui/Badges';
import { ThemeSwitcher } from '../components/ui/ThemeAndUpload';
import { EDUCATION_LEVELS, GENDER_TYPES, SchoolType, UserRole } from '../../server/types';
import { useAuth } from '../context/AuthContext';

export type PublicRoute = 'HOME' | 'DIRECTORY' | 'LOGIN' | 'REGISTER_PARENT' | 'REGISTER_GOV' | 'REGISTER_PRIVATE';

export function SchoolDirectorySection({
  onSubmitComplaintForSchool,
}: {
  onSubmitComplaintForSchool?: (school: any) => void;
}) {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [meta, setMeta] = useState<{ provinces: any[]; districts: any[]; schoolCategories: any[] }>({
    provinces: [],
    districts: [],
    schoolCategories: [],
  });

  const [filters, setFilters] = useState({
    q: '',
    schoolType: 'ALL',
    verificationStatus: 'ALL',
    province: 'ALL',
    district: 'ALL',
    city: '',
    tehsil: '',
    educationLevel: 'ALL',
    genderType: 'ALL',
    sort: 'name_asc',
  });

  useEffect(() => {
    fetch('/api/v1/settings/metadata')
      .then((r) => r.json())
      .then((d) => setMeta({ provinces: d.provinces || [], districts: d.districts || [], schoolCategories: d.schoolCategories || [] }))
      .catch(() => {});
  }, []);

  const loadDirectory = async (targetPage = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: '9',
        q: filters.q,
        schoolType: filters.schoolType,
        verificationStatus: filters.verificationStatus,
        province: filters.province,
        district: filters.district,
        city: filters.city || 'ALL',
        tehsil: filters.tehsil || 'ALL',
        educationLevel: filters.educationLevel,
        genderType: filters.genderType,
        sort: filters.sort,
      });
      const res = await fetch(`/api/v1/schools/directory?${params.toString()}`);
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory(page);
  }, [page, filters.schoolType, filters.verificationStatus, filters.province, filters.district, filters.educationLevel, filters.genderType, filters.sort]);

  const openProfile = async (id: string) => {
    setSelectedSchoolId(id);
    setProfileLoading(true);
    try {
      const res = await fetch(`/api/v1/schools/public/${id}`);
      const data = await res.json();
      setProfileData(data);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
    }
  };

  if (selectedSchoolId) {
    if (profileLoading) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
          <TableSkeleton rows={6} />
        </div>
      );
    }
    const s = profileData?.school;
    if (!s) {
      return (
        <EmptyState
          title="School profile unavailable"
          description="This school profile could not be loaded or is not publicly listed."
          action={
            <button
              type="button"
              onClick={() => setSelectedSchoolId(null)}
              className="px-4 py-2 text-xs font-medium rounded-md bg-blue-700 text-white"
            >
              Back to Directory
            </button>
          }
        />
      );
    }

    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => setSelectedSchoolId(null)}
          className="inline-flex items-center gap-2 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Public School Directory
        </button>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <img
                src={s.logo || '/src/assets/images/gov_school_emblem_1794737229739.jpg'}
                alt={s.name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-lg object-cover border border-slate-200 dark:border-slate-700 bg-white shrink-0"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <OwnershipBadge schoolType={s.schoolType} />
                  <VerificationBadge status={s.verificationStatus} />
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{s.name}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {s.schoolCategory} · Reg # <span className="font-mono">{s.registrationNumber}</span>
                  {s.emisCode ? ` · EMIS ${s.emisCode}` : ''} · Est. {s.establishedYear}
                </p>
              </div>
            </div>

            {onSubmitComplaintForSchool && (!user || user.role === UserRole.PARENT) && (
              <button
                type="button"
                onClick={() => onSubmitComplaintForSchool(s)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-md bg-red-600 hover:bg-red-700 text-white whitespace-nowrap shrink-0"
              >
                <AlertCircle className="w-4 h-4" />
                Submit Complaint
              </button>
            )}
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Institution Overview</h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{s.overview}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Ownership & Governance</h4>
                  <dl className="space-y-1 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Ownership:</dt>
                      <dd className="font-medium text-slate-900 dark:text-slate-100">{s.schoolType}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Gender Classification:</dt>
                      <dd className="font-medium text-slate-900 dark:text-slate-100">{s.genderType}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Principal / Head:</dt>
                      <dd className="font-medium text-slate-900 dark:text-slate-100">{s.principalName || 'N/A'}</dd>
                    </div>
                    {s.educationDepartment && (
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Department:</dt>
                        <dd className="font-medium text-slate-900 dark:text-slate-100 text-right">{s.educationDepartment}</dd>
                      </div>
                    )}
                    {s.parentOrganization && (
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Parent Organization:</dt>
                        <dd className="font-medium text-slate-900 dark:text-slate-100">{s.parentOrganization}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Verification & Levels</h4>
                  <dl className="space-y-1 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Verification Status:</dt>
                      <dd className="font-medium text-slate-900 dark:text-slate-100">{s.verificationStatus}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Verified On:</dt>
                      <dd className="font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                        {s.verifiedAt ? new Date(s.verifiedAt).toLocaleDateString() : 'Not yet verified'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Education Levels:</dt>
                      <dd className="font-medium text-slate-900 dark:text-slate-100 text-right">
                        {(s.educationLevels || []).join(', ')}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Classes Offered & Facilities</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="font-medium text-slate-700 dark:text-slate-300 mb-1">Active Grades</div>
                    {profileData.classesOffered?.length ? (
                      <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                        {profileData.classesOffered.map((c: any) => (
                          <li key={c._id}>• {c.name} ({c.gradeLevel})</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-500">Standard curriculum classes per registered education levels.</p>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-slate-700 dark:text-slate-300 mb-1">Campus Facilities</div>
                    {s.facilities?.length ? (
                      <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                        {s.facilities.map((f: string) => (
                          <li key={f} className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-500">Facility list pending update.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Public Announcements</h3>
                {profileData.announcements?.length ? (
                  <div className="space-y-2">
                    {profileData.announcements.map((a: any) => (
                      <div key={a._id} className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
                          <span>{a.title}</span>
                          <span className="text-[11px] font-normal text-slate-500 tabular-nums">
                            {new Date(a.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{a.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No public announcements posted.</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Location & Contact</h3>
                <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <div>{s.address}</div>
                    <div className="text-slate-500 mt-0.5">
                      {s.tehsil ? `${s.tehsil}, ` : ''}{s.city}, {s.district}, {s.province} {s.postalCode}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Phone className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                  <span className="tabular-nums">{s.contactNumber || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Mail className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                  <span className="truncate">{s.officialEmail || 'N/A'}</span>
                </div>
                {s.website && (
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <ExternalLink className="w-4 h-4 shrink-0" />
                    <a href={s.website} target="_blank" rel="noreferrer" className="hover:underline truncate">
                      {s.website}
                    </a>
                  </div>
                )}
                {s.location && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-[11px] text-slate-500 mb-1 font-mono tabular-nums">
                      Coordinates: {Number(s.location.lat).toFixed(4)}, {Number(s.location.lng).toFixed(4)}
                    </div>
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${s.location.lat}&mlon=${s.location.lng}#map=15/${s.location.lat}/${s.location.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
                    >
                      Open Campus Location Map
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Public Inspection Disclosure</h3>
                {profileData.publicInspectionSummaries?.length ? (
                  profileData.publicInspectionSummaries.map((rep: any) => (
                    <div key={rep._id} className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        Risk Rating: {rep.riskAssessment}
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 mt-1">{rep.finalConclusion}</p>
                      <div className="text-[11px] text-slate-400 mt-1 tabular-nums">
                        Reviewed {new Date(rep.reviewedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500">No publicly disclosed inspection summaries recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const availableDistricts = meta.districts.filter(
    (d) => filters.province === 'ALL' || d.province === filters.province
  );

  return (
    <div className="space-y-6">
      {/* Search + Sort + Grid/List Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            loadDirectory(1);
          }}
          className="flex-1 flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              placeholder="Search government or private schools by name, code, registration #, or district..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium rounded-md bg-blue-700 hover:bg-blue-800 text-white whitespace-nowrap"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            aria-label="Sort schools"
            className="px-3 py-2 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
          >
            <option value="name_asc">Name (A–Z)</option>
            <option value="verified_first">Verified First</option>
            <option value="newest">Recently Approved</option>
            <option value="established_asc">Oldest Established</option>
          </select>

          <div className="inline-flex rounded-md border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Sidebar + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <aside className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Directory Filters
            </h3>
            <button
              type="button"
              onClick={() => {
                setPage(1);
                setFilters({
                  q: '',
                  schoolType: 'ALL',
                  verificationStatus: 'ALL',
                  province: 'ALL',
                  district: 'ALL',
                  city: '',
                  tehsil: '',
                  educationLevel: 'ALL',
                  genderType: 'ALL',
                  sort: 'name_asc',
                });
              }}
              className="text-xs text-blue-700 dark:text-blue-400 hover:underline"
            >
              Reset
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Ownership</label>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-md bg-slate-100 dark:bg-slate-800">
                {[
                  { v: 'ALL', l: 'All' },
                  { v: SchoolType.GOVERNMENT, l: 'Gov' },
                  { v: SchoolType.PRIVATE, l: 'Private' },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => {
                      setPage(1);
                      setFilters({ ...filters, schoolType: opt.v });
                    }}
                    className={`py-1.5 rounded text-xs font-medium transition-colors ${
                      filters.schoolType === opt.v
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Verification</label>
              <select
                value={filters.verificationStatus}
                onChange={(e) => {
                  setPage(1);
                  setFilters({ ...filters, verificationStatus: e.target.value });
                }}
                className="w-full px-2.5 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="ALL">All Verification States</option>
                <option value="VERIFIED">Verified Only</option>
                <option value="UNVERIFIED">Unverified Only</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Province</label>
              <select
                value={filters.province}
                onChange={(e) => {
                  setPage(1);
                  setFilters({ ...filters, province: e.target.value, district: 'ALL' });
                }}
                className="w-full px-2.5 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="ALL">All Provinces</option>
                {meta.provinces.map((p) => (
                  <option key={p._id || p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">District</label>
              <select
                value={filters.district}
                onChange={(e) => {
                  setPage(1);
                  setFilters({ ...filters, district: e.target.value });
                }}
                className="w-full px-2.5 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="ALL">All Districts</option>
                {availableDistricts.map((d) => (
                  <option key={d._id || d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Education Level</label>
              <select
                value={filters.educationLevel}
                onChange={(e) => {
                  setPage(1);
                  setFilters({ ...filters, educationLevel: e.target.value });
                }}
                className="w-full px-2.5 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="ALL">All Levels</option>
                {EDUCATION_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">School Category</label>
              <select
                value={filters.genderType}
                onChange={(e) => {
                  setPage(1);
                  setFilters({ ...filters, genderType: e.target.value });
                }}
                className="w-full px-2.5 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value="ALL">Boys, Girls & Co-education</option>
                {GENDER_TYPES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </aside>

        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="tabular-nums">Showing {items.length} of {total} approved public & private schools</span>
            <span className="tabular-nums">Page {page} of {totalPages}</span>
          </div>

          {loading ? (
            <TableSkeleton rows={6} />
          ) : items.length === 0 ? (
            <EmptyState
              title="No matching schools found"
              description="Try clearing district or education level filters to view all approved government and private schools."
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((school) => (
                <div
                  key={school._id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex flex-col justify-between gap-4 hover:border-blue-600/50 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <img
                        src={school.logo || '/src/assets/images/gov_school_emblem_1794737229739.jpg'}
                        alt={school.name}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-md object-cover border border-slate-200 dark:border-slate-700 bg-white shrink-0"
                      />
                      <div className="min-w-0">
                        <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                          {school.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {school.district}, {school.city} · {school.genderType}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <OwnershipBadge schoolType={school.schoolType} />
                      <VerificationBadge status={school.verificationStatus} />
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                      <div>Levels: {(school.educationLevels || []).join(', ')}</div>
                      <div>Category: {school.schoolCategory}</div>
                      <div className="tabular-nums">Contact: {school.contactNumber || school.officialEmail}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openProfile(school._id)}
                    className="w-full py-2 px-3 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-200 dark:divide-slate-800">
              {items.map((school) => (
                <div key={school._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <img
                      src={school.logo || '/src/assets/images/gov_school_emblem_1794737229739.jpg'}
                      alt={school.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-md object-cover border border-slate-200 dark:border-slate-700 bg-white shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">{school.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {school.district}, {school.province} · {(school.educationLevels || []).join(', ')} · {school.genderType}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <OwnershipBadge schoolType={school.schoolType} />
                        <VerificationBadge status={school.verificationStatus} />
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openProfile(school._id)}
                    className="px-4 py-2 text-xs font-semibold rounded-md bg-blue-700 hover:bg-blue-800 text-white whitespace-nowrap shrink-0"
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PublicPortalLayout({
  route,
  setRoute,
  children,
}: {
  route: PublicRoute;
  setRoute: (r: PublicRoute) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setRoute('HOME')}
            className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            EduGuard
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => setRoute('DIRECTORY')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${route === 'DIRECTORY' ? 'text-blue-700 dark:text-blue-400 underline underline-offset-4' : ''}`}
            >
              School Directory
            </button>
            <button
              type="button"
              onClick={() => setRoute('REGISTER_GOV')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${route === 'REGISTER_GOV' ? 'text-blue-700 dark:text-blue-400 underline underline-offset-4' : ''}`}
            >
              Register Gov School
            </button>
            <button
              type="button"
              onClick={() => setRoute('REGISTER_PRIVATE')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${route === 'REGISTER_PRIVATE' ? 'text-blue-700 dark:text-blue-400 underline underline-offset-4' : ''}`}
            >
              Register Private School
            </button>
            <button
              type="button"
              onClick={() => setRoute('REGISTER_PARENT')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${route === 'REGISTER_PARENT' ? 'text-blue-700 dark:text-blue-400 underline underline-offset-4' : ''}`}
            >
              Parent Sign Up
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setRoute('LOGIN')}
              className="px-4 py-2 text-xs font-semibold rounded-md bg-blue-700 hover:bg-blue-800 text-white whitespace-nowrap shrink-0"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {route === 'HOME' ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12">
            {/* Hero Section */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-7 flex flex-col justify-center space-y-5">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                  Education Department Governance · Government & Private Schools
                </p>
                <h1
                  style={{ textWrap: 'balance' }}
                  className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight"
                >
                  Unified oversight, school administration, and public accountability.
                </h1>
                <p className="text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                  One centralized portal connecting public and private schools, parents, inspection teams, and the Education Department with transparent registration approval, independent verification, and complaint resolution.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRoute('DIRECTORY')}
                    className="px-5 py-2.5 text-sm font-semibold rounded-md bg-blue-700 hover:bg-blue-800 text-white whitespace-nowrap"
                  >
                    Browse School Directory
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoute('REGISTER_GOV')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                  >
                    <Landmark className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                    Register Government School
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoute('REGISTER_PRIVATE')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                  >
                    <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    Register Private School
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="h-full min-h-[260px] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-800">
                  <img
                    src="/src/assets/images/eduguard_hero_campus_1794737229925.jpg"
                    alt="Civic Education Department campus"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </section>

            {/* Directory Embedded Below Fold */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                    Public School Directory
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Search approved government and private institutions with independent Education Department verification status.
                  </p>
                </div>
                <ThemeSwitcher />
              </div>
              <SchoolDirectorySection onSubmitComplaintForSchool={() => setRoute('LOGIN')} />
            </section>
          </div>
        ) : route === 'DIRECTORY' ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Public School Directory</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Approved government and private schools across all registered districts.
                </p>
              </div>
              <ThemeSwitcher />
            </div>
            <SchoolDirectorySection onSubmitComplaintForSchool={() => setRoute('LOGIN')} />
          </div>
        ) : (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">{children}</div>
        )}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>EduGuard · Centralized Education Department Governance Portal</span>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setRoute('DIRECTORY')} className="hover:underline">Directory</button>
            <button type="button" onClick={() => setRoute('REGISTER_GOV')} className="hover:underline">Gov Registration</button>
            <button type="button" onClick={() => setRoute('REGISTER_PRIVATE')} className="hover:underline">Private Registration</button>
            <button type="button" onClick={() => setRoute('LOGIN')} className="hover:underline">Portal Sign In</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
