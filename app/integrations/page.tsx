"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import {
  Search,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  FileSpreadsheet,
  Share2,
  Zap,
  BookOpen,
  ShoppingBag,
  Building2,
} from "lucide-react";

interface IntegrationItem {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: typeof FileSpreadsheet;
  iconBg: string;
  iconColor: string;
  connected: boolean;
  statusBadge?: string;
  docsUrl?: string;
}

const initialIntegrations: IntegrationItem[] = [
  {
    id: "google-sheets",
    name: "Google Sheets",
    category: "Productivity & Data",
    description: "Sync contacts, incoming inquiries, and order submissions automatically to spreadsheets.",
    icon: FileSpreadsheet,
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    connected: true,
    statusBadge: "Active Sync",
  },
  {
    id: "facebook-leads",
    name: "Facebook Leads",
    category: "Lead Generation",
    description: "Instantly capture incoming leads from Meta Lead Ads and trigger WhatsApp welcome messages.",
    icon: Share2,
    iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
    iconColor: "text-blue-600 dark:text-blue-400",
    connected: true,
    statusBadge: "Connected",
  },
  {
    id: "zapier",
    name: "Zapier",
    category: "Automation Hub",
    description: "Connect Wafilow with 5,000+ apps. Trigger workflows when new messages or contacts arrive.",
    icon: Zap,
    iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
    iconColor: "text-amber-600 dark:text-amber-400",
    connected: false,
  },
  {
    id: "notion",
    name: "Notion",
    category: "CRM & Knowledge",
    description: "Sync customer communication history and support requests directly into your Notion workspace.",
    icon: BookOpen,
    iconBg: "bg-slate-900/10 dark:bg-slate-100/10",
    iconColor: "text-slate-800 dark:text-slate-200",
    connected: false,
  },
  {
    id: "shopify",
    name: "Shopify",
    category: "E-Commerce",
    description: "Send automated order confirmations, shipping tracking updates, and abandoned cart alerts.",
    icon: ShoppingBag,
    iconBg: "bg-lime-500/10 dark:bg-lime-500/20",
    iconColor: "text-lime-600 dark:text-lime-400",
    connected: false,
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "Enterprise CRM",
    description: "Bi-directional contact syncing and deal pipeline timeline updates from WhatsApp chats.",
    icon: Building2,
    iconBg: "bg-orange-500/10 dark:bg-orange-500/20",
    iconColor: "text-orange-600 dark:text-orange-400",
    connected: false,
  },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>(initialIntegrations);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "connected" | "available">("all");
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const toggleConnection = (id: string) => {
    setConnectingId(id);
    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            const nextState = !item.connected;
            return {
              ...item,
              connected: nextState,
              statusBadge: nextState ? "Connected" : undefined,
            };
          }
          return item;
        })
      );
      setConnectingId(null);
    }, 600);
  };

  const filteredIntegrations = integrations.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeFilter === "connected") return matchesSearch && item.connected;
    if (activeFilter === "available") return matchesSearch && !item.connected;
    return matchesSearch;
  });

  return (
    <AppLayout
      title="Integrations Directory"
      subtitle="Connect Wafilow with your CRM, e-commerce stores, and automation platforms"
    >
      <div className="space-y-6">
        {/* Top Control Bar matching image.png */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search integrations by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-xs">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeFilter === "all"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All ({integrations.length})
            </button>
            <button
              onClick={() => setActiveFilter("connected")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeFilter === "connected"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Connected ({integrations.filter((i) => i.connected).length})
            </button>
            <button
              onClick={() => setActiveFilter("available")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeFilter === "available"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Available ({integrations.filter((i) => !i.connected).length})
            </button>
          </div>
        </div>

        {/* Integrations Grid matching image.png */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredIntegrations.map((item) => {
            const Icon = item.icon;
            const isBusy = connectingId === item.id;
            return (
              <div
                key={item.id}
                className="group p-5 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-indigo-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-950 dark:text-white flex items-center gap-1.5">
                          {item.name}
                        </h3>
                        <span className="text-[11px] font-medium text-slate-400">
                          {item.category}
                        </span>
                      </div>
                    </div>

                    {item.connected ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        {item.statusBadge || "Connected"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        Available
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    <span>Real-time webhook sync</span>
                  </span>

                  <button
                    onClick={() => toggleConnection(item.id)}
                    disabled={isBusy}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      item.connected
                        ? "bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shadow-indigo-600/20"
                    }`}
                  >
                    {isBusy ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : item.connected ? (
                      <span>Disconnect</span>
                    ) : (
                      <span>Connect</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
