"use client";

import AppLayout from "@/components/AppLayout";
import Link from "next/link";
import { CheckCircle2, Clock, Globe, ExternalLink, Send, FileText } from "lucide-react";

export default function TemplatesPage() {
  return (
    <AppLayout
      title="WhatsApp Message Templates"
      subtitle="Meta-approved Highly Structured Message (HSM) templates for business-initiated conversations"
      action={
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium transition-colors shadow-sm"
        >
          <Send className="w-4 h-4" />
          Test Pre-Approved Template
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Info Banner */}
        <div className="p-4 sm:p-5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-blue-950 dark:text-blue-200">
                Meta WhatsApp Cloud API Template Policy
              </h3>
              <p className="text-xs text-blue-800 dark:text-blue-300 mt-0.5 max-w-2xl leading-relaxed">
                To initiate a conversation outside the 24-hour customer care window, Meta requires pre-approved HSM templates. The default <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded text-blue-900 dark:text-blue-200">hello_world</code> template is pre-approved for every WhatsApp Business Account.
              </p>
            </div>
          </div>
          <a
            href="https://business.facebook.com/wa/manage/message-templates"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 text-xs font-medium hover:bg-blue-50 dark:hover:bg-slate-800 whitespace-nowrap self-start sm:self-auto"
          >
            Meta Template Manager
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Real Meta Template Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Pre-Approved Template */}
          <div className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-white dark:bg-slate-900 shadow-sm relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">hello_world</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Meta Pre-Approved
                </span>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                UTILITY
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/70 p-3.5 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800 leading-relaxed mb-4">
              Hello World! Welcome and congratulations!! This message demonstrates your ability to send a WhatsApp message notification from the Cloud API, hosted by Meta.
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>en_US (All Regions)</span>
              </div>
              <Link
                href="/settings"
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                Send via API Settings &rarr;
              </Link>
            </div>
          </div>

          {/* Custom Template Editor Preview */}
          <div className="p-5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-slate-600 dark:text-slate-300">
                    custom_template_builder
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Coming Soon
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Direct in-app template creation using Meta Graph API <code className="text-[11px] bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">POST /&#123;WABA_ID&#125;/message_templates</code> and automated approval webhooks will be unlocked in the next release following Meta review.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Managed via Meta Business Manager</span>
              <a
                href="https://business.facebook.com/wa/manage/message-templates"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
              >
                Create in Meta &rarr;
              </a>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
