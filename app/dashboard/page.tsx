"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import Link from "next/link";
import {
  MessageSquare,
  Send,
  Users,
  CheckCircle2,
  ArrowUpRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  CheckCheck,
  AlertCircle,
  Beaker,
  Building2,
} from "lucide-react";

interface DashboardStats {
  totalMessages: number;
  totalOutbound: number;
  totalInbound: number;
  deliveredOutbound: number;
  readMessages: number;
  totalContacts: number;
  activeContacts: number;
  messagesSentToday?: number;
  messagesDeliveredToday?: number;
  openConversations?: number;
  deliveryRate: number;
  readRate: number;
}

interface RecentInquiry {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  direction: string;
  status: string;
  time: string;
  unread: boolean;
}

interface MetaConfigInfo {
  isConfigured: boolean;
  phoneNumberId: string;
  wabaId: string;
  hasAccessToken: boolean;
  verifyToken: string;
}

export default function DashboardPage() {
  const [environment, setEnvironment] = useState<"production" | "sandbox">("production");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInquiries, setRecentInquiries] = useState<RecentInquiry[]>([]);
  const [metaConfig, setMetaConfig] = useState<MetaConfigInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard/stats?environment=${environment}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
          setRecentInquiries(data.recentInquiries || []);
          setMetaConfig(data.metaConfig || null);
        }
      }
    } catch (err) {
      console.error("Failed to load dashboard metrics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/dashboard/stats?environment=${environment}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!ignore && data.success) {
            setStats(data.stats);
            setRecentInquiries(data.recentInquiries || []);
            setMetaConfig(data.metaConfig || null);
          }
        }
      } catch (err) {
        console.error("Failed to load dashboard metrics:", err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [environment]);

  return (
    <AppLayout
      title="Dashboard Overview"
      subtitle="Real-time database metrics, messaging volume, and active customer sessions"
      action={
        <div className="flex flex-wrap items-center gap-2">
          {/* Environment Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setEnvironment("production")}
              className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                environment === "production"
                  ? "bg-white dark:bg-[#0c1220] text-[#5938F5] dark:text-violet-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Production</span>
            </button>

            <button
              type="button"
              onClick={() => setEnvironment("sandbox")}
              className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                environment === "sandbox"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Beaker className="w-3.5 h-3.5" />
              <span>Sandbox</span>
            </button>
          </div>

          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1220] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            title="Refresh metrics from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#5938F5]" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/inbox"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5938F5] hover:bg-[#4d2ee0] text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Live Inbox</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Active Environment Status Banner */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            environment === "sandbox"
              ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200"
              : metaConfig?.isConfigured
              ? "bg-white dark:bg-[#0c1220] border-emerald-500/30 text-slate-900 dark:text-white shadow-sm"
              : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                environment === "sandbox"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  : metaConfig?.isConfigured
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {environment === "sandbox" ? (
                <Beaker className="w-5 h-5" />
              ) : metaConfig?.isConfigured ? (
                <Building2 className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">
                  {environment === "sandbox"
                    ? "Meta Developer Sandbox Environment Active"
                    : metaConfig?.isConfigured
                    ? "Meta WhatsApp Cloud API v24.0 Connected (Live)"
                    : "Production WhatsApp Not Connected"}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    environment === "sandbox"
                      ? "bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-400/40"
                      : metaConfig?.isConfigured
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {environment === "sandbox" ? "SANDBOX MODE" : "PRODUCTION LIVE"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                {environment === "sandbox"
                  ? "Displaying metrics for your Meta Developer Sandbox test channel. Test pings and messages sent in Sandbox do not reach live business customers."
                  : metaConfig?.isConfigured
                  ? `Active WABA ID ${metaConfig.wabaId} with Phone Number ID ${metaConfig.phoneNumberId}. Real customer inquiries and outbound delivery tracked.`
                  : "Connect your Meta Business account via Embedded Signup or configure credentials in Settings to start messaging live customers."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap transition-colors"
            >
              <span>Manage Connections</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Real Metrics Grid (Zero Fake Data) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric 1: Total Messages */}
          <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0c1220] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Total Messages</span>
              <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white font-mono">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              ) : (
                stats?.totalMessages ?? 0
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
              <span>{stats?.totalInbound ?? 0} Inbound</span>
              <span>·</span>
              <span>{stats?.totalOutbound ?? 0} Outbound</span>
            </div>
          </div>

          {/* Metric 2: Delivery Rate */}
          <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0c1220] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Delivery Rate</span>
              <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white font-mono">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              ) : stats?.totalOutbound && stats.totalOutbound > 0 ? (
                `${stats.deliveryRate}%`
              ) : (
                "0%"
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
              {stats?.deliveredOutbound ?? 0} of {stats?.totalOutbound ?? 0} confirmed delivered
            </div>
          </div>

          {/* Metric 3: Active Contacts */}
          <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0c1220] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Customer Contacts</span>
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white font-mono">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              ) : (
                stats?.totalContacts ?? 0
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
              {stats?.activeContacts ?? 0} active in directory
            </div>
          </div>

          {/* Metric 4: Read Receipts Ratio */}
          <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0c1220] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Read Rate</span>
              <CheckCircle2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white font-mono">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              ) : stats?.totalMessages && stats.totalMessages > 0 ? (
                `${stats.readRate}%`
              ) : (
                "0%"
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
              {stats?.readMessages ?? 0} messages confirmed read
            </div>
          </div>
        </div>

        {/* Quick Operations & Recent Inquiries Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions (1 col) */}
          <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0c1220] shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Quick Operations</h3>

            <div className="space-y-2.5">
              <Link
                href="/inbox"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 hover:border-indigo-500/50 bg-slate-50/70 dark:bg-slate-900/60 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-900 dark:text-white">
                      Live Customer Inbox
                    </div>
                    <div className="text-[11px] text-slate-500">Respond to customer chats in real time</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </Link>

              <Link
                href="/contacts"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 hover:border-blue-500/50 bg-slate-50/70 dark:bg-slate-900/60 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-900 dark:text-white">
                      Add New Contact
                    </div>
                    <div className="text-[11px] text-slate-500">Register recipient phone numbers</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </Link>

              <Link
                href="/settings"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 hover:border-emerald-500/50 bg-slate-50/70 dark:bg-slate-900/60 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-900 dark:text-white">
                      Send Test WhatsApp Ping
                    </div>
                    <div className="text-[11px] text-slate-500">Dispatch verified HSM template</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </Link>
            </div>
          </div>

          {/* Recent Inquiries List (2 cols) */}
          <div className="lg:col-span-2 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0c1220] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Recent Customer Sessions
              </h3>
              <Link
                href="/inbox"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
              >
                View all conversations &rarr;
              </Link>
            </div>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="text-xs">Loading database records...</span>
              </div>
            ) : recentInquiries.length === 0 ? (
              <div className="py-12 text-center rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No Customer Conversations Logged
                </div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Once you receive an incoming WhatsApp message or send a test template, active customer inquiries will appear here automatically.
                </p>
                <div className="pt-2">
                  <Link
                    href="/settings"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
                  >
                    Send Test Ping
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
                {recentInquiries.map((inq) => (
                  <Link
                    key={inq.id}
                    href={`/inbox?contactId=${inq.id}`}
                    className="flex items-center justify-between py-3.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-900/60 rounded-xl transition-colors group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-900 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {inq.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                            {inq.name}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {inq.phone}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {inq.lastMessage || "No messages logged yet"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-3">
                      <span className="text-[10px] text-slate-400 font-medium block">
                        {inq.time}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider ${
                          inq.direction === "inbound"
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {inq.direction}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
