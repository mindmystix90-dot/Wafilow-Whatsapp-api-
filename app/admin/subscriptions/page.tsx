"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { AdminAlert, AdminBadge, AdminModal } from "@/components/admin/AdminUI";
import { Search, RefreshCw, Sliders, Receipt } from "lucide-react";

interface SubscriptionItem {
  id: string;
  organizationId: string;
  organizationName: string;
  status: string;
  planTier: string;
  monthlyLimit: number;
  billingCycle: string;
  amountCents: number;
  currency: string;
  paymentStatus: string;
  paymentMethod: string;
  invoiceRef: string | null;
  notes: string | null;
  currentPeriodEnd: string;
  lastPaidAt: string | null;
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

const PLAN_DEFAULTS: Record<string, { limit: number; priceUsd: number }> = {
  free: { limit: 1000, priceUsd: 0 },
  starter: { limit: 5000, priceUsd: 29 },
  growth: { limit: 25000, priceUsd: 79 },
  pro: { limit: 50000, priceUsd: 199 },
  enterprise: { limit: 250000, priceUsd: 499 },
};

function formatAmount(amountCents: number, currency: string) {
  const value = (amountCents || 0) / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(value);
  } catch {
    return `${currency || "USD"} ${value.toFixed(2)}`;
  }
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [quotas, setQuotas] = useState<Record<string, QuotaItem>>({});
  const [billingSchemaReady, setBillingSchemaReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");

  // Manual Billing & Quota Modal
  const [editingSub, setEditingSub] = useState<SubscriptionItem | null>(null);
  const [editPlan, setEditPlan] = useState("starter");
  const [editLimit, setEditLimit] = useState<number>(5000);
  const [editStatus, setEditStatus] = useState<"active" | "suspended">("active");
  const [editBillingCycle, setEditBillingCycle] = useState("monthly");
  const [editAmountMajor, setEditAmountMajor] = useState("29.00");
  const [editCurrency, setEditCurrency] = useState("USD");
  const [editPaymentStatus, setEditPaymentStatus] = useState("paid");
  const [editPaymentMethod, setEditPaymentMethod] = useState("manual");
  const [editInvoiceRef, setEditInvoiceRef] = useState("");
  const [editPeriodEnd, setEditPeriodEnd] = useState("");
  const [editNotes, setEditNotes] = useState("");
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
      setBillingSchemaReady(subData.billingSchemaReady !== false);

      const qMap: Record<string, QuotaItem> = {};
      (quotaData.quotas || []).forEach((q: QuotaItem) => {
        qMap[q.organizationId] = q;
      });
      setQuotas(qMap);
      setError(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error loading subscriptions"
      );
    } finally {
      setLoading(false);
    }
  }, [search, planFilter]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) fetchSubscriptionsAndQuotas();
    });
    return () => {
      active = false;
    };
  }, [fetchSubscriptionsAndQuotas]);

  const openEditModal = (sub: SubscriptionItem) => {
    setEditingSub(sub);
    setEditPlan(sub.planTier);
    setEditLimit(sub.monthlyLimit);
    setEditStatus(sub.status === "suspended" ? "suspended" : "active");
    setEditBillingCycle(sub.billingCycle || "monthly");
    setEditAmountMajor(((sub.amountCents ?? 0) / 100).toFixed(2));
    setEditCurrency(sub.currency || "USD");
    setEditPaymentStatus(sub.paymentStatus || "paid");
    setEditPaymentMethod(sub.paymentMethod || "manual");
    setEditInvoiceRef(sub.invoiceRef || "");
    setEditPeriodEnd(
      sub.currentPeriodEnd
        ? new Date(sub.currentPeriodEnd).toISOString().slice(0, 10)
        : ""
    );
    setEditNotes(sub.notes || "");
  };

  const handleSaveManualBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const parsedAmount = Number.parseFloat(editAmountMajor);
      const amountCents = Number.isFinite(parsedAmount)
        ? Math.max(0, Math.round(parsedAmount * 100))
        : 0;

      const res = await fetch(
        `/api/admin/subscriptions/${editingSub.organizationId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planTier: editPlan,
            monthlyLimit: Number(editLimit),
            status: editStatus,
            billingCycle: editBillingCycle,
            amountCents,
            currency: editCurrency.trim().toUpperCase() || "USD",
            paymentStatus: editPaymentStatus,
            paymentMethod: editPaymentMethod,
            invoiceRef: editInvoiceRef.trim() || null,
            currentPeriodEnd: editPeriodEnd
              ? new Date(`${editPeriodEnd}T23:59:59.000Z`).toISOString()
              : null,
            notes: editNotes.trim() || null,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update billing and quota.");
      }

      setSuccessMsg(
        data.message ||
          `Billing and quota updated for "${editingSub.organizationName}".`
      );
      setEditingSub(null);
      fetchSubscriptionsAndQuotas();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error saving subscription changes"
      );
    } finally {
      setSaving(false);
    }
  };

  const paymentTone = (status: string) => {
    switch ((status || "").toLowerCase()) {
      case "paid":
      case "waived":
        return "emerald" as const;
      case "pending":
      case "trial":
        return "amber" as const;
      case "overdue":
        return "rose" as const;
      default:
        return "slate" as const;
    }
  };

  return (
    <AdminLayout
      title="Manual Billing, Plans & Quotas"
      subtitle="Manage tenant subscriptions, custom monthly quotas, invoices, and payment statuses directly without a payment gateway"
    >
      {error && (
        <AdminAlert
          variant="error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}
      {successMsg && (
        <AdminAlert
          variant="success"
          message={successMsg}
          onDismiss={() => setSuccessMsg(null)}
        />
      )}

      {!billingSchemaReady && (
        <AdminAlert
          variant="warning"
          message="TenantBilling table is not yet present in PostgreSQL. Plan and quota overrides still persist to Organization; run the additive billing migration to persist invoice refs, amounts, and notes."
        />
      )}

      {/* Plan Tier Catalog Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { name: "Free", limit: "1,000", price: "$0/mo", desc: "Evaluation & pilot" },
          { name: "Starter", limit: "5,000", price: "$29/mo", desc: "Small teams" },
          { name: "Growth", limit: "25,000", price: "$79/mo", desc: "Growing broadcasts" },
          { name: "Pro", limit: "50,000", price: "$199/mo", desc: "High-volume support" },
          { name: "Enterprise", limit: "250,000", price: "$499/mo", desc: "Dedicated fleet" },
        ].map((plan) => (
          <div
            key={plan.name}
            className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1 text-xs"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-slate-200">{plan.name}</span>
              <span className="font-mono text-emerald-400 font-bold text-[11px]">
                {plan.price}
              </span>
            </div>
            <div className="text-slate-300 font-mono text-[11px] font-semibold">
              {plan.limit} msgs/mo
            </div>
            <div className="text-[10px] text-slate-500">{plan.desc}</div>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by organization name or ID..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="button"
            onClick={fetchSubscriptionsAndQuotas}
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shrink-0"
          >
            Search
          </button>
        </div>

        <div className="flex gap-2">
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500"
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
            className="p-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 shrink-0"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {loading && subscriptions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/80 border border-slate-800 rounded-2xl">
            Loading billing and quota metrics...
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/80 border border-slate-800 rounded-2xl">
            No subscriptions found.
          </div>
        ) : (
          subscriptions.map((sub) => {
            const quotaInfo = quotas[sub.organizationId];
            const used = quotaInfo?.usedThisMonth ?? 0;
            const limit = sub.monthlyLimit;
            const pct =
              limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

            return (
              <div
                key={sub.id}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-white break-words">
                      {sub.organizationName}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {formatAmount(sub.amountCents, sub.currency)} /{" "}
                      {sub.billingCycle}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <AdminBadge tone="indigo">{sub.planTier}</AdminBadge>
                    <AdminBadge tone={paymentTone(sub.paymentStatus)}>
                      {sub.paymentStatus}
                    </AdminBadge>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-mono">
                      {used.toLocaleString()} / {limit.toLocaleString()} msgs
                    </span>
                    <span className="font-semibold text-slate-300">{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        used >= limit
                          ? "bg-rose-500"
                          : pct >= 80
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span>
                    Method:{" "}
                    <span className="text-slate-200 capitalize">
                      {sub.paymentMethod.replace("_", " ")}
                    </span>
                  </span>
                  <span>
                    Due: {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                  </span>
                </div>

                {sub.invoiceRef && (
                  <div className="text-[10px] font-mono text-slate-400">
                    Invoice: {sub.invoiceRef}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => openEditModal(sub)}
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 inline-flex items-center justify-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Edit Billing & Quota</span>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">Organization</th>
                <th className="p-4">Plan & Rate</th>
                <th className="p-4">Monthly Usage & Quota</th>
                <th className="p-4">Renewal / Invoice</th>
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
                  const pct =
                    limit > 0
                      ? Math.min(100, Math.round((used / limit) * 100))
                      : 0;
                  const isNearQuota = pct >= 80;
                  const isExceeded = used >= limit;

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-4">
                        <div className="font-semibold text-white">
                          {sub.organizationName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {sub.organizationId}
                        </div>
                      </td>

                      <td className="p-4">
                        <AdminBadge tone="indigo">{sub.planTier}</AdminBadge>
                        <div className="text-[11px] font-mono text-slate-300 mt-1">
                          {formatAmount(sub.amountCents, sub.currency)}{" "}
                          <span className="text-slate-500">
                            / {sub.billingCycle}
                          </span>
                        </div>
                      </td>

                      <td className="p-4 min-w-[200px]">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-slate-300 font-mono">
                            {used.toLocaleString()} / {limit.toLocaleString()}{" "}
                            msgs
                          </span>
                          <span
                            className={`font-semibold ${
                              isExceeded
                                ? "text-rose-400"
                                : isNearQuota
                                ? "text-amber-400"
                                : "text-emerald-400"
                            }`}
                          >
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              isExceeded
                                ? "bg-rose-500"
                                : isNearQuota
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>

                      <td className="p-4 text-slate-400 text-[11px]">
                        <div>
                          {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                        </div>
                        {sub.invoiceRef && (
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            {sub.invoiceRef}
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        <AdminBadge tone={paymentTone(sub.paymentStatus)}>
                          {sub.paymentStatus}
                        </AdminBadge>
                        <div className="text-[10px] text-slate-500 mt-1 capitalize">
                          {sub.paymentMethod.replace("_", " ")}
                        </div>
                      </td>

                      <td className="p-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditModal(sub)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors inline-flex items-center gap-1.5"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>Manage Billing</span>
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

      {/* Manual Billing & Quota Modal */}
      <AdminModal
        open={Boolean(editingSub)}
        onClose={() => setEditingSub(null)}
        title="Manual Billing, Plan & Quota"
        subtitle={editingSub?.organizationName}
        icon={<Receipt className="w-5 h-5 text-amber-400" />}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveManualBilling} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Plan Tier
              </label>
              <select
                value={editPlan}
                onChange={(e) => {
                  const nextPlan = e.target.value;
                  setEditPlan(nextPlan);
                  const defaults = PLAN_DEFAULTS[nextPlan];
                  if (defaults) {
                    setEditLimit(defaults.limit);
                    setEditAmountMajor(defaults.priceUsd.toFixed(2));
                  }
                }}
                className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
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
                Monthly Quota Override
              </label>
              <input
                type="number"
                required
                min={0}
                step={500}
                value={editLimit}
                onChange={(e) =>
                  setEditLimit(parseInt(e.target.value, 10) || 0)
                }
                className="w-full px-3 py-2.5 rounded-xl text-xs font-mono bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Billing Cycle
              </label>
              <select
                value={editBillingCycle}
                onChange={(e) => setEditBillingCycle(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Amount
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={editAmountMajor}
                onChange={(e) => setEditAmountMajor(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-xs font-mono bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Currency
              </label>
              <input
                type="text"
                maxLength={6}
                value={editCurrency}
                onChange={(e) => setEditCurrency(e.target.value.toUpperCase())}
                placeholder="USD"
                className="w-full px-3 py-2.5 rounded-xl text-xs font-mono bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Payment Status
              </label>
              <select
                value={editPaymentStatus}
                onChange={(e) => setEditPaymentStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
              >
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="trial">Trial</option>
                <option value="waived">Waived / Comp</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Payment Method
              </label>
              <select
                value={editPaymentMethod}
                onChange={(e) => setEditPaymentMethod(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
              >
                <option value="manual">Manual</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="invoice">Invoice</option>
                <option value="cash">Cash</option>
                <option value="complimentary">Complimentary</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Account Status
              </label>
              <select
                value={editStatus}
                onChange={(e) =>
                  setEditStatus(
                    e.target.value === "suspended" ? "suspended" : "active"
                  )
                }
                className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Invoice Reference
              </label>
              <input
                type="text"
                value={editInvoiceRef}
                onChange={(e) => setEditInvoiceRef(e.target.value)}
                placeholder="INV-2026-001"
                className="w-full px-3 py-2.5 rounded-xl text-xs font-mono bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Period End Date
              </label>
              <input
                type="date"
                value={editPeriodEnd}
                onChange={(e) => setEditPeriodEnd(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-xs font-mono bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Internal Billing Notes
            </label>
            <textarea
              rows={2}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Optional payment receipt notes, bank transfer reference, or custom agreement..."
              className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingSub(null)}
              className="px-4 py-2.5 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Billing & Quota"}
            </button>
          </div>
        </form>
      </AdminModal>
    </AdminLayout>
  );
}
