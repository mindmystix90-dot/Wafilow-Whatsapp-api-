"use client";

import AppLayout from "@/components/AppLayout";
import { Plus } from "lucide-react";

export default function TeamPage() {
  const members = [
    { name: "Alex Mercer", email: "alex@wafilow.com", role: "Super Admin", status: "Active", avatar: "A", assignedChats: 14 },
    { name: "Jessica Taylor", email: "jessica@wafilow.com", role: "Support Agent", status: "Active", avatar: "J", assignedChats: 28 },
    { name: "David Kim", email: "david@wafilow.com", role: "Campaign Manager", status: "Active", avatar: "D", assignedChats: 4 },
    { name: "Farah Nasser", email: "farah@wafilow.com", role: "Support Agent", status: "Active", avatar: "F", assignedChats: 19 },
  ];

  return (
    <AppLayout
      title="Team & Agent Management"
      subtitle="Manage human agents, assign conversation queues, and define roles"
      action={
        <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          Invite Team Member
        </button>
      }
    >
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned Conversations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {members.map((m, i) => (
                <tr key={i} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-xs">
                        {m.avatar}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{m.name}</div>
                        <div className="text-xs text-slate-400">{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {m.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      {m.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    {m.assignedChats} active chats
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
