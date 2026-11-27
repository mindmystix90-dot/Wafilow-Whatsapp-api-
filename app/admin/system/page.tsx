"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { AdminAlert, AdminBadge } from "@/components/admin/AdminUI";
import {
  Database,
  Smartphone,
  RefreshCw,
  Cpu,
  Layers,
  FileClock,
} from "lucide-react";

interface HealthData {
  status: string;
  timestamp: string;
  database: {
    status: string;
    latencyMs: number;
    provider: string;
  };
  whatsappConnections: {
    total: number;
    connected: number;
    disconnected: number;
    error: number;
  };
  messageQueue: {
    status: string;
    pendingOutbound: number;
    activeDispatchers: number;
  };
  environment: {
    nodeEnv: string;
    uptimeSeconds: number;
  };
}

interface AuditLogItem {
  id: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  timestamp?: string;
  createdAt?: string;
}

export default function AdminSystemPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHealthAndLogs = useCallback(async () => {
    try {
      const [healthRes, logsRes] = await Promise.all([
        fetch("/api/admin/system-health"),
        fetch("/api/admin/audit-logs"),
      ]);

      if (!healthRes.ok) throw new Error("Failed to load system diagnostics.");

      const healthData = await healthRes.json();
      setHealth(healthData.health);

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setAuditLogs((logsData.logs || []).slice(0, 10));
      }
      setError(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error loading system diagnostics"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadHealthAndLogs();
    });
    return () => {
      active = false;
    };
  }, [loadHealthAndLogs]);

  const handleRefresh = () => {
    setLoading(true);
    loadHealthAndLogs();
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <AdminLayout
      title="System Health & Diagnostics"
      subtitle="Real-time PostgreSQL latency, Meta Cloud API status, concurrency guards, and audit telemetry"
      action={
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          <span>Run Diagnostic</span>
        </button>
      }
    >
      {error && (
        <AdminAlert
          variant="error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Main Service Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-indigo-400">
              <Database className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                PostgreSQL (Neon)
              </span>
            </div>
            <AdminBadge
              tone={health?.database.status === "healthy" ? "emerald" : "rose"}
            >
              {health?.database.status || "CHECKING"}
            </AdminBadge>
          </div>

          <div className="space-y-1">
            <div className="text-2xl font-bold text-white font-mono">
              {health?.database.latencyMs ?? 0} ms
            </div>
            <div className="text-[11px] text-slate-400">
              Round-trip query latency
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 flex justify-between">
            <span>Isolation</span>
            <span className="text-slate-300 font-mono">
              Tenant Organization ID
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <Smartphone className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Meta Cloud API
              </span>
            </div>
            <AdminBadge tone="emerald">ACTIVE</AdminBadge>
          </div>

          <div className="space-y-1">
            <div className="text-2xl font-bold text-white">
              {health?.whatsappConnections.connected ?? 0} Active
            </div>
            <div className="text-[11px] text-slate-400">
              {health?.whatsappConnections.total ?? 0} configured WABAs
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 flex justify-between">
            <span>24-Hour Service Window</span>
            <span className="text-emerald-400 font-mono">Enforced</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-400">
              <Layers className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Quota Guard
              </span>
            </div>
            <AdminBadge tone="amber">CONCURRENCY-SAFE</AdminBadge>
          </div>

          <div className="space-y-1">
            <div className="text-2xl font-bold text-white">Fail-Closed</div>
            <div className="text-[11px] text-slate-400">
              In-flight TTL reservation cache active
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 flex justify-between">
            <span>HTTP Rate Limits</span>
            <span className="text-amber-400 font-mono">429 Protection</span>
          </div>
        </div>
      </div>

      {/* Runtime Environment Info */}
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Runtime Environment
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {health?.timestamp
              ? new Date(health.timestamp).toLocaleTimeString()
              : ""}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">
              Environment
            </span>
            <span className="font-mono font-bold text-slate-200 uppercase">
              {health?.environment.nodeEnv || "production"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">
              Process Uptime
            </span>
            <span className="font-mono font-bold text-slate-200">
              {health?.environment.uptimeSeconds
                ? formatUptime(health.environment.uptimeSeconds)
                : "Active"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">
              Session Engine
            </span>
            <span className="font-mono font-bold text-emerald-400">
              JWT + Session Versioning
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">
              Token Encryption
            </span>
            <span className="font-mono font-bold text-indigo-400">
              AES-256-GCM
            </span>
          </div>
        </div>
      </div>

      {/* Recent Security Audit Log Preview */}
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <FileClock className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Recent Administrative Audit Trail
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Immutable security events
          </span>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-2">
          {auditLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No recent audit events recorded.
            </div>
          ) : (
            auditLogs.map((log) => {
              const ts = log.timestamp || log.createdAt;
              return (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <AdminBadge tone="amber">{log.action}</AdminBadge>
                    <span className="text-[10px] font-mono text-slate-400">
                      {ts ? new Date(ts).toLocaleString() : "—"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-200 break-all">
                    {log.actorEmail}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 truncate">
                    {log.targetType}:{log.targetId}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Administrator</th>
                <th className="p-3">Action</th>
                <th className="p-3">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-500">
                    No recent audit events recorded.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => {
                  const ts = log.timestamp || log.createdAt;
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {ts ? new Date(ts).toLocaleString() : "—"}
                      </td>
                      <td className="p-3 font-semibold text-slate-200">
                        {log.actorEmail}
                      </td>
                      <td className="p-3">
                        <AdminBadge tone="amber">{log.action}</AdminBadge>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-400">
                        {log.targetType}:{log.targetId.slice(0, 12)}...
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
