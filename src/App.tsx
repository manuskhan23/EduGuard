import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PublicPortalLayout, PublicRoute } from './pages/PublicLandingAndDirectory';
import { AuthAndRegistrationView } from './pages/AuthAndRegistration';
import { SuperAdminWorkspace } from './pages/SuperAdminWorkspace';
import { SchoolOwnerWorkspace } from './pages/SchoolOwnerWorkspace';
import { ParentAndStudentWorkspace } from './pages/ParentAndStudentWorkspace';
import { InspectorWorkspace } from './pages/InspectorWorkspace';
import { UserRole } from '../server/types';

function AppRouter() {
  const { user, loading } = useAuth();
  const [publicRoute, setPublicRoute] = useState<PublicRoute>('HOME');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-blue-700 border-t-transparent animate-spin" />
          <p className="text-sm font-medium">Loading EduGuard Portal...</p>
        </div>
      </div>
    );
  }

  if (user) {
    switch (user.role) {
      case UserRole.SUPER_ADMIN:
        return <SuperAdminWorkspace />;
      case UserRole.SCHOOL_OWNER:
        return <SchoolOwnerWorkspace />;
      case UserRole.PARENT:
      case UserRole.STUDENT:
        return <ParentAndStudentWorkspace />;
      case UserRole.INSPECTOR:
      case UserRole.GROUP_LEADER:
        return <InspectorWorkspace />;
      default:
        return <ParentAndStudentWorkspace />;
    }
  }

  return (
    <PublicPortalLayout route={publicRoute} setRoute={setPublicRoute}>
      {(publicRoute === 'LOGIN' ||
        publicRoute === 'REGISTER_PARENT' ||
        publicRoute === 'REGISTER_GOV' ||
        publicRoute === 'REGISTER_PRIVATE') && (
        <AuthAndRegistrationView route={publicRoute} setRoute={setPublicRoute} />
      )}
    </PublicPortalLayout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ThemeProvider>
  );
}
