"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  X,
  Gauge,
} from "lucide-react";

interface SubscriptionItem {
  id: string;
  organizationId: string;
  organizationName: string;
  status: string;
  planTier: string;
  monthlyLimit: number;
  billingCycle: string;
  currentPeriodEnd: string;
  paymentStatus: string;
}

interface QuotaItem {
  organizationId: string;
  organizationName: string;
  planTier: string;
  monthlyLimit: number;
  usedThisMonth: number;
  remaining: number;
  resetDate: string;
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [quotas, setQuotas] = useState<Record<string, QuotaItem>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");

  // Edit Quota / Plan Modal
  const [editingSub, setEditingSub] = useState<SubscriptionItem | null>(null);
  const [editPlan, setEditPlan] = useState("starter");
  const [editLimit, setEditLimit] = useState<number>(5000);
  const [saving, setSaving] = useState(false);

  const fetchSubscriptionsAndQuotas = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (planFilter !== "all") params.set("plan", planFilter);

      const [subRes, quotaRes] = await Promise.all([
        fetch(`/api/admin/subscriptions?${params.toString()}`),
        fetch("/api/admin/quotas"),
      ]);

      if (!subRes.ok || !quotaRes.ok) {
        throw new Error("Failed to load subscriptions and quota overview.");
      }

      const subData = await subRes.json();
      const quotaData = await quotaRes.json();

      setSubscriptions(subData.subscriptions || []);

      const qMap: Record<string, QuotaItem> = {};
      (quotaData.quotas || []).forEach((q: QuotaItem) => {
        qMap[q.organizationId] = q;
      });
      setQuotas(qMap);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading subscriptions");
    } finally {
      setLoading(false);
    }
  }, [search, planFilter]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchSubscriptionsAndQuotas();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchSubscriptionsAndQuotas]);

  const openEditModal = (sub: SubscriptionItem) => {
    setEditingSub(sub);
    setEditPlan(sub.planTier);
    setEditLimit(sub.monthlyLimit);
  };

  const handleSaveQuotaOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/quotas/${editingSub.organizationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit: Number(editLimit),
          planTier: editPlan,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update quota override");
      }

      setSuccessMsg(`Quota override for '${editingSub.organizationName}' updated to ${Number(editLimit).toLocaleString()} messages/mo.`);
      setEditingSub(null);
      fetchSubscriptionsAndQuotas();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error updating quota override");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title="Subscriptions & Message Quotas"
      subtitle="Tenant billing plans, monthly outbound limits, and administrator quota overrides"
    >
      {/* Alert Notices */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by organization name or subscription ID..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="button"
            onClick={fetchSubscriptionsAndQuotas}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            Search
          </button>
        </div>

        <div className="flex gap-2">
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Plans</option>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>

          <button
            type="button"
            onClick={fetchSubscriptionsAndQuotas}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">Organization</th>
                <th className="p-4">Plan Tier</th>
                <th className="p-4">Monthly Usage & Quota</th>
                <th className="p-4">Renewal Date</th>
                <th className="p-4">Payment</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading && subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Loading subscription and quota metrics...
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => {
                  const quotaInfo = quotas[sub.organizationId];
                  const used = quotaInfo?.usedThisMonth ?? 0;
                  const limit = sub.monthlyLimit;
                  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                  const isNearQuota = pct >= 80;
                  const isExceeded = used >= limit;

                  return (
                    <tr key={sub.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-white">{sub.organizationName}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{sub.organizationId}</div>
                      </td>

                      <td className="p-4">
                        <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                          {sub.planTier}
                        </span>
                      </td>

                      <td className="p-4 min-w-[200px]">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-slate-300 font-mono">
                            {used.toLocaleString()} / {limit.toLocaleString()} msgs
                          </span>
                          <span
                            className={`font-semibold ${
                              isExceeded ? "text-rose-400" : isNearQuota ? "text-amber-400" : "text-emerald-400"
                            }`}
                          >
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              isExceeded ? "bg-rose-500" : isNearQuota ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>

                      <td className="p-4 text-slate-400 text-[11px]">
                        {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                      </td>

                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {sub.paymentStatus}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => openEditModal(sub)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors inline-flex items-center gap-1.5"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>Override Quota</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Override Quota Modal */}
      {editingSub && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Override Quota & Plan</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSub(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Update monthly outbound message limit for <span className="font-semibold text-white">{editingSub.organizationName}</span>. Rate limiting enforces a 429 response when this limit is exhausted.
            </p>

            <form onSubmit={handleSaveQuotaOverride} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Plan Tier
                </label>
                <select
                  value={editPlan}
                  onChange={(e) => {
                    const nextP = e.target.value;
                    setEditPlan(nextP);
                    const defaultLimits: Record<string, number> = {
                      free: 1000,
                      starter: 5000,
                      growth: 25000,
                      pro: 50000,
                      enterprise: 250000,
                    };
                    setEditLimit(defaultLimits[nextP] || 5000);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="free">Free Tier</option>
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Monthly Outbound Message Limit
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step={500}
                  value={editLimit}
                  onChange={(e) => setEditLimit(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Exceeding this value will immediately trigger HTTP 429 Too Many Requests on all outbound dispatches.
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSub(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Quota Limit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
