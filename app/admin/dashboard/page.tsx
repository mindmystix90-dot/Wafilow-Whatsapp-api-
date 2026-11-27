"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import {
  Building2,
  Users,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
  Server,
  ArrowUpRight,
  AlertTriangle,
  CreditCard,
  Smartphone,
  TrendingUp,
  Wrench,
} from "lucide-react";

interface DashboardMetrics {
  organizations: {
    total: number;
    active: number;
    suspended: number;
  };
  users: {
    total: number;
    customers: number;
    admins: number;
    superAdmins: number;
    active: number;
    suspended: number;
  };
  messaging: {
    totalAllTime: number;
    sentThisMonth: number;
    delivered: number;
    read: number;
    failed: number;
  };
  whatsapp: {
    total: number;
    connected: number;
    disconnected: number;
    error: number;
  };
  subscriptions: {
    plans: Record<string, number>;
    estimatedMRR: number;
  };
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard/stats");
      if (!res.ok) {
        throw new Error("Failed to load platform metrics.");
      }
      const data = await res.json();
      setMetrics(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

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
  }, [loadData]);

  const handleRefresh = () => {
    setLoading(true);
    loadData();
  };

  const deliveryRate =
    metrics?.messaging && metrics.messaging.sentThisMonth > 0
      ? Math.min(
          100,
          Math.round(
            ((metrics.messaging.delivered + metrics.messaging.read) /
              Math.max(1, metrics.messaging.sentThisMonth)) *
              100
          )
        )
      : 100;

  return (
    <AdminLayout
      title="Platform Operations Center"
      subtitle="Super Admin governance, cross-tenant telemetry, WhatsApp health, and MRR metrics"
      action={
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Metrics</span>
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
        {/* Organizations */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Organizations</span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? "..." : metrics?.organizations.total.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span className="text-emerald-400 font-medium">
              {metrics?.organizations.active ?? 0} active
            </span>
            <span>•</span>
            <span className="text-rose-400 font-medium">
              {metrics?.organizations.suspended ?? 0} suspended
            </span>
          </div>
        </div>

        {/* Customer Accounts */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Customers</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? "..." : metrics?.users.customers.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="text-slate-300 font-medium">{metrics?.users.total ?? 0} total accounts</span>
            <span>({metrics?.users.active ?? 0} active)</span>
          </div>
        </div>

        {/* Monthly Messages & Delivery */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Month Messages</span>
            <MessageSquare className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? "..." : metrics?.messaging.sentThisMonth.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="text-emerald-400 font-medium">{deliveryRate}% delivery rate</span>
            <span>•</span>
            <span>{metrics?.messaging.totalAllTime.toLocaleString()} total</span>
          </div>
        </div>

        {/* Estimated MRR */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Estimated MRR</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            ${loading ? "..." : (metrics?.subscriptions.estimatedMRR ?? 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400">Across active organization subscriptions</div>
        </div>
      </div>

      {/* Main Grid: WhatsApp Overview & Subscription Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): WhatsApp Health & Message Delivery */}
        <div className="lg:col-span-2 space-y-6">
          {/* WhatsApp Fleet Health */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  WhatsApp Cloud API Fleet Status
                </h2>
              </div>
              <Link
                href="/admin/whatsapp"
                className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                <span>View All Connections</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Configured</span>
                <div className="text-xl font-bold text-slate-200">
                  {metrics?.whatsapp.total ?? 0}
                </div>
                <span className="text-[10px] text-slate-500 block">Total WABA links</span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 space-y-1">
                <span className="text-[10px] font-semibold text-emerald-400 uppercase">Connected</span>
                <div className="text-xl font-bold text-emerald-300">
                  {metrics?.whatsapp.connected ?? 0}
                </div>
                <span className="text-[10px] text-emerald-500 block">Ready to transmit</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Disconnected</span>
                <div className="text-xl font-bold text-slate-400">
                  {metrics?.whatsapp.disconnected ?? 0}
                </div>
                <span className="text-[10px] text-slate-500 block">Not configured</span>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/40 space-y-1">
                <span className="text-[10px] font-semibold text-rose-400 uppercase">Degraded</span>
                <div className="text-xl font-bold text-rose-400">
                  {metrics?.whatsapp.error ?? 0}
                </div>
                <span className="text-[10px] text-rose-500 block">Needs attention</span>
              </div>
            </div>

            {/* Delivery Stats Bar */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Outbound Delivery Breakdown (All Time)</span>
                <span>{metrics?.messaging.totalAllTime.toLocaleString()} total messages</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Sent</div>
                  <div className="text-sm font-bold text-slate-200 mt-0.5">
                    {metrics?.messaging.sentThisMonth.toLocaleString() ?? 0}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-emerald-400 text-[10px] uppercase font-semibold">Delivered</div>
                  <div className="text-sm font-bold text-emerald-300 mt-0.5">
                    {metrics?.messaging.delivered.toLocaleString() ?? 0}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-sky-400 text-[10px] uppercase font-semibold">Read</div>
                  <div className="text-sm font-bold text-sky-300 mt-0.5">
                    {metrics?.messaging.read.toLocaleString() ?? 0}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-rose-400 text-[10px] uppercase font-semibold">Failed</div>
                  <div className="text-sm font-bold text-rose-300 mt-0.5">
                    {metrics?.messaging.failed.toLocaleString() ?? 0}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Security & Guardrails */}
          <div className="p-5 rounded-2xl bg-amber-950/15 border border-amber-900/40 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-amber-200/90">
              <span className="font-semibold text-amber-300 block">
                Platform Security Invariants Active
              </span>
              <p>
                Strict server-side role validation (<code className="text-amber-200 font-mono">requireSuperAdmin</code>) enforces isolation. Normal customer registration cannot elevate to administrator privilege. Access tokens and cryptographic keys are encrypted and zero raw secrets are exposed.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Subscription Breakdown & Quick Actions */}
        <div className="space-y-6">
          {/* Plan Distribution */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Subscription Plans
                </h2>
              </div>
              <Link
                href="/admin/subscriptions"
                className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                <span>Manage</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {[
                { key: "free", label: "Free Tier", price: "$0/mo" },
                { key: "starter", label: "Starter", price: "$29/mo" },
                { key: "growth", label: "Growth", price: "$79/mo" },
                { key: "pro", label: "Pro", price: "$199/mo" },
                { key: "enterprise", label: "Enterprise", price: "$499/mo" },
              ].map((tier) => {
                const count = metrics?.subscriptions.plans[tier.key] || 0;
                return (
                  <div
                    key={tier.key}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-200 capitalize">{tier.label}</span>
                      <span className="text-[10px] text-slate-500 ml-2 font-mono">{tier.price}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-300">
                      {count} {count === 1 ? "org" : "orgs"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Administrative Shortcuts */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider pb-1 border-b border-slate-800/80">
              Operations
            </h2>

            <div className="space-y-2">
              <Link
                href="/admin/whatsapp"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <div className="text-xs text-left">
                    <div className="font-semibold text-slate-200 group-hover:text-white">
                      WhatsApp Fleet Overview
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Inspect phone numbers, WABAs, delivery telemetry
                    </div>
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
                    <div className="font-semibold text-slate-200 group-hover:text-white">
                      Customer Directory
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Detailed account view, status toggling, password reset
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white" />
              </Link>

              <Link
                href="/admin/maintenance"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="text-xs text-left">
                    <div className="font-semibold text-slate-200 group-hover:text-white">
                      Maintenance & Rollouts
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Maintenance mode, registration pause & feature gates
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white shrink-0" />
              </Link>

              <Link
                href="/admin/system"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Server className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="text-xs text-left">
                    <div className="font-semibold text-slate-200 group-hover:text-white">
                      System Diagnostics
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Database latency, webhook health & logs
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white shrink-0" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
