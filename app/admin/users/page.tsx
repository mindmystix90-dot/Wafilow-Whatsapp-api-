"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { AdminAlert, AdminBadge, AdminModal } from "@/components/admin/AdminUI";
import {
  Search,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Building2,
  Eye,
  Smartphone,
  Gauge,
  CreditCard,
  Calendar,
  Pencil,
  Copy,
  Check,
  Link2,
} from "lucide-react";

interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  status?: string;
  organizationId: string | null;
  organization?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

interface OrgOption {
  id: string;
  name: string;
}

interface CustomerDetailsData {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  organization: {
    id: string;
    name: string;
    status: string;
    planTier: string;
    monthlyLimit: number;
    createdAt: string;
  } | null;
  usage: {
    contacts: number;
    totalMessages: number;
    monthMessages: number;
    monthlyLimit: number;
    remaining: number;
    percentageUsed: number;
  };
  whatsapp: {
    status: string;
    phoneNumberId: string | null;
    displayPhoneNumber: string | null;
    verifiedName: string | null;
    lastCheckedAt: string | null;
    lastError: string | null;
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orgOptions, setOrgOptions] = useState<OrgOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Customer Details Modal
  const [selectedCustomer, setSelectedCustomer] = useState<AdminUser | null>(
    null
  );
  const [customerDetails, setCustomerDetails] =
    useState<CustomerDetailsData | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Full Edit User Modal
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("customer");
  const [editOrgId, setEditOrgId] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "suspended">("active");
  const [savingEdit, setSavingEdit] = useState(false);

