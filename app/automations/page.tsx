"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Bot, Plus, ArrowRight } from "lucide-react";

export default function AutomationsPage() {
  const [automations, setAutomations] = useState([
    {
      id: "auto_1",
      title: "Welcome Greeting Flow",
      trigger: "Customer sends their first incoming message",
      action: "Reply with interactive greeting menu & catalog link",
      enabled: true,
      executions: 1240,
    },
    {
      id: "auto_2",
      title: "Out of Office Autoresponder",
      trigger: "Message received outside working hours (18:00 - 09:00 UTC)",
      action: "Send automated availability notice and SLA expectation",
      enabled: true,
      executions: 489,
    },
    {
      id: "auto_3",
      title: "Order Tracking Keyword Bot",
      trigger: "Incoming message contains 'TRACK' or 'ORDER'",
      action: "Query order status API and respond with live tracking link",
      enabled: true,
      executions: 915,
    },
    {
      id: "auto_4",
      title: "Shopify Abandoned Checkout Recovery",
      trigger: "Cart abandoned > 30 minutes",
      action: "Dispatch WhatsApp template with dynamic discount voucher",
      enabled: false,
      executions: 312,
    },
  ]);

  const toggleSwitch = (id: string) => {
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  return (
    <AppLayout
      title="Automations & Chatbot Flows"
      subtitle="Automate conversational journeys, keyword responses, and e-commerce webhooks"
      action={
        <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          Create Automation Flow
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {automations.map((a) => (
          <div
            key={a.id}
            className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      {a.title}
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      {a.executions.toLocaleString()} executions triggered
                    </span>
                  </div>
                </div>

                {/* Toggle Button */}
                <button
                  onClick={() => toggleSwitch(a.id)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    a.enabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform shadow-sm ${
                      a.enabled ? "right-0.5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-2 mt-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-500 block text-[10px] uppercase">WHEN</span>
                  <span className="text-slate-800 dark:text-slate-200 mt-0.5 block">{a.trigger}</span>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400 block text-[10px] uppercase">THEN</span>
                  <span className="text-emerald-900 dark:text-emerald-200 mt-0.5 block">{a.action}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className={`font-semibold ${a.enabled ? "text-emerald-600" : "text-slate-400"}`}>
                {a.enabled ? "Active" : "Paused"}
              </span>
              <button className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                Edit Flow <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
