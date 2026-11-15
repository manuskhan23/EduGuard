import React from 'react';
import {
  Building2,
  Landmark,
  ShieldCheck,
  ShieldAlert,
  Ban,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSearch,
  Inbox,
} from 'lucide-react';
import { SchoolType, VerificationStatus } from '../../../server/types';

export function OwnershipBadge({ schoolType }: { schoolType: SchoolType | string }) {
  const isGov = schoolType === SchoolType.GOVERNMENT;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold tracking-wide rounded border whitespace-nowrap shrink-0 ${
        isGov
          ? 'bg-blue-950/5 text-blue-900 border-blue-900/20 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700/40'
          : 'bg-teal-950/5 text-teal-800 border-teal-700/25 dark:bg-teal-900/30 dark:text-teal-200 dark:border-teal-700/40'
      }`}
    >
      {isGov ? <Landmark className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
      {isGov ? 'GOVERNMENT SCHOOL' : 'PRIVATE SCHOOL'}
    </span>
  );
}

export function VerificationBadge({ status }: { status: VerificationStatus | string }) {
  if (status === VerificationStatus.VERIFIED) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold tracking-wide rounded border whitespace-nowrap shrink-0 bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
        <ShieldCheck className="w-3.5 h-3.5" />
        VERIFIED BY EDUCATION DEPARTMENT
      </span>
    );
  }
  if (status === VerificationStatus.SUSPENDED) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold tracking-wide rounded border whitespace-nowrap shrink-0 bg-red-50 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800">
        <Ban className="w-3.5 h-3.5" />
        SUSPENDED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold tracking-wide rounded border whitespace-nowrap shrink-0 bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
      <ShieldAlert className="w-3.5 h-3.5" />
      NOT VERIFIED
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = String(status || '').toUpperCase();
  const label = s.replace(/_/g, ' ');

  if (['APPROVED', 'RESOLVED', 'COMPLETED', 'CLOSED', 'VERIFIED_BY_ADMIN', 'PAID', 'PASS', 'PRESENT'].includes(s)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded border whitespace-nowrap shrink-0 bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {label}
      </span>
    );
  }
  if (['REJECTED', 'OVERDUE', 'CRITICAL', 'FAIL', 'ABSENT', 'BLOCKED'].includes(s)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded border whitespace-nowrap shrink-0 bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800">
        <XCircle className="w-3.5 h-3.5" />
        {label}
      </span>
    );
  }
  if (['MORE_INFORMATION_REQUIRED', 'REVISION_REQUESTED', 'HIGH', 'LATE', 'PARTIAL'].includes(s)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded border whitespace-nowrap shrink-0 bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
        <AlertTriangle className="w-3.5 h-3.5" />
        {label}
      </span>
    );
  }
  if (['UNDER_REVIEW', 'INVESTIGATION_ASSIGNED', 'INVESTIGATION_IN_PROGRESS', 'IN_PROGRESS', 'REPORT_SUBMITTED', 'ADMIN_REVIEW'].includes(s)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded border whitespace-nowrap shrink-0 bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
        <FileSearch className="w-3.5 h-3.5" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded border whitespace-nowrap shrink-0 bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
      <Clock className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900">
      <Inbox className="w-9 h-9 text-slate-400 dark:text-slate-500 mb-3" />
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-11 rounded bg-slate-100 dark:bg-slate-800/70" />
      ))}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{message}</p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-md text-white whitespace-nowrap ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-700 hover:bg-blue-800'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
