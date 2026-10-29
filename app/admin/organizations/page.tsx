"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  Building2,
  Search,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Users,
  MessageSquare,
  X,
} from "lucide-react";

interface OrganizationSummary {
  id: string;
  name: string;
  status: string;
  planTier: string;
  monthlyLimit: number;
  userCount: number;
  contactCount: number;
  messageCount: number;
  whatsappStatus: {
    production: string;
    sandbox: string;
  };
  createdAt: string;
}

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

  // Edit / Action State
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const loadOrganizations = useCallback(async (searchTerm?: string) => {
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
      setError(err instanceof Error ? err.message : "Error loading organizations");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, planFilter]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        loadOrganizations();
      }
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

  const toggleStatus = async (org: OrganizationSummary) => {
    const nextStatus = org.status === "active" ? "suspended" : "active";
    if (
      !confirm(
        `Are you sure you want to ${nextStatus.toUpperCase()} organization '${org.name}'? ${
          nextStatus === "suspended" ? "All customer sessions will be blocked from API routes." : ""
        }`
      )
    ) {
      return;
    }

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
      setSuccessMsg(`Organization '${org.name}' is now ${nextStatus.toUpperCase()}.`);
      loadOrganizations();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error updating organization");
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
      setSuccessMsg(`Workspace '${newOrgName}' provisioned successfully.`);
      setShowCreateModal(false);
      setNewOrgName("");
      loadOrganizations();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating organization");
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminLayout
      title="Tenant Organizations"
      subtitle="Multi-tenant directory, isolation status, and suspension controls"
      action={
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Organization</span>
        </button>
      }
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
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by organization name or ID..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            Search
          </button>
        </form>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>

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
            onClick={handleRefresh}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">Organization</th>
                <th className="p-4">Status</th>
                <th className="p-4">Plan & Quota</th>
                <th className="p-4">Tenancy</th>
                <th className="p-4">WhatsApp Status</th>
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
                    <tr key={org.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-white">{org.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{org.id}</div>
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
                        <div className="text-[10px] text-slate-400">
                          {org.monthlyLimit.toLocaleString()} msgs/mo
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                          <span className="flex items-center gap-1" title="Users">
                            <Users className="w-3.5 h-3.5 text-slate-500" />
                            {org.userCount}
                          </span>
                          <span className="flex items-center gap-1" title="Outbound messages">
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
                            <span className="text-slate-400">Prod: {org.whatsappStatus.production}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                org.whatsappStatus.sandbox === "connected"
                                  ? "bg-amber-400"
                                  : "bg-slate-600"
                              }`}
                            />
                            <span className="text-slate-500">Sandbox: {org.whatsappStatus.sandbox}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => toggleStatus(org)}
                          disabled={actionInProgress === org.id}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
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

      {/* Provision New Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Create Tenant Organization</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

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
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Initial Plan Tier
                </label>
                <select
                  value={newOrgPlan}
                  onChange={(e) => setNewOrgPlan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="free">Free (1,000 msgs/mo)</option>
                  <option value="starter">Starter (5,000 msgs/mo)</option>
                  <option value="growth">Growth (25,000 msgs/mo)</option>
                  <option value="pro">Pro (50,000 msgs/mo)</option>
                  <option value="enterprise">Enterprise (250,000 msgs/mo)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Organization"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
