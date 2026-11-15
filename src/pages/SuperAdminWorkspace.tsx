import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileCheck2,
  School,
  Landmark,
  Building2,
  ShieldCheck,
  Users,
  MessageSquareWarning,
  ClipboardList,
  FileSpreadsheet,
  Wrench,
  Mail,
  BarChart3,
  Settings,
} from 'lucide-react';
import { NavItem, PortalShell } from '../components/layout/PortalShell';
import {
  SchoolRegistrationManagement,
  SchoolsAndVerificationView,
  SuperAdminOverviewAndAnalytics,
} from './superadmin/SuperAdminAnalyticsAndRegistry';
import {
  SuperAdminComplaintsView,
  SuperAdminInspectionsView,
  SuperAdminMessagesView,
  SuperAdminSettingsAndAuditView,
  SuperAdminUsersView,
} from './superadmin/SuperAdminOperationsAndSettings';

export function SuperAdminWorkspace() {
  const [activeTab, setActiveTab] = useState('overview');

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" />, section: 'Command' },
    { id: 'analytics', label: 'Analytics & Reports', icon: <BarChart3 className="w-4 h-4" />, section: 'Command' },
    { id: 'applications', label: 'School Applications', icon: <FileCheck2 className="w-4 h-4" />, section: 'Registry' },
    { id: 'all_schools', label: 'All Schools', icon: <School className="w-4 h-4" />, section: 'Registry' },
    { id: 'gov_schools', label: 'Government Schools', icon: <Landmark className="w-4 h-4" />, section: 'Registry' },
    { id: 'private_schools', label: 'Private Schools', icon: <Building2 className="w-4 h-4" />, section: 'Registry' },
    { id: 'verification', label: 'Verification', icon: <ShieldCheck className="w-4 h-4" />, section: 'Registry' },
    { id: 'complaints', label: 'Complaints', icon: <MessageSquareWarning className="w-4 h-4" />, section: 'Oversight' },
    { id: 'inspection_groups', label: 'Inspection Groups', icon: <ClipboardList className="w-4 h-4" />, section: 'Oversight' },
    { id: 'inspection_reports', label: 'Inspection Reports', icon: <FileSpreadsheet className="w-4 h-4" />, section: 'Oversight' },
    { id: 'corrective_actions', label: 'Corrective Actions', icon: <Wrench className="w-4 h-4" />, section: 'Oversight' },
    { id: 'users', label: 'Users & Inspectors', icon: <Users className="w-4 h-4" />, section: 'Administration' },
    { id: 'messages', label: 'Messages', icon: <Mail className="w-4 h-4" />, section: 'Administration' },
    { id: 'settings', label: 'Settings & Audit', icon: <Settings className="w-4 h-4" />, section: 'Administration' },
  ];

  const currentLabel = navItems.find((i) => i.id === activeTab)?.label || 'Overview';

  return (
    <PortalShell
      navItems={navItems}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      title={currentLabel}
      subtitle="Education Department Super Admin · Government & Private School Oversight"
    >
      {activeTab === 'overview' && <SuperAdminOverviewAndAnalytics mode="overview" onNavigate={setActiveTab} />}
      {activeTab === 'analytics' && <SuperAdminOverviewAndAnalytics mode="analytics" onNavigate={setActiveTab} />}
      {activeTab === 'applications' && <SchoolRegistrationManagement />}
      {activeTab === 'all_schools' && <SchoolsAndVerificationView ownershipFilter="ALL" />}
      {activeTab === 'gov_schools' && <SchoolsAndVerificationView ownershipFilter="GOVERNMENT" />}
      {activeTab === 'private_schools' && <SchoolsAndVerificationView ownershipFilter="PRIVATE" />}
      {activeTab === 'verification' && <SchoolsAndVerificationView ownershipFilter="ALL" verificationMode />}
      {activeTab === 'users' && <SuperAdminUsersView />}
      {activeTab === 'complaints' && <SuperAdminComplaintsView />}
      {activeTab === 'inspection_groups' && <SuperAdminInspectionsView tab="groups" />}
      {activeTab === 'inspection_reports' && <SuperAdminInspectionsView tab="reports" />}
      {activeTab === 'corrective_actions' && <SuperAdminInspectionsView tab="corrective" />}
      {activeTab === 'messages' && <SuperAdminMessagesView />}
      {activeTab === 'settings' && <SuperAdminSettingsAndAuditView />}
    </PortalShell>
  );
}
