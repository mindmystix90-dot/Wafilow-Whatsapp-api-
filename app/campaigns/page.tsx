"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Plus } from "lucide-react";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([
    {
      id: "cmp_1",
      name: "March Spring Discount Blast",
      template: "spring_sale_promo_v1",
      audience: "All Active Customers (2,450)",
      sent: 2450,
      delivered: 2428,
      read: 2210,
      status: "Completed",
      date: "Mar 18, 2026",
    },
    {
      id: "cmp_2",
      name: "Weekly Cart Recovery Reminder",
      template: "cart_recovery_discount",
      audience: "Abandoned Cart Users (312)",
      sent: 312,
      delivered: 309,
      read: 285,
      status: "Completed",
      date: "Mar 17, 2026",
    },
    {
      id: "cmp_3",
      name: "New Arrivals - Summer Sneaker Drops",
      template: "new_arrival_alert",
      audience: "Sneaker Heads Tag (890)",
      sent: 0,
      delivered: 0,
      read: 0,
      status: "Scheduled",
      date: "Tomorrow, 09:00 AM",
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;

    setCampaigns([
      {
        id: `cmp_${Date.now()}`,
        name: newCampaignName,
        template: "order_update_notification",
        audience: "VIP Customers (450)",
        sent: 450,
        delivered: 445,
        read: 390,
        status: "Processing",
        date: "Just now",
      },
      ...campaigns,
    ]);
    setNewCampaignName("");
    setShowModal(false);
  };

  return (
    <AppLayout
      title="Broadcast Campaigns"
      subtitle="Dispatch and schedule marketing campaigns and transactional broadcast notifications"
      action={
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Broadcast
        </button>
      }
    >
      <div className="space-y-6">
        {/* Campaign List */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Campaign Name</th>
                  <th className="py-3 px-4">HSM Template</th>
                  <th className="py-3 px-4">Audience</th>
                  <th className="py-3 px-4">Delivery Rate</th>
                  <th className="py-3 px-4">Read Rate</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {campaigns.map((c) => {
                  const deliveryPct = c.sent > 0 ? Math.round((c.delivered / c.sent) * 100) : 0;
                  const readPct = c.sent > 0 ? Math.round((c.read / c.sent) * 100) : 0;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {c.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">
                        {c.template}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {c.audience}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 dark:text-white">{c.delivered}</span>{" "}
                        <span className="text-xs text-emerald-600 font-medium">({deliveryPct}%)</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 dark:text-white">{c.read}</span>{" "}
                        <span className="text-xs text-blue-600 font-medium">({readPct}%)</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                            c.status === "Completed"
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                              : c.status === "Scheduled"
                              ? "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
                              : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {c.date}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal for Creating Campaign */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">New Broadcast Campaign</h3>
            <p className="text-xs text-slate-500 mb-4">Send a WhatsApp Business message to your contact segment</p>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Campaign Title
                </label>
                <input
                  type="text"
                  required
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  placeholder="e.g. VIP Member Discount Announcement"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Meta HSM Template
                </label>
                <select className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white">
                  <option>spring_sale_promo_v1 (Marketing)</option>
                  <option>cart_recovery_discount (Marketing)</option>
                  <option>order_update_notification (Utility)</option>
                  <option>otp_verification_code (Authentication)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Audience
                </label>
                <select className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white">
                  <option>All Active Opt-in Contacts (5,820)</option>
                  <option>VIP Customers (450)</option>
                  <option>Abandoned Cart Leads (312)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Launch Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
