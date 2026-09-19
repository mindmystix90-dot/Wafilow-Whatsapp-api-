"use client";

import AppLayout from "@/components/AppLayout";
import Link from "next/link";
import {
  Megaphone,
  MessageSquare,
  Send,
  Clock,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function CampaignsPage() {
  return (
    <AppLayout
      title="Broadcast Campaigns"
      subtitle="Mass notification engine and targeted WhatsApp customer broadcasts"
    >
      <div className="max-w-4xl mx-auto py-8">
        {/* Coming Soon Notice Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-10 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-6 border border-amber-200/60 dark:border-amber-800/40">
            <Megaphone className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 mb-4">
            <Clock className="w-3.5 h-3.5" />
            Coming Soon • Post Meta App Review
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Broadcast Engine in Development
          </h2>

          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            WhatsApp Business Cloud API enforces strict tier limits for unsolicited outbound broadcasts. During this MVP evaluation phase, broadcast scheduling is queued while the app undergoes Meta App Review for Tier 2 messaging volume (10,000 conversations/24h).
          </p>

          {/* Active Features Available Today */}
          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Fully Functional in this MVP
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-lg mx-auto">
              <Link
                href="/inbox"
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 bg-slate-50 dark:bg-slate-800/50 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                </div>
                <div className="font-semibold text-sm text-slate-900 dark:text-white">Live 1-to-1 Inbox</div>
                <p className="text-xs text-slate-500 mt-1">
                  Exchange real bi-directional WhatsApp messages with live webhook polling.
                </p>
              </Link>

              <Link
                href="/settings"
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 bg-slate-50 dark:bg-slate-800/50 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <div className="font-semibold text-sm text-slate-900 dark:text-white">Send Test Ping</div>
                <p className="text-xs text-slate-500 mt-1">
                  Dispatch real verified WhatsApp Cloud API template pings to any phone number.
                </p>
              </Link>
            </div>
          </div>

          {/* Planned Broadcast Capabilities */}
          <div className="mt-8 p-5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-left max-w-lg mx-auto">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
              Broadcast Roadmap Features:
            </span>
            <ul className="space-y-1.5 text-xs text-slate-500">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                HSM Template selection with dynamic parameter binding
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Audience tag filtering and opt-in status validation
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Real-time delivery & read receipts aggregation
              </li>
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
