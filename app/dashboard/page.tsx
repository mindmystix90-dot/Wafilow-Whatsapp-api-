"use client";

import AppLayout from "@/components/AppLayout";
import Link from "next/link";
import {
  MessageSquare,
  Send,
  Users,
  CheckCircle2,
  ArrowUpRight,
  TrendingUp,
  ExternalLink,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <AppLayout
      title="Dashboard Overview"
      subtitle="Real-time metrics, messaging volume, and active customer sessions"
      action={
        <div className="flex gap-2">
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium transition-colors shadow-sm"
          >
            <Send className="w-4 h-4" />
            New Broadcast
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
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sent Today</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">1,482</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+14.2% from yesterday</span>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivery Rate</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">99.1%</div>
          <div className="mt-1 text-xs text-slate-500">1,469 successfully delivered</div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open / Read Rate</span>
            <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950 text-violet-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">88.4%</div>
          <div className="mt-1 text-xs text-slate-500">Average response time: 2m 40s</div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Contacts</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">6,390</div>
          <div className="mt-1 text-xs text-slate-500">5,820 opt-in active subscribers</div>
        </div>
      </div>

      {/* Main Grid: Recent Activity & Meta WABA Tier */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Broadcasts and Inbound Messages */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Recent Broadcast Campaigns</h3>
              <Link href="/campaigns" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                View all <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {[
                { name: "Weekend Flash Sale 20%", sent: "2,450 sent", read: "91% read", status: "Completed", time: "2 hours ago" },
                { name: "Order Confirmation Utility", sent: "128 sent", read: "99% read", status: "Active Trigger", time: "5 mins ago" },
                { name: "VIP Customer Loyalty Invitation", sent: "850 sent", read: "84% read", status: "Completed", time: "Yesterday" },
              ].map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="font-medium text-sm text-slate-900 dark:text-white">{c.name}</div>
                    <div className="text-xs text-slate-500">{c.sent} • {c.read}</div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      {c.status}
                    </span>
                    <div className="text-[11px] text-slate-400 mt-0.5">{c.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Active Customer Inquiries</h3>
              <Link href="/inbox" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                Go to Inbox <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {[
                { user: "Sarah Jenkins (+1 415-555-0192)", msg: "Hi, can I change my delivery address for order #4819?", time: "3m ago", unread: true },
                { user: "Carlos Gomez (+34 612 345 678)", msg: "Thank you for the quick confirmation!", time: "12m ago", unread: false },
                { user: "Amina Al-Sayed (+971 50 123 4567)", msg: "Do you offer international shipping to Dubai?", time: "28m ago", unread: true },
              ].map((m, i) => (
                <div key={i} className="flex items-start justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">{m.user}</span>
                      {m.unread && (
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">{m.msg}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">{m.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Meta WABA Health & Quick Stats */}
        <div className="space-y-6">
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-3">WhatsApp Cloud API Status</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Phone Number ID</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">109847291039482</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Messaging Tier</span>
                <span className="font-semibold text-emerald-600">Tier 2 (10,000 / 24h)</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Quality Rating</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> High Quality (Green)
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Webhook Status</span>
                <span className="font-semibold text-emerald-600">Active & Verified</span>
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
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">Automations Quick Switch</h3>
            <p className="text-xs text-slate-500 mb-4">Manage automated messaging triggers</p>

            <div className="space-y-3">
              {[
                { title: "Welcome Auto-Reply", desc: "First message greeting to new leads", on: true },
                { title: "Out of Office Reply", desc: "Replies after 18:00 UTC", on: true },
                { title: "Abandoned Cart Ping", desc: "Triggers 30 mins after checkout drops", on: true },
              ].map((a, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-xs text-slate-900 dark:text-white">{a.title}</div>
                    <div className="text-[11px] text-slate-500">{a.desc}</div>
                  </div>
                  <span className="w-8 h-4 rounded-full bg-emerald-500 relative cursor-pointer inline-block">
                    <span className="w-3.5 h-3.5 rounded-full bg-white absolute right-0.5 top-0.5 shadow-sm"></span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
