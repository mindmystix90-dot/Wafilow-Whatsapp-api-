"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Plus, CheckCircle2, Clock, Globe, Copy } from "lucide-react";

export default function TemplatesPage() {
  const [templates] = useState([
    {
      id: "tmpl_1",
      name: "order_confirmation_v2",
      category: "UTILITY",
      language: "en_US",
      status: "APPROVED",
      body: "Hi {{1}}, thank you for shopping with us! Your order #{{2}} has been confirmed and is being packaged. Track it here: {{3}}",
      updatedAt: "2 days ago",
    },
    {
      id: "tmpl_2",
      name: "spring_sale_promo_v1",
      category: "MARKETING",
      language: "en_US",
      status: "APPROVED",
      body: "Hello {{1}}! 🌸 Spring has arrived. Enjoy 20% off all catalog items this weekend using code SPRING20. Shop now: {{2}}",
      updatedAt: "5 days ago",
    },
    {
      id: "tmpl_3",
      name: "two_factor_auth_code",
      category: "AUTHENTICATION",
      language: "en_US",
      status: "APPROVED",
      body: "{{1}} is your Wafilow verification security code. For your protection, never share this code with anyone. Valid for 10 minutes.",
      updatedAt: "1 week ago",
    },
    {
      id: "tmpl_4",
      name: "feedback_request_nps",
      category: "MARKETING",
      language: "en_US",
      status: "PENDING",
      body: "Hi {{1}}, how was your recent purchase with us? Reply with 1 to 5 to rate your experience.",
      updatedAt: "1 hour ago",
    },
  ]);

  return (
    <AppLayout
      title="WhatsApp Message Templates"
      subtitle="Create and monitor Meta-approved Highly Structured Message (HSM) templates"
      action={
        <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((t) => (
          <div
            key={t.id}
            className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                    {t.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {t.category}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Globe className="w-3 h-3" /> {t.language}
                    </span>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                    t.status === "APPROVED"
                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                      : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                  }`}
                >
                  {t.status === "APPROVED" ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <Clock className="w-3 h-3" />
                  )}
                  {t.status}
                </span>
              </div>

              {/* WhatsApp Bubble Preview */}
              <div className="mt-3 p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                {t.body}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Updated {t.updatedAt}</span>
              <button className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium">
                <Copy className="w-3.5 h-3.5" /> Copy Code
              </button>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
