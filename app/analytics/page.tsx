"use client";

import AppLayout from "@/components/AppLayout";
import { TrendingUp, CheckCircle } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <AppLayout
      title="Analytics & Delivery Performance"
      subtitle="Detailed reporting on delivery rates, read receipts, cost optimization, and response SLAs"
    >
      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Messages Dispatched</span>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">48,290</div>
          <div className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> +18% past 30 days
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivery Success</span>
          <div className="mt-2 text-2xl font-bold text-emerald-600">99.4%</div>
          <div className="mt-1 text-xs text-slate-500">48,000 / 48,290 delivered</div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Read Rate</span>
          <div className="mt-2 text-2xl font-bold text-blue-600">89.2%</div>
          <div className="mt-1 text-xs text-slate-500">Industry benchmark: 75%</div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Agent Response</span>
          <div className="mt-2 text-2xl font-bold text-violet-600">1m 45s</div>
          <div className="mt-1 text-xs text-slate-500">First-contact SLA met: 98%</div>
        </div>
      </div>

      {/* Breakdown Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">Message Category Distribution</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-700 dark:text-slate-300">Marketing Broadcasts</span>
                <span className="text-slate-500">28,500 msgs (59%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: "59%" }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-700 dark:text-slate-300">Utility / Order Updates</span>
                <span className="text-slate-500">14,200 msgs (29%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: "29%" }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-700 dark:text-slate-300">Service / Support Conversations</span>
                <span className="text-slate-500">4,190 msgs (9%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full" style={{ width: "9%" }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-700 dark:text-slate-300">Authentication / OTPs</span>
                <span className="text-slate-500">1,400 msgs (3%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: "3%" }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">Meta WABA Tier & Limits</h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">Current Messaging Tier</span>
                <span className="text-slate-500">Tier 2: Up to 10,000 unique business-initiated conversations/day</span>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                Tier 2
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">Account Phone Status</span>
                <span className="text-slate-500">Verified official business profile badge active</span>
              </div>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Verified
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">Quality Rating</span>
                <span className="text-slate-500">Calculated over past 7 days based on user blocks & reports</span>
              </div>
              <span className="text-emerald-600 font-bold">High (Green)</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
