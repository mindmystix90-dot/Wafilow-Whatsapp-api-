"use client";

import Link from "next/link";
import { ArrowRight, Plus, Zap } from "lucide-react";

interface ToolIntegration {
  name: string;
  category: string;
  bgColor: string;
  icon: React.ReactNode;
}

const TOOLS: ToolIntegration[] = [
  {
    name: "Google Sheets",
    category: "Spreadsheets",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
    icon: (
      <svg className="w-6 h-6 text-emerald-600 fill-current" viewBox="0 0 24 24">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H6v-2h6v2zm0-4H6v-2h6v2zm0-4H6V7h6v2zm6 8h-4v-2h4v2zm0-4h-4v-2h4v2zm0-4h-4V7h4v2z" />
      </svg>
    ),
  },
  {
    name: "Facebook Leads",
    category: "Ads & Leads",
    bgColor: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",
    icon: (
      <svg className="w-6 h-6 text-blue-600 fill-current" viewBox="0 0 24 24">
        <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
      </svg>
    ),
  },
  {
    name: "Zapier",
    category: "Automation",
    bgColor: "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800",
    icon: (
      <div className="w-6 h-6 text-orange-500 font-black text-2xl flex items-center justify-center">
        ✱
      </div>
    ),
  },
  {
    name: "Make (Integromat)",
    category: "Workflows",
    bgColor: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800",
    icon: (
      <div className="text-purple-600 font-black text-lg tracking-tighter">
        {"///"}
      </div>
    ),
  },
  {
    name: "HubSpot",
    category: "CRM",
    bgColor: "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800",
    icon: (
      <svg className="w-6 h-6 text-orange-600 fill-current" viewBox="0 0 24 24">
        <path d="M18.8 8.4V6.2c.7-.4 1.2-1.1 1.2-2 0-1.2-1-2.2-2.2-2.2-1.2 0-2.2 1-2.2 2.2 0 .9.5 1.6 1.2 2v2.2c-.8.3-1.5.8-2 1.4L8.7 6.4c.1-.3.2-.6.2-1 0-1.6-1.3-2.9-2.9-2.9S3.1 3.8 3.1 5.4c0 1.6 1.3 2.9 2.9 2.9.5 0 1-.1 1.4-.4l5.9 5.3c-.6.8-.9 1.8-.9 2.8 0 2.7 2.2 4.9 4.9 4.9s4.9-2.2 4.9-4.9c0-2.4-1.7-4.4-4-4.8v-2.8h.6zm-1.5-5.1c.5 0 .9.4.9.9s-.4.9-.9.9-.9-.4-.9-.9.4-.9.9-.9zM6 6.8c-.8 0-1.4-.6-1.4-1.4s.6-1.4 1.4-1.4 1.4.6 1.4 1.4-.6 1.4-1.4 1.4zm11.3 12.3c-1.9 0-3.4-1.5-3.4-3.4s1.5-3.4 3.4-3.4 3.4 1.5 3.4 3.4-1.5 3.4-3.4 3.4z"/>
      </svg>
    ),
  },
  {
    name: "Slack",
    category: "Team Chat",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
    icon: (
      <div className="font-bold text-xl text-rose-500">
        #
      </div>
    ),
  },
  {
    name: "Notion",
    category: "Notes & Data",
    bgColor: "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700",
    icon: (
      <div className="font-black text-xl text-slate-900 dark:text-white font-serif">
        N
      </div>
    ),
  },
  {
    name: "Google Calendar",
    category: "Scheduling",
    bgColor: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",
    icon: (
      <div className="font-bold text-sm text-blue-600 border-2 border-blue-600 rounded px-1">
        31
      </div>
    ),
  },
  {
    name: "WooCommerce",
    category: "E-commerce",
    bgColor: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800",
    icon: (
      <div className="font-extrabold text-xs text-purple-700 bg-purple-200 rounded px-1.5 py-0.5">
        Woo
      </div>
    ),
  },
  {
    name: "Shopify",
    category: "E-commerce",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
    icon: (
      <svg className="w-6 h-6 text-emerald-600 fill-current" viewBox="0 0 24 24">
        <path d="M15.4 3.7c-.1-.7-.8-1.2-1.5-1.1L8.3 3.6c-.6.1-1.1.6-1.1 1.2l-.7 13.9 11.2-1.4-2.3-13.6zm-1.8 1.4l.7 4.1-2.9-.5.7-4.1 1.5.5z"/>
      </svg>
    ),
  },
];

export default function IntegrationsSection() {
  return (
    <section id="integrations" className="py-20 sm:py-28 bg-[#f0f4ff]/70 dark:bg-[#070b16] border-b border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Title on Left, Button on Right */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/60 px-3.5 py-1 rounded-full mb-3">
              <Zap className="w-3.5 h-3.5" />
              <span>INTEGRATIONS</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-slate-950 dark:text-white tracking-tight">
              Connect with your <span className="text-violet-600 dark:text-violet-400">favorite tools</span>
            </h2>

            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl">
              Integrate seamlessly with 50+ tools to supercharge your business.
            </p>
          </div>

          <Link
            href="/settings"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-violet-600/25 transition-all self-start md:self-auto cursor-pointer"
          >
            <span>View All Integrations</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Integration Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-3">
          {TOOLS.map((tool) => (
            <div
              key={tool.name}
              className="p-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-md hover:border-violet-500/50 transition-all flex flex-col items-center justify-center text-center space-y-2.5 group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                {tool.icon}
              </div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                {tool.name}
              </span>
            </div>
          ))}

          {/* Plus More Card */}
          <Link
            href="/settings"
            className="p-4 rounded-2xl bg-white dark:bg-[#0c1220] border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-violet-500 transition-all flex flex-col items-center justify-center text-center space-y-2 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-400 group-hover:text-violet-600 group-hover:scale-110 transition-all">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-violet-600 transition-colors">
              + More
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
