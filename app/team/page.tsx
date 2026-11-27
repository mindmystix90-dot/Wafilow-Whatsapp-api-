"use client";

import AppLayout from "@/components/AppLayout";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { UserCheck, Clock, MessageSquare } from "lucide-react";

export default function TeamPage() {
  const { data: session } = useSession();
  const displayName = session?.user?.name || "Workspace Administrator";
  const displayEmail = session?.user?.email || "Authenticated Account";
  const initial = (displayName || displayEmail || "W").charAt(0).toUpperCase();

  return (
    <AppLayout
      title="Team & Agent Management"
      subtitle="Workspace administrators and customer support agent seat management"
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Active Admin Workspace Seat */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Active Administrator</h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              Active Seat
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#5938F5] text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
                {initial}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">{displayName}</div>
                <div className="text-xs text-slate-500 font-mono truncate">{displayEmail}</div>
              </div>
            </div>
            <div className="sm:text-right shrink-0">
              <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                Workspace Admin
              </span>
              <div className="text-[11px] text-slate-400 mt-1">Full Meta API Credentials Access</div>
            </div>
          </div>
        </div>

        {/* Coming Soon: Multi-Agent Queues */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-5 border border-amber-200/60 dark:border-amber-800/40">
            <UserCheck className="w-7 h-7" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 mb-3">
            <Clock className="w-3.5 h-3.5" />
            Coming Soon • Post Meta App Review
          </div>

          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Multi-Agent Seats & Conversation Assignment Queues
          </h3>

          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
            Multi-agent ticket routing, team conversation transfers, and agent performance auditing will be available in the post-review release. Currently, all incoming chats route directly to the Live Inbox.
          </p>

          <div className="mt-6 flex justify-center">
            <Link
              href="/inbox"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#5938F5] hover:bg-[#4d2ee0] text-white text-xs font-semibold transition-all shadow-sm"
            >
              <MessageSquare className="w-4 h-4" />
              Open Live Shared Inbox
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
