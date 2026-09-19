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
  Shield,
  Loader2,
  RefreshCw,
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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInquiries, setRecentInquiries] = useState<RecentInquiry[]>([]);
  const [metaConfig, setMetaConfig] = useState<MetaConfigInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/dashboard/stats", { cache: "no-store" });
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
      try {
        const res = await fetch("/api/dashboard/stats", { cache: "no-store" });
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
  }, []);

  return (
    <AppLayout
      title="Dashboard Overview"
      subtitle="Real-time metrics, messaging volume, and active customer sessions"
      action={
        <div className="flex gap-2">
          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium transition-colors shadow-sm"
          >
            <Send className="w-4 h-4" />
            Send Test Ping
          </Link>
          <Link
            href="/inbox"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium transition-colors shadow-sm"
          >
            <MessageSquare className="w-4 h-4" />
            Live Inbox
          </Link>
        </div>
      }
    >
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Messages Sent Today</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : stats?.messagesSentToday ?? stats?.totalOutbound ?? 0}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 font-medium">
            <span>{stats?.totalOutbound ?? 0} total outbound logged</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Messages Delivered Today</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            ) : (
              stats?.messagesDeliveredToday ?? stats?.deliveredOutbound ?? 0
            )}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {stats?.deliveryRate ?? 0}% overall delivery rate
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Contacts</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            ) : (
              stats?.activeContacts ?? stats?.totalContacts ?? 0
            )}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {stats?.totalContacts ?? 0} total contacts in directory
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open Conversations</span>
            <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950 text-violet-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            ) : (
              stats?.openConversations ?? stats?.activeContacts ?? 0
            )}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {stats?.readRate ?? 0}% read receipt status rate
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Activity & Meta WABA Tier */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Broadcasts and Inbound Messages */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Inquiries from real database */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Active Customer Inquiries</h3>
                <p className="text-xs text-slate-500">Real customer conversations tracked in database</p>
              </div>
              <Link href="/inbox" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                Go to Inbox <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <div className="py-8 flex items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : recentInquiries.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No customer conversations yet</p>
                <p className="text-xs text-slate-400 mt-0.5">Incoming WhatsApp messages will appear here instantly</p>
                <Link
                  href="/inbox"
                  className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
                >
                  Start New Chat in Inbox
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentInquiries.map((inquiry) => (
                  <Link
                    key={inquiry.id}
                    href="/inbox"
                    className="flex items-start justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition-colors"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                          {inquiry.name}
                        </span>
                        <span className="text-xs font-mono text-slate-400">({inquiry.phone})</span>
                        {inquiry.unread && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">
                        {inquiry.direction === "outbound" && (
                          <span className="font-medium text-emerald-600 mr-1">You:</span>
                        )}
                        {inquiry.lastMessage}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-[11px] text-slate-400 block">{inquiry.time}</span>
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mt-1 ${
                          inquiry.status === "read"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            : inquiry.status === "delivered"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : inquiry.status === "failed"
                            ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {inquiry.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Broadcast Campaigns info */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Broadcast Campaigns</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  Coming Soon (Post Meta Review)
                </span>
              </div>
              <Link href="/campaigns" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                Details <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Mass broadcast notifications to segmented audiences require Meta Cloud API Tier 2 messaging approval. During the current MVP evaluation phase, use the real 1-to-1 Live Inbox or Send Test Ping tool.
            </p>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Single Message Dispatch (Live)</span>
                <span className="text-[11px] text-slate-400">Available now via Live Inbox or Test Route</span>
              </div>
              <Link
                href="/settings"
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors"
              >
                Send Test Template
              </Link>
            </div>
          </div>
        </div>

        {/* Right Col: Meta WABA Health & Quick Actions */}
        <div className="space-y-6">
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-3">WhatsApp Cloud API Status</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Phone Number ID</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {metaConfig?.phoneNumberId || "Not set"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">WABA ID</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {metaConfig?.wabaId || "Not set"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Access Token</span>
                <span className="font-semibold text-xs text-emerald-600">
                  {metaConfig?.hasAccessToken ? "Configured (Server-Side)" : "Missing"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Webhook Status</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active & Verified
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Link
                href="/settings"
                className="w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                Configure Meta Credentials
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">Workspace Quick Links</h3>
            <p className="text-xs text-slate-500 mb-4">Core functional modules</p>

            <div className="space-y-2 text-xs">
              <Link
                href="/inbox"
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between font-medium text-slate-800 dark:text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  Live Inbox & Chat Polling
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
              <Link
                href="/contacts"
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between font-medium text-slate-800 dark:text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Contacts Directory
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
              <Link
                href="/settings"
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between font-medium text-slate-800 dark:text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-violet-600" />
                  API Settings & Webhooks
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

