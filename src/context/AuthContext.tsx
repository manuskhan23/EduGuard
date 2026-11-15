import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { UserRole } from '../../server/types';

export interface AuthUser {
  _id: string;
  fullName: string;
  email: string;
  role: UserRole;
  phone?: string;
  designation?: string;
  employeeId?: string;
  cnicOrReference?: string;
  province?: string;
  district?: string;
  specialization?: string;
  schoolId?: string | null;
  schoolIds?: string[];
  isBlocked?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  schools: any[];
  applications: any[];
  activeSchoolId: string | null;
  setActiveSchoolId: (id: string) => void;
  loading: boolean;
  setSession: (data: { accessToken: string; refreshToken?: string; user: AuthUser; schools?: any[] }) => void;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  schools: [],
  applications: [],
  activeSchoolId: null,
  setActiveSchoolId: () => {},
  loading: true,
  setSession: () => {},
  logout: async () => {},
  refreshMe: async () => {},
});

export function getStoredToken(): string | null {
  return localStorage.getItem('eduguard_access_token');
}

export async function apiFetch<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(url, { ...options, headers, credentials: 'include' });

  // Attempt refresh rotation once on 401 if refresh token exists
  if (res.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/refresh')) {
    const refreshToken = localStorage.getItem('eduguard_refresh_token');
    if (refreshToken) {
      const refRes = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include',
      });
      if (refRes.ok) {
        const refData = await refRes.json();
        localStorage.setItem('eduguard_access_token', refData.accessToken);
        if (refData.refreshToken) localStorage.setItem('eduguard_refresh_token', refData.refreshToken);
        headers['Authorization'] = `Bearer ${refData.accessToken}`;
        res = await fetch(url, { ...options, headers, credentials: 'include' });
      } else {
        localStorage.removeItem('eduguard_access_token');
        localStorage.removeItem('eduguard_refresh_token');
      }
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [activeSchoolId, setActiveSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setSchools([]);
      setApplications([]);
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch<{ user: AuthUser; schools: any[]; applications: any[] }>('/api/v1/auth/me');
      setUser(data.user);
      setSchools(data.schools || []);
      setApplications(data.applications || []);
      if (data.schools?.length) {
        setActiveSchoolId((prev) => prev && data.schools.some((s) => s._id === prev) ? prev : data.schools[0]._id);
      }
    } catch {
      localStorage.removeItem('eduguard_access_token');
      localStorage.removeItem('eduguard_refresh_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const setSession = (data: { accessToken: string; refreshToken?: string; user: AuthUser; schools?: any[] }) => {
    localStorage.setItem('eduguard_access_token', data.accessToken);
    if (data.refreshToken) localStorage.setItem('eduguard_refresh_token', data.refreshToken);
    setUser(data.user);
    const list = data.schools || [];
    setSchools(list);
    if (list.length > 0) setActiveSchoolId(list[0]._id);
    refreshMe();
  };

  const logout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore
    }
    localStorage.removeItem('eduguard_access_token');
    localStorage.removeItem('eduguard_refresh_token');
    setUser(null);
    setSchools([]);
    setApplications([]);
    setActiveSchoolId(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, schools, applications, activeSchoolId, setActiveSchoolId, loading, setSession, logout, refreshMe }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
