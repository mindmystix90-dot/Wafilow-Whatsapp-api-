"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { AdminAlert, AdminBadge, AdminModal } from "@/components/admin/AdminUI";
import {
  Search,
  RefreshCw,
  Shield,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface AuditLogItem {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown> | string;
  ipAddress?: string;
  timestamp: string;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [actionFilter, setActionFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [targetTypeFilter, setTargetTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Selected Log Details Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const offset = (page - 1) * limit;
      const params = new URLSearchParams();
      if (actionFilter) params.set("action", actionFilter);
      if (actorFilter) params.set("actorEmail", actorFilter);
      if (targetTypeFilter !== "all") params.set("targetType", targetTypeFilter);
      params.set("limit", String(limit));
      params.set("offset", String(offset));

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load audit logs.");
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setError(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error loading audit logs"
      );
    } finally {
      setLoading(false);
    }
  }, [page, targetTypeFilter, actionFilter, actorFilter]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) fetchAuditLogs();
    });
    return () => {
      active = false;
    };
  }, [fetchAuditLogs]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAuditLogs();
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <AdminLayout
      title="Immutable Audit Trail"
      subtitle="Tracked administrative mutations, billing updates, maintenance switches, and security events"
    >
      {error && (
        <AdminAlert
          variant="error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Filter and Search Bar */}
      <form
        onSubmit={handleFilterSubmit}
        className="flex flex-col lg:flex-row gap-3"
      >
        <div className="flex-1 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="Filter by action (e.g. SUBSCRIPTION_UPDATE)..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <input
            type="text"
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            placeholder="Actor email..."
            className="w-full sm:w-48 px-3 py-2.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />

          <button
            type="submit"
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shrink-0"
          >
            Filter
          </button>
        </div>

        <div className="flex gap-2">
          <select
            value={targetTypeFilter}
            onChange={(e) => {
              setTargetTypeFilter(e.target.value);
              setPage(1);
            }}
            className="flex-1 sm:flex-none px-3 py-2.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Targets</option>
            <option value="ORGANIZATION">Organization</option>
            <option value="USER">User</option>
            <option value="SUBSCRIPTION">Subscription</option>
            <option value="SYSTEM">System</option>
          </select>

          <button
            type="button"
            onClick={fetchAuditLogs}
            className="p-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 shrink-0"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </form>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {loading && logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/80 border border-slate-800 rounded-2xl">
            Loading audit trail...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/80 border border-slate-800 rounded-2xl">
            No audit records found matching criteria.
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <AdminBadge tone="amber">{log.action}</AdminBadge>
                <span className="text-[10px] font-mono text-slate-400">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-slate-200 break-all">
                {log.actorEmail}
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
                <span className="truncate">
                  {log.targetType}: {log.targetId}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedLog(log)}
                  className="px-2.5 py-1 rounded-lg text-xs font-sans font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 inline-flex items-center gap-1 shrink-0"
                >
                  <Eye className="w-3 h-3" />
                  <span>Inspect</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Action</th>
                <th className="p-4">Actor</th>
                <th className="p-4">Target Type</th>
                <th className="p-4">Target ID</th>
                <th className="p-4">IP Address</th>
                <th className="p-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono text-[11px]">
              {loading && logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-slate-500 font-sans"
                  >
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-slate-500 font-sans"
                  >
                    No audit records found matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <AdminBadge tone="amber">{log.action}</AdminBadge>
                    </td>
                    <td className="p-4 text-slate-300 font-sans">
                      {log.actorEmail}
                    </td>
                    <td className="p-4">
                      <span className="text-slate-400 uppercase text-[10px]">
                        {log.targetType}
                      </span>
                    </td>
                    <td
                      className="p-4 text-slate-500 truncate max-w-[120px]"
                      title={log.targetId}
                    >
                      {log.targetId}
                    </td>
                    <td className="p-4 text-slate-400">
                      {log.ipAddress || "127.0.0.1"}
                    </td>
                    <td className="p-4 text-right font-sans">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <div>
          Showing <span className="text-white font-medium">{logs.length}</span>{" "}
          of <span className="text-white font-medium">{total}</span> records
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-mono text-slate-300">
            Page {page} / {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detailed Inspection Modal */}
      <AdminModal
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Audit Entry Inspection"
        subtitle={selectedLog?.action}
        icon={<Shield className="w-5 h-5 text-amber-400" />}
        maxWidth="max-w-lg"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-400">
              <div>
                <span className="block text-[10px] uppercase font-semibold text-slate-500">
                  Log ID
                </span>
                <span className="font-mono text-slate-200 break-all">
                  {selectedLog.id}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-semibold text-slate-500">
                  Timestamp
                </span>
                <span className="font-mono text-slate-200">
                  {selectedLog.timestamp}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-semibold text-slate-500">
                  Actor
                </span>
                <span className="text-slate-200 break-all">
                  {selectedLog.actorEmail}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-semibold text-slate-500">
                  IP Address
                </span>
                <span className="font-mono text-slate-200">
                  {selectedLog.ipAddress || "127.0.0.1"}
                </span>
              </div>
            </div>

            <div>
              <span className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">
                Payload Details
              </span>
              <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-mono text-[11px] overflow-x-auto max-h-60 whitespace-pre-wrap break-words">
                {typeof selectedLog.details === "object"
                  ? JSON.stringify(selectedLog.details, null, 2)
                  : selectedLog.details || "No metadata recorded."}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-white hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </AdminModal>
    </AdminLayout>
  );
}
