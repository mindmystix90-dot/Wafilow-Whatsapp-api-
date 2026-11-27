"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { AdminAlert, AdminBadge } from "@/components/admin/AdminUI";
import {
  Wrench,
  RefreshCw,
  ShieldCheck,
  Save,
  SlidersHorizontal,
  UserX,
  MessageSquareOff,
  Power,
} from "lucide-react";

interface MaintenanceState {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  registrationPaused: boolean;
  outboundPaused: boolean;
  schemaReady: boolean;
  updatedAt: string | null;
}

interface FeatureGateItem {
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  allowedOrgIds: string[];
  updatedBy: string | null;
  updatedAt: string | null;
}

export default function AdminMaintenancePage() {
  const [maintenance, setMaintenance] = useState<MaintenanceState>({
    maintenanceMode: false,
    maintenanceMessage:
      "Wafilow is undergoing scheduled maintenance. Please check back shortly.",
    registrationPaused: false,
    outboundPaused: false,
    schemaReady: true,
    updatedAt: null,
  });
  const [featureGates, setFeatureGates] = useState<FeatureGateItem[]>([]);
  const [orgInputs, setOrgInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [savingGateKey, setSavingGateKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/maintenance");
      if (!res.ok) throw new Error("Failed to load maintenance & release controls.");
      const data = await res.json();
      if (data.maintenance) {
        setMaintenance(data.maintenance);
      }
      const gates: FeatureGateItem[] = data.featureGates || [];
      setFeatureGates(gates);
      const nextInputs: Record<string, string> = {};
      for (const g of gates) {
        nextInputs[g.key] = (g.allowedOrgIds || []).join(", ");
      }
      setOrgInputs(nextInputs);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading maintenance state");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadState();
    });
    return () => {
      active = false;
    };
  }, [loadState]);

  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMaintenance(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maintenance: {
            maintenanceMode: maintenance.maintenanceMode,
            maintenanceMessage: maintenance.maintenanceMessage,
            registrationPaused: maintenance.registrationPaused,
            outboundPaused: maintenance.outboundPaused,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save maintenance controls.");
      }
      if (data.maintenance) setMaintenance(data.maintenance);
      setSuccessMsg(
        data.message || "Maintenance and release controls updated."
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save controls.");
    } finally {
      setSavingMaintenance(false);
    }
  };

  const handleSaveGate = async (gate: FeatureGateItem, nextEnabled?: boolean) => {
    setSavingGateKey(gate.key);
    setError(null);
    setSuccessMsg(null);
    try {
      const rawOrgs = orgInputs[gate.key] || "";
      const allowedOrgIds = rawOrgs
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/admin/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featureGate: {
            key: gate.key,
            label: gate.label,
            description: gate.description,
            enabled: nextEnabled !== undefined ? nextEnabled : gate.enabled,
            allowedOrgIds,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update feature rollout gate.");
      }
      if (data.featureGates) {
        setFeatureGates(data.featureGates);
      }
      setSuccessMsg(`Feature gate "${gate.label}" saved.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error updating feature gate.");
    } finally {
      setSavingGateKey(null);
    }
  };

  return (
    <AdminLayout
      title="Maintenance & Release Isolation"
      subtitle="Control platform-wide maintenance notices, pause registrations or outbound messaging, and manage phased feature rollouts"
      action={
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            loadState();
          }}
          disabled={loading}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh State</span>
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

      {!maintenance.schemaReady && (
        <AdminAlert
          variant="warning"
          message="PlatformSetting / FeatureGate tables are not yet applied in the database. Controls currently operate in fail-safe open mode until the additive SQL migration is executed."
        />
      )}

      {/* Owner Bypass Notice */}
      <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/40 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90 space-y-1">
          <div className="font-semibold text-amber-300">
            Platform Owner Bypass Active
          </div>
          <p>
            When maintenance mode or release isolation gates are enabled, regular customer requests receive HTTP 503 with your maintenance notice, while your owner account retains uninterrupted access for testing and verification.
          </p>
        </div>
      </div>

      {/* Global Maintenance Controls */}
      <form
        onSubmit={handleSaveMaintenance}
        className="p-4 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Platform Maintenance Switches
            </h2>
          </div>
          <AdminBadge tone={maintenance.maintenanceMode ? "amber" : "emerald"}>
            {maintenance.maintenanceMode ? "Maintenance Active" : "Live Operations"}
          </AdminBadge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Global Maintenance Toggle */}
          <label className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-3 cursor-pointer hover:border-slate-700 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Power className="w-3.5 h-3.5 text-amber-400" />
                <span>Maintenance Mode</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Displays a maintenance notice in customer portals and pauses public registrations, onboarding, and customer sends.
              </p>
            </div>
            <input
              type="checkbox"
              checked={maintenance.maintenanceMode}
              onChange={(e) =>
                setMaintenance((prev) => ({
                  ...prev,
                  maintenanceMode: e.target.checked,
                }))
              }
              className="mt-1 h-4 w-4 accent-amber-500 rounded shrink-0"
            />
          </label>

          {/* Pause Registrations */}
          <label className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-3 cursor-pointer hover:border-slate-700 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <UserX className="w-3.5 h-3.5 text-rose-400" />
                <span>Pause Registrations</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Temporarily disables self-service account creation on the signup page while keeping existing tenants active.
              </p>
            </div>
            <input
              type="checkbox"
              checked={maintenance.registrationPaused}
              onChange={(e) =>
                setMaintenance((prev) => ({
                  ...prev,
                  registrationPaused: e.target.checked,
                }))
              }
              className="mt-1 h-4 w-4 accent-amber-500 rounded shrink-0"
            />
          </label>

          {/* Pause Outbound */}
          <label className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-3 cursor-pointer hover:border-slate-700 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <MessageSquareOff className="w-3.5 h-3.5 text-sky-400" />
                <span>Pause Outbound Sends</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Pauses customer-initiated outbound WhatsApp API sends during database or Meta maintenance windows.
              </p>
            </div>
            <input
              type="checkbox"
              checked={maintenance.outboundPaused}
              onChange={(e) =>
                setMaintenance((prev) => ({
                  ...prev,
                  outboundPaused: e.target.checked,
                }))
              }
              className="mt-1 h-4 w-4 accent-amber-500 rounded shrink-0"
            />
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Customer Maintenance Notice
          </label>
          <textarea
            rows={2}
            value={maintenance.maintenanceMessage}
            onChange={(e) =>
              setMaintenance((prev) => ({
                ...prev,
                maintenanceMessage: e.target.value,
              }))
            }
            placeholder="Wafilow is undergoing scheduled maintenance. Please check back shortly."
            className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-slate-800/80">
          <span className="text-[11px] text-slate-500 font-mono">
            {maintenance.updatedAt
              ? `Last updated: ${new Date(maintenance.updatedAt).toLocaleString()}`
              : "Using default configuration"}
          </span>
          <button
            type="submit"
            disabled={savingMaintenance}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingMaintenance ? "Saving..." : "Save Maintenance Settings"}</span>
          </button>
        </div>
      </form>

      {/* Feature Rollout Gates */}
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Feature Rollout Gates
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Isolate new releases to owner or specific tenant IDs
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {featureGates.map((gate) => {
            const isSaving = savingGateKey === gate.key;
            return (
              <div
                key={gate.key}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white break-words">
                        {gate.label}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5 break-all">
                        {gate.key}
                      </div>
                    </div>
                    <AdminBadge tone={gate.enabled ? "emerald" : "rose"}>
                      {gate.enabled ? "Enabled" : "Restricted"}
                    </AdminBadge>
                  </div>

                  {gate.description && (
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {gate.description}
                    </p>
                  )}

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                      Allowed Organization IDs (comma-separated, used when restricted)
                    </label>
                    <input
                      type="text"
                      value={orgInputs[gate.key] ?? ""}
                      onChange={(e) =>
                        setOrgInputs((prev) => ({
                          ...prev,
                          [gate.key]: e.target.value,
                        }))
                      }
                      placeholder="Optional org IDs for canary rollout..."
                      className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSaveGate(gate, !gate.enabled)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                      gate.enabled
                        ? "bg-rose-600/20 text-rose-300 border-rose-500/30 hover:bg-rose-600/30"
                        : "bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/30"
                    }`}
                  >
                    {gate.enabled ? "Restrict Rollout" : "Enable Globally"}
                  </button>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSaveGate(gate)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Allowlist"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
