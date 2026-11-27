"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { AdminAlert, AdminBadge } from "@/components/admin/AdminUI";
import {
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Building2,
  ShieldCheck,
} from "lucide-react";

interface AdminWhatsAppConnectionItem {
  id: string;
  organizationId: string;
  organizationName: string;
  environment: string;
  status: string;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  wabaId: string | null;
  lastCheckedAt: string | null;
  lastError: string | null;
  stats: {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
}

export default function AdminWhatsAppOverviewPage() {
  const [connections, setConnections] = useState<AdminWhatsAppConnectionItem[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/whatsapp");
      if (!res.ok) throw new Error("Failed to load WhatsApp fleet connections.");
      const data = await res.json();
      setConnections(data.connections || []);
      setError(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error loading connections"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadConnections();
    });
    return () => {
      active = false;
    };
  }, [loadConnections]);

  const handleRefresh = () => {
    setLoading(true);
    loadConnections();
  };

  const filtered = connections.filter((conn) => {
    if (search) {
      const q = search.toLowerCase();
      const matchName = conn.organizationName.toLowerCase().includes(q);
      const matchPhone = conn.displayPhoneNumber?.toLowerCase().includes(q);
      const matchPhoneId = conn.phoneNumberId?.toLowerCase().includes(q);
      const matchWaba = conn.wabaId?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchPhoneId && !matchWaba)
        return false;
    }
    if (
      statusFilter !== "all" &&
      conn.status.toLowerCase() !== statusFilter.toLowerCase()
    ) {
      return false;
    }
    return true;
  });

  const connectedCount = connections.filter(
    (c) => c.status === "connected"
  ).length;
  const disconnectedCount = connections.filter(
    (c) => c.status === "disconnected"
  ).length;
  const errorCount = connections.filter((c) => c.status === "error").length;

  return (
    <AdminLayout
      title="WhatsApp Fleet Infrastructure"
      subtitle="Governance for Meta Cloud API phone numbers, WABAs, and tenant transmission telemetry"
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
          <span>Refresh Fleet</span>
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

      {/* Fleet Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400">
            Total WABAs
          </span>
          <div className="text-2xl font-bold text-white">
            {loading ? "..." : connections.length}
          </div>
          <span className="text-[11px] text-slate-500">
            Configured tenant links
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-emerald-400">
            Connected
          </span>
          <div className="text-2xl font-bold text-emerald-300">
            {loading ? "..." : connectedCount}
          </div>
          <span className="text-[11px] text-emerald-500">
            Registered numbers
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400">
            Disconnected
          </span>
          <div className="text-2xl font-bold text-slate-400">
            {loading ? "..." : disconnectedCount}
          </div>
          <span className="text-[11px] text-slate-500">
            Pending onboarding
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-800/40 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-rose-400">
            Degraded
          </span>
          <div className="text-2xl font-bold text-rose-300">
            {loading ? "..." : errorCount}
          </div>
          <span className="text-[11px] text-rose-400">
            Needs re-auth or PIN
          </span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by workspace, phone number, Phone ID, or WABA ID..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500"
        >
          <option value="all">All Statuses</option>
          <option value="connected">Connected</option>
          <option value="disconnected">Disconnected</option>
          <option value="error">Error / Degraded</option>
        </select>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {loading && connections.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/80 border border-slate-800 rounded-2xl">
            Loading WhatsApp fleet connections...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/80 border border-slate-800 rounded-2xl">
            No WhatsApp connections match your search.
          </div>
        ) : (
          filtered.map((conn) => {
            const total = conn.stats.total;
            const deliveredRate =
              total > 0
                ? Math.round(
                    ((conn.stats.delivered + conn.stats.read) / total) * 100
                  )
                : 100;
            return (
              <div
                key={conn.id}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-white truncate">
                      {conn.organizationName}
                    </div>
                    <div className="text-xs font-mono text-slate-300 mt-0.5">
                      {conn.displayPhoneNumber || "Number not set"}
                    </div>
                  </div>
                  <AdminBadge
                    tone={
                      conn.status === "connected"
                        ? "emerald"
                        : conn.status === "error"
                        ? "rose"
                        : "slate"
                    }
                  >
                    {conn.status}
                  </AdminBadge>
                </div>

                <div className="text-[11px] font-mono text-slate-400 space-y-0.5 break-all">
                  <div>PID: {conn.phoneNumberId || "—"}</div>
                  <div>WABA: {conn.wabaId || "—"}</div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/80">
                  <span className="text-slate-300">
                    {total.toLocaleString()} msgs ·{" "}
                    <span className="text-emerald-400 font-semibold">
                      {deliveredRate}% delivered
                    </span>
                  </span>
                  <span className="text-rose-400">
                    {conn.stats.failed} failed
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">Workspace & Account</th>
                <th className="p-4">Phone Number</th>
                <th className="p-4">Phone ID / WABA</th>
                <th className="p-4">Status</th>
                <th className="p-4">Delivery Telemetry</th>
                <th className="p-4 text-right">Last Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading && connections.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Loading WhatsApp fleet connections...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No WhatsApp connections match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((conn) => {
                  const isConnected = conn.status === "connected";
                  const isError = conn.status === "error";

                  const total = conn.stats.total;
                  const deliveredRate =
                    total > 0
                      ? Math.round(
                          ((conn.stats.delivered + conn.stats.read) / total) *
                            100
                        )
                      : 100;

                  return (
                    <tr
                      key={conn.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="font-semibold text-white">
                            {conn.organizationName}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          ID: {conn.organizationId}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-slate-200">
                          {conn.displayPhoneNumber || "Not Set"}
                        </div>
                        {conn.verifiedName && (
                          <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                            <ShieldCheck className="w-3 h-3" />
                            <span>{conn.verifiedName}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-4 font-mono text-[11px] space-y-0.5">
                        <div className="text-slate-300">
                          <span className="text-slate-500 text-[10px]">
                            PID:{" "}
                          </span>
                          {conn.phoneNumberId || "—"}
                        </div>
                        <div className="text-slate-400">
                          <span className="text-slate-500 text-[10px]">
                            WABA:{" "}
                          </span>
                          {conn.wabaId || "—"}
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase font-mono border ${
                            isConnected
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : isError
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              : "bg-slate-800 text-slate-400 border-slate-700"
                          }`}
                        >
                          {isConnected ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Connected
                            </>
                          ) : isError ? (
                            <>
                              <XCircle className="w-3 h-3" /> Degraded
                            </>
                          ) : (
                            "Disconnected"
                          )}
                        </span>
                        {conn.lastError && (
                          <div
                            className="text-[10px] text-rose-400 mt-1 max-w-xs truncate"
                            title={conn.lastError}
                          >
                            {conn.lastError}
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="text-[11px] font-medium text-slate-200 flex items-center gap-2">
                          <span>{total.toLocaleString()} total</span>
                          <span className="text-emerald-400 font-semibold">
                            {deliveredRate}% deliv.
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span className="text-slate-400">
                            {conn.stats.sent} sent
                          </span>
                          <span>•</span>
                          <span className="text-rose-400">
                            {conn.stats.failed} failed
                          </span>
                        </div>
                      </td>

                      <td className="p-4 text-right text-slate-400 text-[11px]">
                        {conn.lastCheckedAt
                          ? new Date(conn.lastCheckedAt).toLocaleString()
                          : "Auto-synced"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Isolation Notice */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-start sm:items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
          <span>
            WhatsApp access tokens and webhook secrets are encrypted with AES-256-GCM and never returned in administrative API payloads.
          </span>
        </div>
        <AdminBadge tone="slate">Meta Cloud API</AdminBadge>
      </div>
    </AdminLayout>
  );
}
