"use client";

import AppLayout from "@/components/AppLayout";
import Link from "next/link";
import { Bot, Clock, MessageSquare, CheckCircle2, ArrowRight, Zap } from "lucide-react";

export default function AutomationsPage() {
  return (
    <AppLayout
      title="Automations & Chatbot Flows"
      subtitle="Automate conversational journeys, keyword auto-replies, and e-commerce webhooks"
    >
      <div className="max-w-4xl mx-auto py-8">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-10 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto mb-6 border border-violet-200/60 dark:border-violet-800/40">
            <Bot className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 mb-4">
            <Clock className="w-3.5 h-3.5" />
            Coming Soon • Post Meta App Review
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Conversational Flow Builder
          </h2>

          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            Rule-based keyword auto-responders, welcome greetings, and webhook-triggered flows are currently in development. In this MVP release, all WhatsApp customer interactions are handled cleanly via the Live Inbox.
          </p>

          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
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
                <div className="font-semibold text-sm text-slate-900 dark:text-white">Live Inbox</div>
                <p className="text-xs text-slate-500 mt-1">
                  Reply manually to incoming customer messages in real time.
                </p>
              </Link>

              <Link
                href="/contacts"
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 bg-slate-50 dark:bg-slate-800/50 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <div className="font-semibold text-sm text-slate-900 dark:text-white">Contacts Directory</div>
                <p className="text-xs text-slate-500 mt-1">
                  View and manage customer phone numbers and tags.
                </p>
              </Link>
            </div>
          </div>

          <div className="mt-8 p-5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-left max-w-lg mx-auto">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
              Upcoming Automation Triggers:
            </span>
            <ul className="space-y-1.5 text-xs text-slate-500">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                First-time greeting autoresponder
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Out-of-office response outside business hours
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Keyword-based routing and auto-tagging
              </li>
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
