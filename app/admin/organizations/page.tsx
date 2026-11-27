"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { AdminAlert, AdminBadge, AdminModal } from "@/components/admin/AdminUI";
import {
  Building2,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Users,
  MessageSquare,
  Pencil,
  Phone,
} from "lucide-react";

interface OrganizationSummary {
  id: string;
  name: string;
  status: string;
  planTier: string;
  monthlyLimit: number;
  displayPhoneNumber?: string | null;
  phoneNumberId?: string | null;
  wabaId?: string | null;
  userCount: number;
  contactCount: number;
  messageCount: number;
  whatsappStatus: {
    production: string;
    sandbox: string;
  };
  createdAt: string;
}

const PLAN_DEFAULT_LIMITS: Record<string, number> = {
  free: 1000,
  starter: 5000,
  growth: 25000,
  pro: 50000,
  enterprise: 250000,
};

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgPlan, setNewOrgPlan] = useState("starter");
  const [creating, setCreating] = useState(false);

  // Edit Organization Modal
  const [editingOrg, setEditingOrg] = useState<OrganizationSummary | null>(null);
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "suspended">("active");
  const [editPlan, setEditPlan] = useState("starter");
  const [editLimit, setEditLimit] = useState<number>(5000);
  const [editDisplayPhone, setEditDisplayPhone] = useState("");
  const [editPhoneNumberId, setEditPhoneNumberId] = useState("");
  const [editWabaId, setEditWabaId] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Suspend/Reactivate Confirm Modal
  const [confirmToggleOrg, setConfirmToggleOrg] =
    useState<OrganizationSummary | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const loadOrganizations = useCallback(
    async (searchTerm?: string) => {
      try {
        const params = new URLSearchParams();
        const q = searchTerm !== undefined ? searchTerm : search;
        if (q) params.set("search", q);
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (planFilter !== "all") params.set("plan", planFilter);

        const res = await fetch(`/api/admin/organizations?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load organizations.");
        const data = await res.json();
        setOrganizations(data.organizations || []);
        setError(null);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Error loading organizations"
        );
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter, planFilter]
  );

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadOrganizations();
    });
    return () => {
      active = false;
    };
  }, [loadOrganizations]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    loadOrganizations(search);
  };

  const handleRefresh = () => {
    setLoading(true);
    loadOrganizations();
  };

  const openEditModal = (org: OrganizationSummary) => {
    setEditingOrg(org);
    setEditName(org.name);
    setEditStatus(org.status === "suspended" ? "suspended" : "active");
    setEditPlan(org.planTier || "starter");
    setEditLimit(org.monthlyLimit || 5000);
    setEditDisplayPhone(org.displayPhoneNumber || "");
    setEditPhoneNumberId(org.phoneNumberId || "");
    setEditWabaId(org.wabaId || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    setSavingEdit(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/organizations/${editingOrg.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          status: editStatus,
          planTier: editPlan,
          monthlyLimit: Number(editLimit),
          displayPhoneNumber: editDisplayPhone.trim() || null,
          phoneNumberId: editPhoneNumberId.trim() || null,
          wabaId: editWabaId.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update organization.");
      }
      setSuccessMsg(`Organization "${editName.trim()}" updated successfully.`);
      setEditingOrg(null);
      loadOrganizations();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error updating organization"
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const executeToggleStatus = async () => {
    if (!confirmToggleOrg) return;
    const org = confirmToggleOrg;
    const nextStatus = org.status === "active" ? "suspended" : "active";

    setActionInProgress(org.id);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/organizations/${org.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update organization status");
      }
      setSuccessMsg(
        `Organization "${org.name}" is now ${nextStatus.toUpperCase()}.`
      );
      setConfirmToggleOrg(null);
      loadOrganizations();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error updating organization"
      );
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setCreating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName.trim(), planTier: newOrgPlan }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create organization");
      }
      setSuccessMsg(`Workspace "${newOrgName.trim()}" provisioned successfully.`);
      setShowCreateModal(false);
      setNewOrgName("");
      loadOrganizations();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error creating organization"
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminLayout
      title="Tenant Organizations"
      subtitle="Multi-tenant directory, full workspace edits, WhatsApp bindings, and suspension controls"
      action={
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Organization</span>
        </button>
      }
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
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
            type="submit"
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shrink-0"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap sm:flex-nowrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>

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
            onClick={handleRefresh}
            className="p-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 shrink-0"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {loading && organizations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/80 border border-slate-800 rounded-2xl">
            Loading organizations...
          </div>
        ) : organizations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/80 border border-slate-800 rounded-2xl">
            No organizations found matching criteria.
          </div>
        ) : (
          organizations.map((org) => {
            const isSuspended = org.status === "suspended";
            return (
              <div
                key={org.id}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-white break-words">
                      {org.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">
                      {org.id}
                    </div>
                  </div>
                  <AdminBadge tone={isSuspended ? "rose" : "emerald"}>
                    {isSuspended ? "Suspended" : "Active"}
                  </AdminBadge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] uppercase text-slate-500 block">
                      Plan & Limit
                    </span>
                    <span className="font-bold uppercase text-indigo-300">
                      {org.planTier}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono">
                      {org.monthlyLimit.toLocaleString()} / mo
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] uppercase text-slate-500 block">
                      Tenancy
                    </span>
                    <div className="flex items-center gap-3 text-slate-300 mt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-500" />
                        {org.userCount}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-slate-500" />
                        {org.messageCount}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-emerald-400" />
                    <span className="font-mono">
                      {org.displayPhoneNumber || org.phoneNumberId || "No WhatsApp bound"}
                    </span>
                  </span>
                  <span className="text-[10px] font-mono">
                    Prod: {org.whatsappStatus.production}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => openEditModal(org)}
                    className="py-2 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 inline-flex items-center justify-center gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5 text-amber-400" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmToggleOrg(org)}
                    disabled={actionInProgress === org.id}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-colors border ${
                      isSuspended
                        ? "bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border-emerald-500/30"
                        : "bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border-rose-500/30"
                    }`}
                  >
                    {isSuspended ? "Reactivate" : "Suspend"}
                  </button>
                </div>
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
                <th className="p-4">Status</th>
                <th className="p-4">Plan & Quota</th>
                <th className="p-4">Tenancy</th>
                <th className="p-4">WhatsApp Binding</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading && organizations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Loading organizations...
                  </td>
                </tr>
              ) : organizations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No organizations found matching criteria.
                  </td>
                </tr>
              ) : (
                organizations.map((org) => {
                  const isSuspended = org.status === "suspended";
                  return (
                    <tr
                      key={org.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-4">
                        <div className="font-semibold text-white">{org.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {org.id}
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                            isSuspended
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          }`}
                        >
                          {isSuspended ? (
                            <>
                              <XCircle className="w-3 h-3" /> Suspended
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </>
                          )}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="font-semibold uppercase text-slate-200 text-[11px]">
                          {org.planTier}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {org.monthlyLimit.toLocaleString()} msgs/mo
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                          <span className="flex items-center gap-1" title="Users">
                            <Users className="w-3.5 h-3.5 text-slate-500" />
                            {org.userCount}
                          </span>
                          <span
                            className="flex items-center gap-1"
                            title="Messages"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                            {org.messageCount}
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="text-[11px] space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                org.whatsappStatus.production === "connected"
                                  ? "bg-emerald-400"
                                  : "bg-slate-600"
                              }`}
                            />
                            <span className="text-slate-300 font-mono">
                              {org.displayPhoneNumber ||
                                org.phoneNumberId ||
                                org.whatsappStatus.production}
                            </span>
                          </div>
                          {org.wabaId && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              WABA: {org.wabaId}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditModal(org)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors inline-flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3 text-amber-400" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmToggleOrg(org)}
                          disabled={actionInProgress === org.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            isSuspended
                              ? "bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30"
                              : "bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30"
                          }`}
                        >
                          {actionInProgress === org.id
                            ? "Updating..."
                            : isSuspended
                            ? "Reactivate"
                            : "Suspend"}
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

      {/* Create Organization Modal */}
      <AdminModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Tenant Organization"
        subtitle="Provision a new isolated workspace"
        icon={<Building2 className="w-5 h-5 text-amber-400" />}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateOrg} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Workspace Name
            </label>
            <input
              type="text"
              required
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="e.g. Acme Retail Corp"
              className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Initial Plan Tier
            </label>
            <select
              value={newOrgPlan}
              onChange={(e) => setNewOrgPlan(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
            >
              <option value="free">Free (1,000 msgs/mo)</option>
              <option value="starter">Starter (5,000 msgs/mo)</option>
              <option value="growth">Growth (25,000 msgs/mo)</option>
              <option value="pro">Pro (50,000 msgs/mo)</option>
              <option value="enterprise">Enterprise (250,000 msgs/mo)</option>
            </select>
          </div>

          <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Organization"}
            </button>
          </div>
        </form>
      </AdminModal>

      {/* Full Edit Organization Modal */}
      <AdminModal
        open={Boolean(editingOrg)}
        onClose={() => setEditingOrg(null)}
        title="Edit Organization Workspace"
        subtitle={editingOrg ? `ID: ${editingOrg.id}` : undefined}
        icon={<Pencil className="w-4 h-4 text-amber-400" />}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Organization Name
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Workspace Status
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
          </div>

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
                  setEditLimit(PLAN_DEFAULT_LIMITS[nextPlan] ?? 5000);
                }}
                className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
              >
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Monthly Message Quota
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

          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              WhatsApp Account Identifiers (Optional)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Display Phone Number
                </label>
                <input
                  type="text"
                  value={editDisplayPhone}
                  onChange={(e) => setEditDisplayPhone(e.target.value)}
                  placeholder="+1 555 010 2020"
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-mono bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Phone Number ID
                </label>
                <input
                  type="text"
                  value={editPhoneNumberId}
                  onChange={(e) => setEditPhoneNumberId(e.target.value)}
                  placeholder="Meta Phone Number ID"
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-mono bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                WABA ID
              </label>
              <input
                type="text"
                value={editWabaId}
                onChange={(e) => setEditWabaId(e.target.value)}
                placeholder="WhatsApp Business Account ID"
                className="w-full px-3 py-2.5 rounded-xl text-xs font-mono bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingOrg(null)}
              className="px-4 py-2.5 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-50"
            >
              {savingEdit ? "Saving Changes..." : "Save Organization"}
            </button>
          </div>
        </form>
      </AdminModal>

      {/* Confirm Status Toggle Modal */}
      <AdminModal
        open={Boolean(confirmToggleOrg)}
        onClose={() => setConfirmToggleOrg(null)}
        title={
          confirmToggleOrg?.status === "active"
            ? "Suspend Organization"
            : "Reactivate Organization"
        }
        subtitle={confirmToggleOrg?.name}
        maxWidth="max-w-md"
      >
        <p className="text-xs text-slate-300 leading-relaxed">
          {confirmToggleOrg?.status === "active"
            ? `Suspending "${confirmToggleOrg?.name}" immediately blocks API access and customer sessions for all users in this workspace.`
            : `Reactivating "${confirmToggleOrg?.name}" restores workspace API access and customer sign-ins.`}
        </p>
        <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmToggleOrg(null)}
            className="px-4 py-2.5 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={Boolean(actionInProgress)}
            onClick={executeToggleStatus}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold ${
              confirmToggleOrg?.status === "active"
                ? "bg-rose-600 hover:bg-rose-500 text-white"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
          >
            {actionInProgress
              ? "Updating..."
              : confirmToggleOrg?.status === "active"
              ? "Confirm Suspend"
              : "Confirm Reactivate"}
          </button>
        </div>
      </AdminModal>
    </AdminLayout>
  );
}
