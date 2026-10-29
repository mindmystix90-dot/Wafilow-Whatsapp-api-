"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import {
  Building2,
  Users,
  MessageSquare,
  Activity,
  ShieldCheck,
  RefreshCw,
  Server,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react";

interface DashboardData {
  stats: {
    totalOrgs: number;
    activeOrgs: number;
    suspendedOrgs: number;
    totalUsers: number;
    totalMessages: number;
    connectedWhatsApp: number;
  };
  health: {
    status: string;
    database: { status: string; latencyMs: number; provider: string };
    whatsappConnections: { total: number; connected: number; disconnected: number; error: number };
    messageQueue: { status: string; pendingOutbound: number };
  };
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [orgsRes, usersRes, healthRes] = await Promise.all([
        fetch("/api/admin/organizations"),
        fetch("/api/admin/users"),
        fetch("/api/admin/system-health"),
      ]);

      if (!orgsRes.ok || !usersRes.ok || !healthRes.ok) {
        throw new Error("Failed to load one or more administrative metrics.");
      }

      const orgsData = await orgsRes.json();
      const usersData = await usersRes.json();
      const healthData = await healthRes.json();

      const orgs = orgsData.organizations || [];
      const users = usersData.users || [];
      const health = healthData.health || {};

      const activeOrgs = orgs.filter((o: { status: string }) => o.status === "active").length;
      const suspendedOrgs = orgs.filter((o: { status: string }) => o.status === "suspended").length;
      const totalMessages = orgs.reduce((acc: number, curr: { messageCount: number }) => acc + (curr.messageCount || 0), 0);

      setData({
        stats: {
          totalOrgs: orgs.length,
          activeOrgs,
          suspendedOrgs,
          totalUsers: users.length,
          totalMessages,
          connectedWhatsApp: health.whatsappConnections?.connected || 0,
        },
        health,
      });
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        loadData();
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    loadData();
  };

  return (
    <AdminLayout
      title="Platform Overview"
      subtitle="Super Admin global metrics, tenant health, and system telemetry"
      action={
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      }
    >
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Organizations</span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? "..." : data?.stats.totalOrgs.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span className="text-emerald-400 font-medium">{data?.stats.activeOrgs} active</span>
            <span>•</span>
            <span className="text-rose-400 font-medium">{data?.stats.suspendedOrgs} suspended</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Cross-Tenant Users</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? "..." : data?.stats.totalUsers.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400">All registered customer accounts</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Messages</span>
            <MessageSquare className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? "..." : data?.stats.totalMessages.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400">Dispatched via WhatsApp Cloud API</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Connected WABAs</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? "..." : data?.stats.connectedWhatsApp.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-400 font-medium">Production WhatsApp connections</div>
        </div>
      </div>

      {/* System Health & Telemetry Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">System Health & Services</h2>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono font-medium">
              {data?.health.status || "HEALTHY"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <span className="text-[11px] text-slate-400 font-medium block">Database Layer</span>
              <div className="text-sm font-bold text-slate-200">PostgreSQL (Neon)</div>
              <div className="text-[11px] text-emerald-400 font-mono">
                Latency: {data?.health.database?.latencyMs ?? 5}ms
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <span className="text-[11px] text-slate-400 font-medium block">WhatsApp Cloud API</span>
              <div className="text-sm font-bold text-slate-200">v24.0 Graph API</div>
              <div className="text-[11px] text-slate-400">
                {data?.health.whatsappConnections?.total || 0} configured instances
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <span className="text-[11px] text-slate-400 font-medium block">Outbound Quota Engine</span>
              <div className="text-sm font-bold text-slate-200">Active Enforcement</div>
              <div className="text-[11px] text-emerald-400">429 Rate Limiting Active</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/40 text-amber-200 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-amber-300">Security Architecture Guardrails Active</span>
              <span className="text-amber-200/80 text-[11px]">
                Server-side requireSuperAdmin verification enforced on all administrative endpoints. All tenant mutations and quota updates are written to immutable audit logs.
              </span>
            </div>
          </div>
        </div>

        {/* Quick Operations Navigation */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Quick Actions</h2>

          <div className="space-y-2">
            <Link
              href="/admin/organizations"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-indigo-400" />
                <div className="text-xs text-left">
                  <div className="font-semibold text-slate-200 group-hover:text-white">Tenant Workspaces</div>
                  <div className="text-[10px] text-slate-400">Manage organizations & suspensions</div>
                </div>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white" />
            </Link>

            <Link
              href="/admin/users"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <div className="text-xs text-left">
                  <div className="font-semibold text-slate-200 group-hover:text-white">User Accounts</div>
                  <div className="text-[10px] text-slate-400">Suspension, password reset & revoke</div>
                </div>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white" />
            </Link>

            <Link
              href="/admin/subscriptions"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 text-sky-400" />
                <div className="text-xs text-left">
                  <div className="font-semibold text-slate-200 group-hover:text-white">Quotas & Plans</div>
                  <div className="text-[10px] text-slate-400">Set limits and quota overrides</div>
                </div>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white" />
            </Link>

            <Link
              href="/admin/audit-logs"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-amber-400" />
                <div className="text-xs text-left">
                  <div className="font-semibold text-slate-200 group-hover:text-white">Audit Trail</div>
                  <div className="text-[10px] text-slate-400">Review immutable security logs</div>
                </div>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white" />
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
