import React, { useEffect, useState } from 'react';
import {
  Landmark,
  Building2,
  UserPlus,
  LogIn,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { EDUCATION_LEVELS, GENDER_TYPES, SchoolType } from '../../server/types';
import { FileUploadField, UploadedDocItem } from '../components/ui/ThemeAndUpload';
import { PublicRoute } from './PublicLandingAndDirectory';

export function AuthAndRegistrationView({
  route,
  setRoute,
}: {
  route: PublicRoute;
  setRoute: (r: PublicRoute) => void;
}) {
  const { setSession } = useAuth();
  const [meta, setMeta] = useState<{ provinces: any[]; districts: any[]; schoolCategories: any[] }>({
    provinces: [],
    districts: [],
    schoolCategories: [],
  });

  useEffect(() => {
    fetch('/api/v1/settings/metadata')
      .then((r) => r.json())
      .then((d) => setMeta({ provinces: d.provinces || [], districts: d.districts || [], schoolCategories: d.schoolCategories || [] }))
      .catch(() => {});
  }, []);

  if (route === 'LOGIN') {
    return <LoginView setSession={setSession} setRoute={setRoute} />;
  }
  if (route === 'REGISTER_PARENT') {
    return <ParentRegisterView setSession={setSession} provinces={meta.provinces} districts={meta.districts} setRoute={setRoute} />;
  }
  if (route === 'REGISTER_GOV') {
    return (
      <GovernmentSchoolRegisterView
        setSession={setSession}
        provinces={meta.provinces}
        districts={meta.districts}
        categories={meta.schoolCategories.filter((c) => c.schoolType === SchoolType.GOVERNMENT && c.isActive)}
        setRoute={setRoute}
      />
    );
  }
  return (
    <PrivateSchoolRegisterView
      setSession={setSession}
      provinces={meta.provinces}
      districts={meta.districts}
      categories={meta.schoolCategories.filter((c) => c.schoolType === SchoolType.PRIVATE && c.isActive)}
      setRoute={setRoute}
    />
  );
}

function LoginView({ setSession, setRoute }: { setSession: any; setRoute: (r: PublicRoute) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setSession(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">EduGuard Portal Sign In</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Access your Super Admin, School, Parent, Student, or Inspection workspace.
          </p>
        </div>
        <LogIn className="w-5 h-5 text-blue-700 dark:text-blue-400" />
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 px-4 text-sm font-semibold rounded-md bg-blue-700 hover:bg-blue-800 text-white"
        >
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400">
        <button type="button" onClick={() => setRoute('REGISTER_GOV')} className="text-blue-700 dark:text-blue-400 hover:underline">
          Register Government School
        </button>
        <span>·</span>
        <button type="button" onClick={() => setRoute('REGISTER_PRIVATE')} className="text-blue-700 dark:text-blue-400 hover:underline">
          Register Private School
        </button>
        <span>·</span>
        <button type="button" onClick={() => setRoute('REGISTER_PARENT')} className="text-blue-700 dark:text-blue-400 hover:underline">
          Create Parent Account
        </button>
      </div>
    </div>
  );
}

function ParentRegisterView({
  setSession,
  provinces,
  districts,
  setRoute,
}: {
  setSession: any;
  provinces: any[];
  districts: any[];
  setRoute: (r: PublicRoute) => void;
}) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    cnicOrReference: '',
    province: 'Punjab',
    district: 'Lahore',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/auth/register/parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setSession(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 sm:p-8 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">Parent & Guardian Registration</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Immediate portal access to connect children, browse schools, and submit complaints.
          </p>
        </div>
        <UserPlus className="w-5 h-5 text-blue-700 dark:text-blue-400" />
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1">Full Name *</label>
          <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Email Address *</label>
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Phone Number *</label>
          <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">CNIC / National ID</label>
          <input value={form.cnicOrReference} onChange={(e) => setForm({ ...form, cnicOrReference: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Province</label>
          <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
            {provinces.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">District</label>
          <select value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
            {districts.filter((d) => d.province === form.province).map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Password *</label>
          <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Confirm Password *</label>
          <input type="password" required minLength={6} value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
        </div>
        <div className="sm:col-span-2 pt-2 flex items-center justify-between">
          <button type="button" onClick={() => setRoute('LOGIN')} className="text-xs text-blue-700 dark:text-blue-400 hover:underline">
            Already have an account? Sign In
          </button>
          <button type="submit" disabled={submitting} className="px-5 py-2.5 text-sm font-semibold rounded-md bg-blue-700 hover:bg-blue-800 text-white">
            {submitting ? 'Creating Account...' : 'Create Parent Account'}
          </button>
        </div>
      </form>
    </div>
  );
}

function GovernmentSchoolRegisterView({
  setSession,
  provinces,
  districts,
  categories,
  setRoute,
}: {
  setSession: any;
  provinces: any[];
  districts: any[];
  categories: any[];
  setRoute: (r: PublicRoute) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    schoolCode: '',
    emisCode: '',
    registrationNumber: '',
    schoolCategory: categories[0]?.name || 'Government Secondary School',
    educationLevels: ['Secondary'] as string[],
    genderType: 'Co-education',
    establishedYear: 1995,
    operatingStatus: 'Active',
    logo: '',
    overview: '',
    province: 'Punjab',
    district: 'Lahore',
    tehsil: '',
    unionCouncil: '',
    educationDepartment: 'School Education Department',
    administrativeRegion: '',
    relevantAuthority: 'District Education Authority',
    departmentReferenceNumber: '',
    address: '',
    city: 'Lahore',
    postalCode: '',
    lat: 31.5204,
    lng: 74.3587,
    repFullName: '',
    repEmail: '',
    repPhone: '',
    repDesignation: 'Principal',
    repEmployeeId: '',
    repGovReference: '',
    password: '',
    confirmPassword: '',
  });
  const [documents, setDocuments] = useState<UploadedDocItem[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<{ message: string; sessionData: any } | null>(null);

  const toggleLevel = (lvl: string) => {
    setForm((prev) => ({
      ...prev,
      educationLevels: prev.educationLevels.includes(lvl)
        ? prev.educationLevels.filter((x) => x !== lvl)
        : [...prev.educationLevels, lvl],
    }));
  };

  const submitForm = async (saveAsDraft: boolean) => {
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/auth/register/government-school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, saveAsDraft, documents }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setConfirmation({ message: data.message, sessionData: data });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmation) {
    return (
      <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Government School Registration</h2>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{confirmation.message}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Operational school modules remain locked until the Education Department reviews and approves your application. You can track progress in your applicant portal.
        </p>
        <button
          type="button"
          onClick={() => setSession({ ...confirmation.sessionData, schools: [confirmation.sessionData.school] })}
          className="px-5 py-2.5 text-sm font-semibold rounded-md bg-blue-700 hover:bg-blue-800 text-white"
        >
          Track Registration Progress
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 sm:p-8 space-y-6">
      <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">
            <Landmark className="w-4 h-4" /> OWNERSHIP: GOVERNMENT SCHOOL
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Government School Registration Form
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            For authorized Principals, Head Teachers, School Administrators, or Education Officers.
          </p>
        </div>
        <button type="button" onClick={() => setRoute('REGISTER_PRIVATE')} className="text-xs text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap">
          Switch to Private School Form
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitForm(false);
        }}
        className="space-y-8 text-sm"
      >
        {/* A. Official School Information */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
            A. Official School Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">Official School Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Government School Code *</label>
              <input required value={form.schoolCode} onChange={(e) => setForm({ ...form, schoolCode: e.target.value })} placeholder="e.g. PB-LHR-0912" className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">EMIS Code (if applicable)</label>
              <input value={form.emisCode} onChange={(e) => setForm({ ...form, emisCode: e.target.value })} placeholder="e.g. 352020912" className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">School Registration / Reference # *</label>
              <input required value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} placeholder="e.g. GOV-REG-2026-991" className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">School Category *</label>
              <select value={form.schoolCategory} onChange={(e) => setForm({ ...form, schoolCategory: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Gender Classification *</label>
              <select value={form.genderType} onChange={(e) => setForm({ ...form, genderType: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                {GENDER_TYPES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Established Year *</label>
              <input type="number" required value={form.establishedYear} onChange={(e) => setForm({ ...form, establishedYear: Number(e.target.value) })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Operating Status</label>
              <select value={form.operatingStatus} onChange={(e) => setForm({ ...form, operatingStatus: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                <option value="Active">Active</option>
                <option value="Morning Shift">Morning Shift</option>
                <option value="Double Shift">Double Shift</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium mb-1.5">Education Levels *</label>
              <div className="flex flex-wrap gap-2">
                {EDUCATION_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => toggleLevel(lvl)}
                    className={`px-3 py-1.5 text-xs rounded-md border ${
                      form.educationLevels.includes(lvl)
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* B. Government Department Information */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
            B. Government Department Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Province *</label>
              <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                {provinces.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">District *</label>
              <select value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                {districts.filter((d) => d.province === form.province).map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Tehsil</label>
              <input value={form.tehsil} onChange={(e) => setForm({ ...form, tehsil: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Union Council</label>
              <input value={form.unionCouncil} onChange={(e) => setForm({ ...form, unionCouncil: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Education Department *</label>
              <input required value={form.educationDepartment} onChange={(e) => setForm({ ...form, educationDepartment: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Administrative Region</label>
              <input value={form.administrativeRegion} onChange={(e) => setForm({ ...form, administrativeRegion: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Relevant Education Authority *</label>
              <input required value={form.relevantAuthority} onChange={(e) => setForm({ ...form, relevantAuthority: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Department Reference # *</label>
              <input required value={form.departmentReferenceNumber} onChange={(e) => setForm({ ...form, departmentReferenceNumber: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
          </div>
        </section>

        {/* C. School Location */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
            C. School Location
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">Complete Address *</label>
              <input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">City *</label>
              <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Postal Code</label>
              <input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Latitude</label>
              <input type="number" step="any" value={form.lat} onChange={(e) => setForm({ ...form, lat: Number(e.target.value) })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Longitude</label>
              <input type="number" step="any" value={form.lng} onChange={(e) => setForm({ ...form, lng: Number(e.target.value) })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono" />
            </div>
          </div>
        </section>

        {/* D. Authorized Representative */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
            D. Authorized Representative Account
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Full Name *</label>
              <input required value={form.repFullName} onChange={(e) => setForm({ ...form, repFullName: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Official Email *</label>
              <input type="email" required value={form.repEmail} onChange={(e) => setForm({ ...form, repEmail: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Contact Number *</label>
              <input required value={form.repPhone} onChange={(e) => setForm({ ...form, repPhone: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Designation *</label>
              <select value={form.repDesignation} onChange={(e) => setForm({ ...form, repDesignation: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                <option value="School Principal">School Principal</option>
                <option value="Head Teacher">Head Teacher</option>
                <option value="Government School Administrator">Government School Administrator</option>
                <option value="Authorized Education Officer">Authorized Education Officer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Employee ID *</label>
              <input required value={form.repEmployeeId} onChange={(e) => setForm({ ...form, repEmployeeId: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Gov ID / Reference *</label>
              <input required value={form.repGovReference} onChange={(e) => setForm({ ...form, repGovReference: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Password *</label>
              <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Confirm Password *</label>
              <input type="password" required minLength={6} value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
          </div>
        </section>

        {/* E. Supporting Documents */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
            E. Supporting Documents
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              'Government school authorization document',
              'School identification document',
              'EMIS documentation',
              'Authorization letter of the representative',
              'Other supporting document',
            ].map((docLabel) => (
              <FileUploadField
                key={docLabel}
                label={docLabel}
                documentType={docLabel}
                onUploaded={(doc) => setDocuments((prev) => [...prev, doc])}
              />
            ))}
          </div>
          {documents.length > 0 && (
            <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-300 pt-2">
              {documents.map((d, idx) => (
                <li key={idx}>• {d.title} ({d.mimeType})</li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            disabled={submitting}
            onClick={() => submitForm(true)}
            className="px-4 py-2.5 text-sm font-medium rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Save as Draft
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 text-sm font-semibold rounded-md bg-blue-700 hover:bg-blue-800 text-white"
          >
            {submitting ? 'Submitting...' : 'Submit Government School Registration'}
          </button>
        </div>
      </form>
    </div>
  );
}

function PrivateSchoolRegisterView({
  setSession,
  provinces,
  districts,
  categories,
  setRoute,
}: {
  setSession: any;
  provinces: any[];
  districts: any[];
  categories: any[];
  setRoute: (r: PublicRoute) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    registrationNumber: '',
    schoolCategory: categories[0]?.name || 'Private Secondary School',
    educationLevels: ['Primary', 'Secondary'] as string[],
    genderType: 'Co-education',
    establishedYear: 2015,
    numberOfCampuses: 1,
    parentOrganization: '',
    website: '',
    ownerFullName: '',
    ownerEmail: '',
    ownerPhone: '',
    ownerCnic: '',
    ownerDesignation: 'Managing Director',
    password: '',
    confirmPassword: '',
    principalName: '',
    administratorName: '',
    managementOrganization: '',
    contactNumber: '',
    officialEmail: '',
    address: '',
    province: 'Punjab',
    district: 'Lahore',
    city: 'Lahore',
    tehsil: '',
    unionCouncil: '',
    postalCode: '',
    lat: 31.48,
    lng: 74.31,
  });
  const [documents, setDocuments] = useState<UploadedDocItem[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<{ message: string; subMessage: string; sessionData: any } | null>(null);

  const toggleLevel = (lvl: string) => {
    setForm((prev) => ({
      ...prev,
      educationLevels: prev.educationLevels.includes(lvl)
        ? prev.educationLevels.filter((x) => x !== lvl)
        : [...prev.educationLevels, lvl],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/auth/register/private-school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, documents }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setConfirmation({ message: data.message, subMessage: data.subMessage, sessionData: data });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmation) {
    return (
      <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">{confirmation.message}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">{confirmation.subMessage}</p>
        <button
          type="button"
          onClick={() => setSession({ ...confirmation.sessionData, schools: [confirmation.sessionData.school] })}
          className="px-5 py-2.5 text-sm font-semibold rounded-md bg-blue-700 hover:bg-blue-800 text-white"
        >
          View Application Status Tracker
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 sm:p-8 space-y-6">
      <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 mb-1">
            <Building2 className="w-4 h-4" /> OWNERSHIP: PRIVATE SCHOOL
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Private School Registration Form
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            For independently owned or trust-operated private educational institutions.
          </p>
        </div>
        <button type="button" onClick={() => setRoute('REGISTER_GOV')} className="text-xs text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap">
          Switch to Government School Form
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 text-sm">
        {/* A. School Information */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
            A. School Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">Official School Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">School Registration Number *</label>
              <input required value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">School Category *</label>
              <select value={form.schoolCategory} onChange={(e) => setForm({ ...form, schoolCategory: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Gender Classification *</label>
              <select value={form.genderType} onChange={(e) => setForm({ ...form, genderType: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                {GENDER_TYPES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Established Year *</label>
              <input type="number" required value={form.establishedYear} onChange={(e) => setForm({ ...form, establishedYear: Number(e.target.value) })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Number of Campuses</label>
              <input type="number" min={1} value={form.numberOfCampuses} onChange={(e) => setForm({ ...form, numberOfCampuses: Number(e.target.value) })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Parent Organization (Multi-Campus)</label>
              <input value={form.parentOrganization} onChange={(e) => setForm({ ...form, parentOrganization: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Website (optional)</label>
              <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium mb-1.5">Education Levels *</label>
              <div className="flex flex-wrap gap-2">
                {EDUCATION_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => toggleLevel(lvl)}
                    className={`px-3 py-1.5 text-xs rounded-md border ${
                      form.educationLevels.includes(lvl)
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* B. Owner Information */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
            B. Owner Account Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Owner Full Name *</label>
              <input required value={form.ownerFullName} onChange={(e) => setForm({ ...form, ownerFullName: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Owner Email *</label>
              <input type="email" required value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Phone Number *</label>
              <input required value={form.ownerPhone} onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">CNIC / Reference *</label>
              <input required value={form.ownerCnic} onChange={(e) => setForm({ ...form, ownerCnic: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Owner Designation *</label>
              <input required value={form.ownerDesignation} onChange={(e) => setForm({ ...form, ownerDesignation: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Password *</label>
              <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Confirm Password *</label>
              <input type="password" required minLength={6} value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
          </div>
        </section>

        {/* C. School Management Information */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
            C. School Management Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Principal Name *</label>
              <input required value={form.principalName} onChange={(e) => setForm({ ...form, principalName: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">School Administrator Name *</label>
              <input required value={form.administratorName} onChange={(e) => setForm({ ...form, administratorName: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Management Organization (optional)</label>
              <input value={form.managementOrganization} onChange={(e) => setForm({ ...form, managementOrganization: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">School Contact Number *</label>
              <input required value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Official School Email *</label>
              <input type="email" required value={form.officialEmail} onChange={(e) => setForm({ ...form, officialEmail: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
          </div>
        </section>

        {/* D. School Address */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
            D. School Address & Coordinates
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">Complete Address *</label>
              <input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Province *</label>
              <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                {provinces.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">District *</label>
              <select value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950">
                {districts.filter((d) => d.province === form.province).map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">City *</label>
              <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Tehsil</label>
              <input value={form.tehsil} onChange={(e) => setForm({ ...form, tehsil: e.target.value })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Latitude</label>
              <input type="number" step="any" value={form.lat} onChange={(e) => setForm({ ...form, lat: Number(e.target.value) })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Longitude</label>
              <input type="number" step="any" value={form.lng} onChange={(e) => setForm({ ...form, lng: Number(e.target.value) })} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono" />
            </div>
          </div>
        </section>

        {/* E. Legal & Registration Documents */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
            E. Legal and Registration Documents
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              'Private school registration certificate',
              'Ownership or management authorization',
              'Applicable education department registration',
              'School operating license',
              'Supporting document',
            ].map((docLabel) => (
              <FileUploadField
                key={docLabel}
                label={docLabel}
                documentType={docLabel}
                onUploaded={(doc) => setDocuments((prev) => [...prev, doc])}
              />
            ))}
          </div>
          {documents.length > 0 && (
            <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-300 pt-2">
              {documents.map((d, idx) => (
                <li key={idx}>• {d.title} ({d.mimeType})</li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 text-sm font-semibold rounded-md bg-teal-700 hover:bg-teal-800 text-white"
          >
            {submitting ? 'Submitting...' : 'Submit Private School Application'}
          </button>
        </div>
      </form>
    </div>
  );
}
