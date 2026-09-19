"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Search, CheckCircle2, UserPlus } from "lucide-react";

export default function ContactsPage() {
  const [contacts] = useState([
    { id: "cnt_1", name: "Sarah Jenkins", phone: "+1 415-555-0192", tags: ["VIP", "North America"], optIn: true, lastActive: "10 mins ago" },
    { id: "cnt_2", name: "Carlos Gomez", phone: "+34 612 345 678", tags: ["Support", "Europe"], optIn: true, lastActive: "1 hour ago" },
    { id: "cnt_3", name: "Amina Al-Sayed", phone: "+971 50 123 4567", tags: ["Pre-Sales", "Middle East"], optIn: true, lastActive: "Yesterday" },
    { id: "cnt_4", name: "Liam O'Connor", phone: "+44 7700 900123", tags: ["Returning Buyer"], optIn: true, lastActive: "3 days ago" },
    { id: "cnt_5", name: "Elena Rostova", phone: "+49 151 23456789", tags: ["Cart Abandoner"], optIn: false, lastActive: "Last week" },
  ]);

  const [search, setSearch] = useState("");

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <AppLayout
      title="Contacts Directory"
      subtitle="Manage audience segments, opt-in statuses, and WhatsApp conversation history"
      action={
        <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium transition-colors shadow-sm">
          <UserPlus className="w-4 h-4" />
          Add Contact
        </button>
      }
    >
      <div className="space-y-4">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone number..."
              className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Contacts Table */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">WhatsApp Number</th>
                  <th className="py-3 px-4">Tags</th>
                  <th className="py-3 px-4">Opt-In Status</th>
                  <th className="py-3 px-4">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{c.name}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {c.phone}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.map((t, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          c.optIn
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {c.optIn ? <CheckCircle2 className="w-3 h-3" /> : null}
                        {c.optIn ? "Opted-In" : "Pending"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {c.lastActive}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
