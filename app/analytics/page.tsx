"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import {
  TrendingUp,
  Loader2,
  RefreshCw,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";

interface Stats {
  totalMessages: number;
  totalOutbound: number;
  totalInbound: number;
  deliveredOutbound: number;
  readMessages: number;
  totalContacts: number;
  activeContacts: number;
  deliveryRate: number;
  readRate: number;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/dashboard/stats", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/dashboard/stats", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!ignore && data.success) {
            setStats(data.stats);
          }
        }
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const total = stats?.totalMessages || 0;
  const outboundPct = total > 0 ? Math.round(((stats?.totalOutbound || 0) / total) * 100) : 50;
  const inboundPct = total > 0 ? 100 - outboundPct : 50;

  return (
    <AppLayout
      title="Analytics & Delivery Performance"
      subtitle="Real-time database reporting on WhatsApp message delivery, read status, and channel volume"
      action={
        <button
          onClick={fetchStats}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Stats
        </button>
      }
    >
      {/* Real Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Messages Logged
          </span>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : stats?.totalMessages ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {stats?.totalInbound ?? 0} in • {stats?.totalOutbound ?? 0} out
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Outbound Delivery Success
          </span>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            ) : (
              `${stats?.deliveryRate ?? 0}%`
            )}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {stats?.deliveredOutbound ?? 0} confirmed delivered
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Read Receipt Status
          </span>
          <div className="mt-2 text-2xl font-bold text-blue-600">
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            ) : (
              `${stats?.readRate ?? 0}%`
            )}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {stats?.readMessages ?? 0} marked as read
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Directory Contacts
          </span>
          <div className="mt-2 text-2xl font-bold text-violet-600">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : stats?.totalContacts ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {stats?.activeContacts ?? 0} active contacts
          </div>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">
            Direction Breakdown
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-700 dark:text-slate-300">Outbound Messages (Agent & Templates)</span>
                <span className="text-slate-500">
                  {stats?.totalOutbound ?? 0} msgs ({outboundPct}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${outboundPct}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-700 dark:text-slate-300">Inbound Messages (Customer Inquiries)</span>
                <span className="text-slate-500">
                  {stats?.totalInbound ?? 0} msgs ({inboundPct}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${inboundPct}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Real-time status updates via Meta Webhook</span>
            <Link href="/inbox" className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
              View in Live Inbox <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Advanced Cohort & SLA Metrics
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                Coming Soon
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Detailed time-series graphs (hourly volume, agent first-response time, CSAT ratings, and conversation cost optimization) will activate once multi-day message logs accumulate following Meta App Review approval.
            </p>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Agent Response SLA tracking (Queued for Post-Review)</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                <span>Meta WABA Tier Volume tracking (Up to 10k/day)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/dashboard"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
            >
              Back to Overview Dashboard &rarr;
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
