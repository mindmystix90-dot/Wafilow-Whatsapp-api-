"use client";

import { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export function AdminAlert({
  variant,
  message,
  onDismiss,
}: {
  variant: "error" | "success" | "warning" | "info";
  message: string;
  onDismiss?: () => void;
}) {
  const styles =
    variant === "error"
      ? "bg-rose-950/60 border-rose-800/80 text-rose-200"
      : variant === "success"
      ? "bg-emerald-950/60 border-emerald-800/80 text-emerald-200"
      : variant === "warning"
      ? "bg-amber-950/60 border-amber-800/80 text-amber-200"
      : "bg-sky-950/60 border-sky-800/80 text-sky-200";

  const Icon =
    variant === "success"
      ? CheckCircle2
      : variant === "info"
      ? Info
      : AlertTriangle;

  const iconColor =
    variant === "error"
      ? "text-rose-400"
      : variant === "success"
      ? "text-emerald-400"
      : variant === "warning"
      ? "text-amber-400"
      : "text-sky-400";

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-xl border text-xs flex items-start justify-between gap-3 ${styles}`}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
        <span className="break-words leading-relaxed">{message}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-current/70 hover:text-current p-0.5 rounded shrink-0"
          aria-label="Dismiss alert"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export function AdminModal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  maxWidth = "max-w-lg",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  maxWidth?: "max-w-md" | "max-w-lg" | "max-w-xl" | "max-w-2xl";
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full ${maxWidth} bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden`}
      >
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <div className="shrink-0">{icon}</div>}
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">{title}</h3>
              {subtitle && (
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">{children}</div>
      </div>
    </div>
  );
}

export function AdminBadge({
  tone = "slate",
  children,
}: {
  tone?: "emerald" | "amber" | "rose" | "indigo" | "sky" | "slate";
  children: ReactNode;
}) {
  const toneClasses = {
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    rose: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    indigo: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    sky: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    slate: "bg-slate-800 text-slate-300 border-slate-700",
  }[tone];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border whitespace-nowrap ${toneClasses}`}
    >
      {children}
    </span>
  );
}

export function AdminEmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="p-8 sm:p-10 text-center space-y-2">
      {icon && (
        <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 flex items-center justify-center mx-auto">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-slate-200">{title}</p>
      {description && <p className="text-xs text-slate-500">{description}</p>}
    </div>
  );
}
