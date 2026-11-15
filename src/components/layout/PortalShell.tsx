import React, { useEffect, useState } from 'react';
import {
  Bell,
  LogOut,
  Menu,
  X,
  CheckCheck,
  Shield,
} from 'lucide-react';
import { apiFetch, useAuth } from '../../context/AuthContext';
import { ThemeSwitcher } from '../ui/ThemeAndUpload';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  section?: string;
}

export function PortalShell({
  navItems,
  activeTab,
  onSelectTab,
  title,
  subtitle,
  headerActions,
  children,
}: {
  navItems: NavItem[];
  activeTab: string;
  onSelectTab: (id: string) => void;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { user, logout, schools, activeSchoolId, setActiveSchoolId } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    try {
      const data = await apiFetch<{ items: any[]; unreadCount: number }>('/api/v1/notifications');
      setNotifications(data.items || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [activeTab]);

  const markRead = async (id: string) => {
    try {
      await apiFetch(`/api/v1/notifications/${id}/read`, { method: 'POST' });
      loadNotifications();
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      await apiFetch('/api/v1/notifications/read-all', { method: 'POST' });
      loadNotifications();
    } catch {
      // ignore
    }
  };

  const SidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 dark:bg-slate-950 text-slate-200 border-r border-slate-800">
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-md bg-blue-700 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="font-display text-base font-bold text-white tracking-tight truncate">EduGuard</div>
            <div className="text-[11px] text-slate-400 truncate">{user?.role?.replace(/_/g, ' ')}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded text-slate-400 hover:text-white"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {schools.length > 1 && (
        <div className="px-4 py-3 border-b border-slate-800">
          <label className="block text-[11px] text-slate-400 mb-1">Active School Campus</label>
          <select
            value={activeSchoolId || ''}
            onChange={(e) => setActiveSchoolId(e.target.value)}
            className="w-full text-xs rounded-md bg-slate-800 border border-slate-700 text-slate-100 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {schools.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} ({s.schoolType === 'GOVERNMENT' ? 'Gov' : 'Private'})
              </option>
            ))}
          </select>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navItems.map((item, idx) => {
          const active = activeTab === item.id;
          const prevSection = idx > 0 ? navItems[idx - 1].section : undefined;
          const showSection = item.section && item.section !== prevSection;
          return (
            <React.Fragment key={item.id}>
              {showSection && (
                <div className={`px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400/90 ${idx > 0 ? 'pt-3.5 pb-1' : 'pb-1'}`}>
                  {item.section}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors text-left ${
                  active
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0 truncate">
                  <span className="shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge !== undefined && Number(item.badge) > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono tabular-nums rounded bg-slate-800 text-slate-200 border border-slate-700 shrink-0">
                    {item.badge}
                  </span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800 space-y-2">
        <div className="px-2 py-1">
          <div className="text-xs font-medium text-white truncate">{user?.fullName}</div>
          <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen no-print">
        {SidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div className="w-64 h-full">{SidebarContent}</div>
          <div className="flex-1 bg-slate-950/60" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              aria-label="Open navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {headerActions}
            <ThemeSwitcher compact />
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                aria-label="Notifications"
                className="relative p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-mono tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Notifications ({unreadCount} unread)
                    </span>
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="inline-flex items-center gap-1 text-xs text-blue-700 dark:text-blue-400 hover:underline"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">No notifications yet.</div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n._id}
                          onClick={() => !n.isRead && markRead(n._id)}
                          className={`px-4 py-3 text-xs cursor-pointer transition-colors ${
                            n.isRead
                              ? 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                              : 'bg-blue-50/70 dark:bg-blue-950/30 text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold">{n.title}</span>
                            <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="mt-0.5 text-slate-600 dark:text-slate-300">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