  // Password Reset Modal (temporary password OR single-use reset link)
  const [resetModalUser, setResetModalUser] = useState<AdminUser | null>(null);
  const [resetMode, setResetMode] = useState<"temp" | "token">("temp");
  const [newPassword, setNewPassword] = useState("");
  const [generatedResetUrl, setGeneratedResetUrl] = useState<string | null>(
    null
  );
  const [copiedResetUrl, setCopiedResetUrl] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Confirm Suspend/Reactivate Modal
  const [confirmStatusUser, setConfirmStatusUser] = useState<AdminUser | null>(
    null
  );
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const loadUsers = useCallback(
    async (searchTerm?: string) => {
      try {
        const params = new URLSearchParams();
        const q = searchTerm !== undefined ? searchTerm : search;
        if (q) params.set("search", q);
        if (roleFilter !== "all") params.set("role", roleFilter);

        const [usersRes, orgsRes] = await Promise.all([
          fetch(`/api/admin/users?${params.toString()}`),
          fetch("/api/admin/organizations"),
        ]);
        if (!usersRes.ok) throw new Error("Failed to load users.");
        const data = await usersRes.json();
        setUsers(data.users || []);
        if (orgsRes.ok) {
          const orgData = await orgsRes.json();
          setOrgOptions(
            (orgData.organizations || []).map(
              (o: { id: string; name: string }) => ({ id: o.id, name: o.name })
            )
          );
        }
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error loading users");
      } finally {
        setLoading(false);
      }
    },
    [search, roleFilter]
  );

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadUsers();
    });
    return () => {
      active = false;
    };
  }, [loadUsers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    loadUsers(search);
  };

  const handleRefresh = () => {
    setLoading(true);
    loadUsers();
  };

  const openCustomerDetails = async (user: AdminUser) => {
    setSelectedCustomer(user);
    setDetailsLoading(true);
    setCustomerDetails(null);
    try {
      const res = await fetch(`/api/admin/customers/${user.id}`);
      if (!res.ok) throw new Error("Failed to load customer profile details.");
      const data = await res.json();
      setCustomerDetails(data.customer);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error loading customer details"
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const openEditUserModal = (user: AdminUser) => {
    setEditingUser(user);
    setEditName(user.name || "");
    setEditEmail(user.email || "");
    setEditRole(user.role || "customer");
    setEditOrgId(user.organizationId || "");
    setEditStatus(user.status === "suspended" ? "suspended" : "active");
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSavingEdit(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim(),
          role: editRole,
          organizationId: editOrgId || null,
          status: editStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update user account.");
      }
      setSuccessMsg(data.message || `Updated user ${editEmail.trim()}.`);
      setEditingUser(null);
      loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error updating user");
    } finally {
      setSavingEdit(false);
    }
  };

  const openResetModal = (user: AdminUser) => {
    setResetModalUser(user);
    setResetMode("temp");
    setNewPassword("");
    setGeneratedResetUrl(null);
    setCopiedResetUrl(false);
  };

  const executeToggleUserStatus = async () => {
    if (!confirmStatusUser) return;
    const user = confirmStatusUser;
    const currentStatus = user.status || "active";
    const nextStatus = currentStatus === "active" ? "suspended" : "active";

    setActionInProgress(user.id);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update user status");
      }
      setSuccessMsg(
        `User "${user.email}" status is now ${nextStatus.toUpperCase()}. Active sessions revoked.`
      );
      setConfirmStatusUser(null);
      loadUsers();
      if (selectedCustomer?.id === user.id) {
        openCustomerDetails(user);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error updating user");
    } finally {
      setActionInProgress(null);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    if (resetMode === "temp" && !newPassword.trim()) return;

    setResetting(true);
    setError(null);
    setSuccessMsg(null);
    setGeneratedResetUrl(null);
    try {
      const payload =
        resetMode === "temp"
          ? { temporaryPassword: newPassword }
          : { mode: "token" };

      const res = await fetch(
        `/api/admin/users/${resetModalUser.id}/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to reset password");
      }

      if (resetMode === "token" && data.resetUrl) {
        const fullUrl =
          typeof window !== "undefined"
            ? `${window.location.origin}${data.resetUrl}`
            : data.resetUrl;
        setGeneratedResetUrl(fullUrl);
        setSuccessMsg(
          `Single-use reset link generated for ${resetModalUser.email}.`
        );
      } else {
        setSuccessMsg(
          `Temporary password updated for ${resetModalUser.email}. Active sessions invalidated.`
        );
        setResetModalUser(null);
        setNewPassword("");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error resetting password");
    } finally {
      setResetting(false);
    }
  };

  const handleCopyResetUrl = async () => {
    if (!generatedResetUrl || typeof navigator === "undefined") return;
    try {
      await navigator.clipboard.writeText(generatedResetUrl);
      setCopiedResetUrl(true);
      setTimeout(() => setCopiedResetUrl(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <AdminLayout
      title="Customer & Identity Management"
      subtitle="Full account edits, workspace reassignment, dossier inspection, password resets, and session revocation"
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
              placeholder="Search by customer name, email, or workspace..."
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

        <div className="flex gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Roles</option>
            <option value="customer">Customers</option>
            <option value="user">Legacy Users</option>
            <option value="admin">Tenant Admins</option>
            <option value="super_admin">Platform Owner</option>
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
        {loading && users.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/80 border border-slate-800 rounded-2xl">
            Loading customer accounts...
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/80 border border-slate-800 rounded-2xl">
            No customers found matching criteria.
          </div>
        ) : (
          users.map((u) => {
            const isSuperAdmin = u.role === "super_admin";
            const isSuspended = u.status === "suspended";
            return (
              <div
                key={u.id}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-white truncate">
                      {u.name || "Customer"}
                    </div>
                    <div className="text-xs text-slate-400 break-all">
                      {u.email}
                    </div>
                  </div>
                  <AdminBadge tone={isSuspended ? "rose" : "emerald"}>
                    {isSuspended ? "Suspended" : "Active"}
                  </AdminBadge>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                  <AdminBadge
                    tone={
                      isSuperAdmin
                        ? "amber"
                        : u.role === "admin"
                        ? "indigo"
                        : "slate"
                    }
                  >
                    {u.role}
                  </AdminBadge>
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <Building2 className="w-3 h-3 text-slate-500" />
                    {u.organization?.name || "No Workspace"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => openCustomerDetails(u)}
                    className="py-2 px-2.5 rounded-xl text-xs font-semibold bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 inline-flex items-center justify-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Dossier</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditUserModal(u)}
                    className="py-2 px-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 inline-flex items-center justify-center gap-1"
                  >
                    <Pencil className="w-3.5 h-3.5 text-amber-400" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openResetModal(u)}
                    className="py-2 px-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 inline-flex items-center justify-center gap-1"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Password</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmStatusUser(u)}
                    disabled={actionInProgress === u.id || isSuperAdmin}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border ${
                      isSuperAdmin
                        ? "opacity-30 cursor-not-allowed bg-slate-800 text-slate-500 border-slate-700"
                        : isSuspended
                        ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/30"
                        : "bg-rose-600/20 text-rose-300 border-rose-500/30"
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
                <th className="p-4">Customer</th>
                <th className="p-4">Role</th>
                <th className="p-4">Workspace</th>
                <th className="p-4">Status</th>
                <th className="p-4">Registered</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Loading customer accounts...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No customers found matching criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSuperAdmin = u.role === "super_admin";
                  const isSuspended = u.status === "suspended";
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-4">
                        <div className="font-semibold text-white">
                          {u.name || "Customer"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {u.email}
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            isSuperAdmin
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : u.role === "admin"
                              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>{u.organization?.name || "No Workspace"}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
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

                      <td className="p-4 text-slate-400 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openCustomerDetails(u)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Dossier</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditUserModal(u)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors inline-flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3 text-amber-400" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openResetModal(u)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors inline-flex items-center gap-1"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>Reset</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirmStatusUser(u)}
                          disabled={actionInProgress === u.id || isSuperAdmin}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            isSuperAdmin
                              ? "opacity-30 cursor-not-allowed bg-slate-800 text-slate-500"
                              : isSuspended
                              ? "bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30"
                              : "bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30"
                          }`}
                        >
                          {isSuspended ? "Reactivate" : "Suspend"}
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

      {/* Customer Dossier Modal */}
      <AdminModal
        open={Boolean(selectedCustomer)}
        onClose={() => setSelectedCustomer(null)}
        title="Customer Account Dossier"
        subtitle={selectedCustomer ? `ID: ${selectedCustomer.id}` : undefined}
        icon={<Eye className="w-4 h-4 text-indigo-400" />}
        maxWidth="max-w-2xl"
      >
        {detailsLoading ? (
          <div className="py-10 flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400 font-mono">
              Loading customer telemetry...
            </span>
          </div>
        ) : customerDetails && selectedCustomer ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                  Customer Profile
                </span>
                <div className="text-sm font-bold text-white">
                  {customerDetails.user.name || "Customer User"}
                </div>
                <div className="text-xs text-slate-300 font-mono break-all">
                  {customerDetails.user.email}
                </div>
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <AdminBadge tone="slate">
                    Role: {customerDetails.user.role}
                  </AdminBadge>
                  <AdminBadge
                    tone={
                      customerDetails.user.status === "active"
                        ? "emerald"
                        : "rose"
                    }
                  >
                    {customerDetails.user.status}
                  </AdminBadge>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                  Workspace Tenant
                </span>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate">
                    {customerDetails.organization?.name ||
                      "No Workspace Assigned"}
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-amber-400" />
                  <span>Plan: </span>
                  <span className="text-amber-300 font-semibold uppercase">
                    {customerDetails.organization?.planTier || "Starter"}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-1">
                  <Calendar className="w-3 h-3" />
                  <span>
                    Created:{" "}
                    {new Date(
                      customerDetails.user.createdAt
                    ).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    Monthly Message Usage & Quota
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-300">
                  {customerDetails.usage.monthMessages.toLocaleString()} /{" "}
                  {customerDetails.usage.monthlyLimit.toLocaleString()} msgs
                </span>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all ${
                    customerDetails.usage.percentageUsed >= 90
                      ? "bg-rose-500"
                      : customerDetails.usage.percentageUsed >= 70
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      customerDetails.usage.percentageUsed
                    )}%`,
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase block">
                    Remaining
                  </span>
                  <span className="text-xs font-bold text-slate-200 font-mono">
                    {customerDetails.usage.remaining.toLocaleString()}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase block">
                    Contacts
                  </span>
                  <span className="text-xs font-bold text-slate-200 font-mono">
                    {customerDetails.usage.contacts.toLocaleString()}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase block">
                    All-Time
                  </span>
                  <span className="text-xs font-bold text-slate-200 font-mono">
                    {customerDetails.usage.totalMessages.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    WhatsApp Connection
                  </span>
                </div>
                <AdminBadge
                  tone={
                    customerDetails.whatsapp.status === "connected"
                      ? "emerald"
                      : "slate"
                  }
                >
                  {customerDetails.whatsapp.status}
                </AdminBadge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                <div>
                  <span className="text-[10px] text-slate-500 block">
                    Phone Number ID
                  </span>
                  <span className="font-mono text-slate-300 break-all">
                    {customerDetails.whatsapp.phoneNumberId || "Not Configured"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">
                    Display Number
                  </span>
                  <span className="font-mono text-slate-300">
                    {customerDetails.whatsapp.displayPhoneNumber ||
                      "Not Available"}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedCustomer;
                    setSelectedCustomer(null);
                    openEditUserModal(target);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 inline-flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5 text-amber-400" />
                  <span>Edit Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedCustomer;
                    setSelectedCustomer(null);
                    openResetModal(target);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 inline-flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reset Password</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setConfirmStatusUser(selectedCustomer)}
                disabled={selectedCustomer.role === "super_admin"}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  selectedCustomer.role === "super_admin"
                    ? "opacity-30 cursor-not-allowed bg-slate-800 text-slate-500"
                    : customerDetails.user.status === "active"
                    ? "bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30"
                    : "bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30"
                }`}
              >
                {customerDetails.user.status === "active"
                  ? "Suspend Account"
                  : "Reactivate Account"}
              </button>
            </div>
          </div>
        ) : null}
      </AdminModal>

      {/* Full Edit User Modal */}
      <AdminModal
        open={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        title="Edit User Account"
        subtitle={editingUser?.email || undefined}
        icon={<Pencil className="w-4 h-4 text-amber-400" />}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveUserEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Account Role
              </label>
              <select
                value={editRole}
                disabled={editingUser?.role === "super_admin"}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
              >
                <option value="customer">Customer</option>
                <option value="user">User</option>
                <option value="admin">Workspace Admin</option>
                {editingUser?.role === "super_admin" && (
                  <option value="super_admin">Platform Owner</option>
                )}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Status
              </label>
              <select
                value={editStatus}
                disabled={editingUser?.role === "super_admin"}
                onChange={(e) =>
                  setEditStatus(
                    e.target.value === "suspended" ? "suspended" : "active"
                  )
                }
                className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Assigned Organization Workspace
            </label>
            <select
              value={editOrgId}
              onChange={(e) => setEditOrgId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">No Workspace Assigned</option>
              {orgOptions.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.id.slice(0, 8)}...)
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              Changing email, role, status, or workspace automatically revokes active browser sessions.
            </p>
          </div>

          <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingUser(null)}
              className="px-4 py-2.5 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-50"
            >
              {savingEdit ? "Saving..." : "Save Account"}
            </button>
          </div>
        </form>
      </AdminModal>

      {/* Password Reset Modal (Dual Mode: Temporary Password OR Single-Use Link) */}
      <AdminModal
        open={Boolean(resetModalUser)}
        onClose={() => setResetModalUser(null)}
        title="Reset User Password"
        subtitle={resetModalUser?.email || undefined}
        icon={<KeyRound className="w-5 h-5 text-amber-400" />}
        maxWidth="max-w-md"
      >
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setResetMode("temp");
              setGeneratedResetUrl(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
              resetMode === "temp"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Temporary Password
          </button>
          <button
            type="button"
            onClick={() => setResetMode("token")}
            className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
              resetMode === "token"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Reset Link (1h)
          </button>
        </div>

        {resetMode === "temp" ? (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Set a bcrypt-hashed temporary password for{" "}
              <span className="font-semibold text-white">
                {resetModalUser?.email}
              </span>
              . All active browser sessions will be revoked immediately.
            </p>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                New Temporary Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resetting}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-50"
              >
                {resetting ? "Updating..." : "Set Password & Revoke Sessions"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Generate an expiring (1 hour), single-use, SHA-256 hashed reset
              link to deliver securely to{" "}
              <span className="font-semibold text-white">
                {resetModalUser?.email}
              </span>
              .
            </p>

            {generatedResetUrl && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase text-emerald-300 flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> Single-Use Reset URL
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyResetUrl}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-800/50 hover:bg-emerald-700/50 text-emerald-200 text-[10px] font-semibold"
                  >
                    {copiedResetUrl ? (
                      <>
                        <Check className="w-3 h-3" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="text-[11px] font-mono text-emerald-200 break-all bg-slate-950/80 p-2 rounded-lg border border-emerald-900/50">
                  {generatedResetUrl}
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={resetting}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-50"
              >
                {resetting ? "Generating..." : "Generate Reset Link"}
              </button>
            </div>
          </form>
        )}
      </AdminModal>

      {/* Confirm Status Toggle Modal */}
      <AdminModal
        open={Boolean(confirmStatusUser)}
        onClose={() => setConfirmStatusUser(null)}
        title={
          (confirmStatusUser?.status || "active") === "active"
            ? "Suspend User Account"
            : "Reactivate User Account"
        }
        subtitle={confirmStatusUser?.email || undefined}
        maxWidth="max-w-md"
      >
        <p className="text-xs text-slate-300 leading-relaxed">
          {(confirmStatusUser?.status || "active") === "active"
            ? `Suspending ${confirmStatusUser?.email} immediately revokes active browser sessions and blocks API requests.`
            : `Reactivating ${confirmStatusUser?.email} allows them to sign in again.`}
        </p>
        <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmStatusUser(null)}
            className="px-4 py-2.5 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={Boolean(actionInProgress)}
            onClick={executeToggleUserStatus}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold ${
              (confirmStatusUser?.status || "active") === "active"
                ? "bg-rose-600 hover:bg-rose-500 text-white"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
          >
            {actionInProgress
              ? "Updating..."
              : (confirmStatusUser?.status || "active") === "active"
              ? "Confirm Suspend"
              : "Confirm Reactivate"}
          </button>
        </div>
      </AdminModal>
    </AdminLayout>
  );
}
