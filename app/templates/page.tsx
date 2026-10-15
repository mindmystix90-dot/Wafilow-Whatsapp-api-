"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Plus,
  FileText,
  Search,
  Check,
  XCircle,
  Copy,
} from "lucide-react";

interface TemplateItem {
  id: string;
  name: string;
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
  language: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  body: string;
  lastUpdated: string;
}

const initialTemplates: TemplateItem[] = [
  {
    id: "welcome-msg",
    name: "Welcome Message",
    category: "UTILITY",
    language: "en_US",
    status: "APPROVED",
    body: "Hi {{1}}, welcome to Wafilow! We're thrilled to have you onboard. Let us know if you need any assistance getting started.",
    lastUpdated: "Today",
  },
  {
    id: "order-update",
    name: "Order Update",
    category: "UTILITY",
    language: "en_US",
    status: "APPROVED",
    body: "Hi {{1}}, your order #{{2}} has been confirmed and is now being processed. Track your package live here: {{3}}",
    lastUpdated: "Yesterday",
  },
  {
    id: "discount-offer",
    name: "Discount Offer",
    category: "MARKETING",
    language: "en_US",
    status: "PENDING",
    body: "Exclusive WhatsApp Deal! Enjoy 25% off our Pro & Enterprise plans this week only with code {{1}}.",
    lastUpdated: "2 days ago",
  },
  {
    id: "support-response",
    name: "Support Response",
    category: "UTILITY",
    language: "en_US",
    status: "APPROVED",
    body: "Hello {{1}}, our support specialist {{2}} has been assigned to your ticket #{{3}}. We will reply shortly.",
    lastUpdated: "3 days ago",
  },
  {
    id: "hello-world",
    name: "hello_world",
    category: "UTILITY",
    language: "en_US",
    status: "APPROVED",
    body: "Hello World! Welcome and congratulations! This message demonstrates your ability to send a WhatsApp message notification from the Cloud API, hosted by Meta.",
    lastUpdated: "Pre-approved",
  },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>(initialTemplates);
  const [activeTab, setActiveTab] = useState<"ALL" | "APPROVED" | "PENDING" | "REJECTED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Template Modal state
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<"UTILITY" | "MARKETING">("UTILITY");
  const [newBody, setNewBody] = useState("");

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newBody.trim()) return;

    const created: TemplateItem = {
      id: `tmpl-${Date.now()}`,
      name: newName.trim().toLowerCase().replace(/\s+/g, "_"),
      category: newCategory,
      language: "en_US",
      status: "PENDING",
      body: newBody.trim(),
      lastUpdated: "Just now",
    };

    setTemplates([created, ...templates]);
    setShowModal(false);
    setNewName("");
    setNewBody("");
  };

  const copyTemplateBody = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.body.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === "ALL") return matchesSearch;
    return matchesSearch && t.status === activeTab;
  });

  return (
    <AppLayout
      title="WhatsApp Templates"
      subtitle="Create and manage your message templates."
      action={
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Template</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Top Controls matching image.png */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          {/* Filter Tabs matching image.png */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-xs">
            {(["ALL", "APPROVED", "PENDING", "REJECTED"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-all capitalize cursor-pointer ${
                  activeTab === tab
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {tab === "ALL" ? `All (${templates.length})` : tab.toLowerCase()}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Templates List Table matching image.png */}
        <div className="border border-slate-200/80 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-[#0c1220] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-5">Template Name</th>
                  <th className="py-3 px-5">Category</th>
                  <th className="py-3 px-5">Language</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-200">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-950 dark:text-white font-mono text-xs sm:text-sm">
                            {t.name}
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-1 max-w-md mt-0.5">
                            {t.body}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {t.category}
                      </span>
                    </td>
                    <td className="py-4 px-5 font-mono text-xs text-slate-500">
                      {t.language}
                    </td>
                    <td className="py-4 px-5">
                      {t.status === "APPROVED" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Approved
                        </span>
                      ) : t.status === "PENDING" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <XCircle className="w-3 h-3" />
                          Rejected
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => copyTemplateBody(t.id, t.body)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer"
                          title="Copy message body"
                        >
                          {copiedId === t.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <Link
                          href="/settings"
                          className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                        >
                          Send Ping
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Template Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-950 dark:text-white">
                Create WhatsApp Template
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Template Name (lowercase, no spaces)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. order_shipping_notification"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as "UTILITY" | "MARKETING")}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="UTILITY">UTILITY (Account, alerts, order updates)</option>
                  <option value="MARKETING">MARKETING (Offers, announcements, promotions)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Body Text (use &#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125; for dynamic variables)
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Hi {{1}}, your order {{2}} is on the way!"
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
