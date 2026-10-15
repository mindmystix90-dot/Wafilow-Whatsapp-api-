"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import {
  Shield,
  Globe,
  Send,
  Check,
  Copy,
  AlertCircle,
  Loader2,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Info,
  Beaker,
  Building2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { launchWhatsAppSignup } from "@/lib/facebook-sdk";

interface ConnectionDetails {
  configured: boolean;
  status: string;
  phoneNumberId: string | null;
  wabaId: string | null;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  hasAccessToken: boolean;
  lastCheckedAt: string | null;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"production" | "sandbox" | "webhook">("production");

  // Production State
  const [prodPhoneId, setProdPhoneId] = useState("");
  const [prodWabaId, setProdWabaId] = useState("");
  const [prodToken, setProdToken] = useState("");
  const [prodDisplayPhone, setProdDisplayPhone] = useState<string | null>(null);
  const [prodVerifiedName, setProdVerifiedName] = useState<string | null>(null);
  const [isProdConfigured, setIsProdConfigured] = useState(false);
  const [prodStatus, setProdStatus] = useState("disconnected");
  const [prodLastChecked, setProdLastChecked] = useState<string | null>(null);
  const [showProdAdvanced, setShowProdAdvanced] = useState(false);

  // Sandbox State
  const [sandPhoneId, setSandPhoneId] = useState("");
  const [sandWabaId, setSandWabaId] = useState("");
  const [sandToken, setSandToken] = useState("");
  const [sandDisplayPhone, setSandDisplayPhone] = useState<string | null>(null);
  const [sandVerifiedName, setSandVerifiedName] = useState<string | null>(null);
  const [isSandConfigured, setIsSandConfigured] = useState(false);
  const [sandStatus, setSandStatus] = useState("disconnected");
  const [sandLastChecked, setSandLastChecked] = useState<string | null>(null);

  // General & Webhook State
  const [verifyToken, setVerifyToken] = useState("wafilow_webhook_token_secure_9921");
  const [appId, setAppId] = useState("3356483501181888");
  const [configId, setConfigId] = useState("2934849833375100");
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Save states
  const [isSavingProd, setIsSavingProd] = useState(false);
  const [saveProdStatus, setSaveProdStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSavingSand, setIsSavingSand] = useState(false);
  const [saveSandStatus, setSaveSandStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Embedded Signup state
  const [isLaunchingSignup, setIsLaunchingSignup] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);

  // Diagnostics state
  const [isTestingProd, setIsTestingProd] = useState(false);
  const [prodDiagnostic, setProdDiagnostic] = useState<{
    success: boolean;
    message: string;
    details?: {
      verifiedName?: string;
      displayPhoneNumber?: string;
      qualityRating?: string;
      verificationStatus?: string;
    };
  } | null>(null);
  const [prodDiagnosticError, setProdDiagnosticError] = useState<string | null>(null);

  const [isTestingSand, setIsTestingSand] = useState(false);
  const [sandDiagnostic, setSandDiagnostic] = useState<{
    success: boolean;
    message: string;
    details?: {
      verifiedName?: string;
      displayPhoneNumber?: string;
      qualityRating?: string;
      verificationStatus?: string;
    };
    restrictions?: string[];
  } | null>(null);
  const [sandDiagnosticError, setSandDiagnosticError] = useState<string | null>(null);

  // Test Ping State
  const [testNumber, setTestNumber] = useState("+14155550192");
  const [testEnv, setTestEnv] = useState<"production" | "sandbox">("production");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const webhookUrl =
    typeof window !== "undefined"
      ? window.location.hostname.endsWith(".vercel.app") && window.location.hostname !== "wafilow-whatsapp-api.vercel.app"
        ? "https://wafilow-whatsapp-api.vercel.app/api/webhook"
        : `${window.location.origin}/api/webhook`
      : "https://wafilow-whatsapp-api.vercel.app/api/webhook";

  // Load existing configuration for both environments
  const loadConfigurations = async () => {
    try {
      const res = await fetch("/api/whatsapp/config");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.verifyToken) setVerifyToken(data.verifyToken);
          if (data.appId) setAppId(data.appId);
          if (data.configId) setConfigId(data.configId);

          // Populate Production
          const prod: ConnectionDetails = data.production || {};
          setIsProdConfigured(prod.configured || false);
          setProdStatus(prod.status || (prod.configured ? "connected" : "disconnected"));
          setProdPhoneId(prod.phoneNumberId || "");
          setProdWabaId(prod.wabaId || "");
          setProdDisplayPhone(prod.displayPhoneNumber || null);
          setProdVerifiedName(prod.verifiedName || null);
          setProdLastChecked(prod.lastCheckedAt || null);
          if (prod.hasAccessToken) {
            setProdToken("•••••••••••••••••••••••••••••• (Stored Server-Side)");
          }

          // Populate Sandbox
          const sand: ConnectionDetails = data.sandbox || {};
          setIsSandConfigured(sand.configured || false);
          setSandStatus(sand.status || (sand.configured ? "connected" : "disconnected"));
          setSandPhoneId(sand.phoneNumberId || "");
          setSandWabaId(sand.wabaId || "");
          setSandDisplayPhone(sand.displayPhoneNumber || null);
          setSandVerifiedName(sand.verifiedName || null);
          setSandLastChecked(sand.lastCheckedAt || null);
          if (sand.hasAccessToken) {
            setSandToken("•••••••••••••••••••••••••••••• (Stored Server-Side)");
          }
        }
      }
    } catch (err) {
      console.warn("Could not load WhatsApp config:", err);
    }
  };

  useEffect(() => {
    loadConfigurations();
  }, []);

  // Launch Meta Embedded Signup for Production
  const handleLaunchEmbeddedSignup = async () => {
    setIsLaunchingSignup(true);
    setSignupError(null);
    setSignupSuccess(null);

    try {
      const signupResult = await launchWhatsAppSignup({
        appId,
        configId,
      });

      if (!signupResult?.code) {
        throw new Error("No authorization code received from Meta Embedded Signup.");
      }

      const res = await fetch("/api/whatsapp/embedded-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: signupResult.code,
          sessionInfo: signupResult.sessionInfo,
          environment: "production",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to finalize WhatsApp connection with Meta.");
      }

      setSignupSuccess("Production WhatsApp Business Account successfully connected!");
      await loadConfigurations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to complete Meta Embedded Signup";
      setSignupError(msg);
    } finally {
      setIsLaunchingSignup(false);
    }
  };

  // Save Production Credentials
  const handleSaveProd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProd(true);
    setSaveProdStatus(null);

    try {
      const payload: Record<string, string> = {
        environment: "production",
        phoneNumberId: prodPhoneId.trim(),
        wabaId: prodWabaId.trim(),
      };
      if (prodToken && !prodToken.startsWith("••••")) {
        payload.accessToken = prodToken.trim();
      }

      const res = await fetch("/api/whatsapp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save production credentials.");
      }

      setSaveProdStatus({ type: "success", text: "Production WhatsApp credentials saved securely." });
      await loadConfigurations();
    } catch (err: unknown) {
      setSaveProdStatus({
        type: "error",
        text: err instanceof Error ? err.message : "Error saving production credentials.",
      });
    } finally {
      setIsSavingProd(false);
    }
  };

  // Save Sandbox Credentials
  const handleSaveSand = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSand(true);
    setSaveSandStatus(null);

    try {
      const payload: Record<string, string> = {
        environment: "sandbox",
        phoneNumberId: sandPhoneId.trim(),
        wabaId: sandWabaId.trim(),
      };
      if (sandToken && !sandToken.startsWith("••••")) {
        payload.accessToken = sandToken.trim();
      }

      const res = await fetch("/api/whatsapp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save sandbox credentials.");
      }

      setSaveSandStatus({ type: "success", text: "Sandbox test credentials saved securely." });
      await loadConfigurations();
    } catch (err: unknown) {
      setSaveSandStatus({
        type: "error",
        text: err instanceof Error ? err.message : "Error saving sandbox credentials.",
      });
    } finally {
      setIsSavingSand(false);
    }
  };

  // Test Production Connection Diagnostic
  const handleTestProd = async () => {
    setIsTestingProd(true);
    setProdDiagnostic(null);
    setProdDiagnosticError(null);

    try {
      const res = await fetch("/api/whatsapp/test-connection?environment=production");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Production connection verification failed.");
      }

      setProdDiagnostic({
        success: true,
        message: data.message || "Meta Cloud API connection verified successfully.",
        details: {
          verifiedName: data.phoneStatus?.verifiedName,
          displayPhoneNumber: data.phoneStatus?.displayPhoneNumber,
          qualityRating: data.phoneStatus?.qualityRating,
          verificationStatus: data.phoneStatus?.codeVerificationStatus,
        },
      });
      await loadConfigurations();
    } catch (err: unknown) {
      setProdDiagnosticError(err instanceof Error ? err.message : "Diagnostic check failed");
    } finally {
      setIsTestingProd(false);
    }
  };

  // Test Sandbox Connection Diagnostic
  const handleTestSand = async () => {
    setIsTestingSand(true);
    setSandDiagnostic(null);
    setSandDiagnosticError(null);

    try {
      const res = await fetch("/api/whatsapp/test-connection?environment=sandbox");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Sandbox connection verification failed.");
      }

      setSandDiagnostic({
        success: true,
        message: data.message || "Sandbox test connection verified successfully with Meta.",
        details: {
          verifiedName: data.phoneStatus?.verifiedName,
          displayPhoneNumber: data.phoneStatus?.displayPhoneNumber,
          qualityRating: data.phoneStatus?.qualityRating,
          verificationStatus: data.phoneStatus?.codeVerificationStatus,
        },
        restrictions: data.sandboxRestrictions,
      });
      await loadConfigurations();
    } catch (err: unknown) {
      setSandDiagnosticError(err instanceof Error ? err.message : "Sandbox test check failed");
    } finally {
      setIsTestingSand(false);
    }
  };

  // Send Test Ping
  const handleSendTestPing = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingTest(true);
    setTestResult(null);
    setTestError(null);

    try {
      const res = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testNumber,
          environment: testEnv,
          messageType: "template",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to dispatch test message in ${testEnv.toUpperCase()} mode.`);
      }

      setTestResult(data.message || `Test message delivered successfully via ${testEnv.toUpperCase()} connection.`);
    } catch (err: unknown) {
      setTestError(err instanceof Error ? err.message : "Error sending test ping");
    } finally {
      setIsSendingTest(false);
    }
  };

  const copyToClipboard = (text: string, type: "webhook" | "token") => {
    navigator.clipboard.writeText(text);
    if (type === "webhook") {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-16">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#5938F5]/10 text-[#5938F5] border border-[#5938F5]/20">
                Workspace Connections
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              WhatsApp API & Sandbox Settings
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Independent connections for Production and Sandbox testing. Production data and credentials are completely isolated.
            </p>
          </div>

          <button
            onClick={loadConfigurations}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Status
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab("production")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "production"
                ? "border-[#5938F5] text-[#5938F5] dark:text-violet-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Production Connection
            {isProdConfigured && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Connected" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("sandbox")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "sandbox"
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Beaker className="w-4 h-4" />
            Sandbox Testing
            {isSandConfigured ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Connected" />
            ) : (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                Setup
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("webhook")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "webhook"
                ? "border-[#5938F5] text-[#5938F5] dark:text-violet-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Globe className="w-4 h-4" />
            Webhook & Callbacks
          </button>
        </div>

        {/* TAB 1: PRODUCTION CONNECTION */}
        {activeTab === "production" && (
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#5938F5]/10 text-[#5938F5] flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Production WhatsApp Cloud API
                      </h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#5938F5]/10 text-[#5938F5] border border-[#5938F5]/20">
                        LIVE BUSINESS
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Messages dispatched here go directly to real customers via your verified WhatsApp Business phone.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isProdConfigured ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Connected & Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                      Not Connected
                    </span>
                  )}
                </div>
              </div>

              {/* Active Connection Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Display Phone Number</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                    {prodDisplayPhone || (isProdConfigured ? "Connected" : "—")}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Phone Number ID</div>
                  <div className="text-sm font-mono text-slate-900 dark:text-white mt-1 truncate">
                    {prodPhoneId || "—"}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400">WABA ID</div>
                  <div className="text-sm font-mono text-slate-900 dark:text-white mt-1 truncate">
                    {prodWabaId || "—"}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleLaunchEmbeddedSignup}
                  disabled={isLaunchingSignup}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5938F5] hover:bg-[#4d2ee0] text-white font-medium text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isLaunchingSignup ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  {isProdConfigured ? "Reconnect Meta Embedded Signup" : "Connect via Meta Embedded Signup"}
                </button>

                <button
                  type="button"
                  onClick={handleTestProd}
                  disabled={isTestingProd || !isProdConfigured}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isTestingProd ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  Run Meta Diagnostic Check
                </button>

                <button
                  type="button"
                  onClick={() => setShowProdAdvanced(!showProdAdvanced)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 ml-auto cursor-pointer"
                >
                  {showProdAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showProdAdvanced ? "Hide Manual Credentials" : "Edit Credentials Manually"}
                </button>
              </div>

              {signupSuccess && (
                <div className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{signupSuccess}</span>
                </div>
              )}

              {signupError && (
                <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{signupError}</span>
                </div>
              )}

              {/* Diagnostic Results */}
              {prodDiagnostic && (
                <div className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs space-y-2">
                  <div className="font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {prodDiagnostic.message}
                  </div>
                  {prodDiagnostic.details && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700 dark:text-slate-300 pt-1">
                      <div>Status: <span className="font-semibold">{prodDiagnostic.details.verificationStatus || "VERIFIED"}</span></div>
                      <div>Quality: <span className="font-semibold">{prodDiagnostic.details.qualityRating || "GREEN"}</span></div>
                      <div>Verified Name: <span className="font-semibold">{prodDiagnostic.details.verifiedName || "Approved"}</span></div>
                      <div>Phone: <span className="font-semibold">{prodDiagnostic.details.displayPhoneNumber || "Active"}</span></div>
                    </div>
                  )}
                </div>
              )}

              {prodDiagnosticError && (
                <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{prodDiagnosticError}</span>
                </div>
              )}
            </div>

            {/* Manual Credentials Form (Collapsible) */}
            {showProdAdvanced && (
              <form onSubmit={handleSaveProd} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Manual Production Credentials
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    For enterprise accounts configuring a custom System User permanent access token. Tokens are AES-256 encrypted at rest.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Phone Number ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 109283746501928"
                      value={prodPhoneId}
                      onChange={(e) => setProdPhoneId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5938F5]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      WhatsApp Business Account ID (WABA ID)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 293847561029384"
                      value={prodWabaId}
                      onChange={(e) => setProdWabaId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5938F5]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Permanent System User Access Token
                  </label>
                  <input
                    type="password"
                    placeholder="Paste EAAG... Permanent Access Token"
                    value={prodToken}
                    onChange={(e) => setProdToken(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5938F5]"
                  />
                </div>

                {saveProdStatus && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      saveProdStatus.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200"
                        : "bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-200 border border-red-200"
                    }`}
                  >
                    {saveProdStatus.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span>{saveProdStatus.text}</span>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSavingProd}
                    className="px-4 py-2 rounded-xl bg-[#5938F5] hover:bg-[#4d2ee0] text-white text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isSavingProd ? "Saving..." : "Save Production Credentials"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: SANDBOX TESTING ENVIRONMENT */}
        {activeTab === "sandbox" && (
          <div className="space-y-6">
            {/* Sandbox Status Card */}
            <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                    <Beaker className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        WhatsApp Developer Sandbox Mode
                      </h2>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        SANDBOX TESTING
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Test message sending and template triggers without sending real messages through your production business account.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isSandConfigured ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Sandbox Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      Setup Required
                    </span>
                  )}
                </div>
              </div>

              {/* Instructions Guide */}
              <div className="mt-5 p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 space-y-3">
                <div className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  How to get your Meta WhatsApp Sandbox credentials:
                </div>
                <ol className="text-xs text-amber-800/90 dark:text-amber-300/90 space-y-1.5 list-decimal pl-4">
                  <li>
                    Open your <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="underline font-semibold hover:text-amber-900">Meta for Developers Console</a> and select your App (ID: {appId}).
                  </li>
                  <li>
                    In the left navigation sidebar, select <strong>WhatsApp</strong> → <strong>API Setup</strong>.
                  </li>
                  <li>
                    Copy the <strong>Phone number ID</strong> and <strong>WhatsApp Business Account ID</strong>.
                  </li>
                  <li>
                    Copy the <strong>Temporary access token</strong> (note: Meta temporary tokens expire after 24 hours, or you can supply a System User token).
                  </li>
                  <li>
                    Under the <strong>"To"</strong> dropdown in Meta console, add your personal phone number to the verified recipient whitelist (Meta sandbox only allows messaging pre-approved numbers).
                  </li>
                </ol>
              </div>

              {/* Sandbox Configuration Form */}
              <form onSubmit={handleSaveSand} className="space-y-4 mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Sandbox Phone Number ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 109283746501928"
                      value={sandPhoneId}
                      onChange={(e) => setSandPhoneId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Sandbox WABA ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 293847561029384"
                      value={sandWabaId}
                      onChange={(e) => setSandWabaId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sandbox Access Token <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required={!isSandConfigured}
                    placeholder="Paste Meta Sandbox Token (EAAG...)"
                    value={sandToken}
                    onChange={(e) => setSandToken(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Tokens are encrypted at rest with AES-256-GCM. Saving sandbox credentials will never affect your production connection.
                  </p>
                </div>

                {saveSandStatus && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      saveSandStatus.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200"
                        : "bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-200 border border-red-200"
                    }`}
                  >
                    {saveSandStatus.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span>{saveSandStatus.text}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSavingSand}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isSavingSand ? "Saving Sandbox..." : "Save Sandbox Connection"}
                  </button>

                  <button
                    type="button"
                    onClick={handleTestSand}
                    disabled={isTestingSand || !isSandConfigured}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isTestingSand ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    Test Sandbox Connection
                  </button>
                </div>
              </form>

              {/* Sandbox Diagnostic Output */}
              {sandDiagnostic && (
                <div className="mt-5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs space-y-3">
                  <div className="font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {sandDiagnostic.message}
                  </div>
                  {sandDiagnostic.details && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700 dark:text-slate-300">
                      <div>Status: <span className="font-semibold">{sandDiagnostic.details.verificationStatus || "VERIFIED"}</span></div>
                      <div>Quality: <span className="font-semibold">{sandDiagnostic.details.qualityRating || "GREEN"}</span></div>
                      <div>Test Phone: <span className="font-semibold">{sandDiagnostic.details.displayPhoneNumber || "Active Test"}</span></div>
                      <div>Verified Name: <span className="font-semibold">{sandDiagnostic.details.verifiedName || "Sandbox"}</span></div>
                    </div>
                  )}

                  {sandDiagnostic.restrictions && (
                    <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60">
                      <div className="font-semibold text-slate-900 dark:text-white mb-1">
                        Active Sandbox Guardrails:
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                        {sandDiagnostic.restrictions.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {sandDiagnosticError && (
                <div className="mt-5 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{sandDiagnosticError}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: WEBHOOK & CALLBACKS */}
        {activeTab === "webhook" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#5938F5]" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Meta Webhook Configuration
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Configure this endpoint in your Meta App Dashboard under WhatsApp → Configuration. Both production and sandbox webhook events are processed automatically.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Callback URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(webhookUrl, "webhook")}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer shrink-0"
                  >
                    {copiedWebhook ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Verify Token
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={verifyToken}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(verifyToken, "token")}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer shrink-0"
                  >
                    {copiedToken ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs space-y-2">
                <div className="font-semibold text-slate-900 dark:text-white">
                  Required Webhook Subscription Fields:
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                    messages
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                    smb_message_echoes
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SEND TEST PING SECTION */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-[#5938F5]" />
              Test Message Dispatch
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Dispatches a Meta-approved <code>hello_world</code> test template to verify end-to-end delivery through the chosen environment.
            </p>
          </div>

          <form onSubmit={handleSendTestPing} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Dispatch Environment
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTestEnv("production")}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      testEnv === "production"
                        ? "bg-[#5938F5]/10 border-[#5938F5] text-[#5938F5] dark:text-violet-400"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    PRODUCTION
                  </button>

                  <button
                    type="button"
                    onClick={() => setTestEnv("sandbox")}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      testEnv === "sandbox"
                        ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    SANDBOX
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Recipient Phone Number (E.164 with Country Code)
                </label>
                <input
                  type="text"
                  required
                  placeholder="+14155550192"
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5938F5]"
                />
                {testEnv === "sandbox" && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                    * In Sandbox mode, recipient must be in your Meta Developer Console 'To' allowlist.
                  </p>
                )}
              </div>
            </div>

            {testResult && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{testResult}</span>
              </div>
            )}

            {testError && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{testError}</span>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSendingTest}
                className={`px-4 py-2.5 rounded-xl text-white text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50 inline-flex items-center gap-2 ${
                  testEnv === "sandbox"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-[#5938F5] hover:bg-[#4d2ee0]"
                }`}
              >
                {isSendingTest ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Send {testEnv.toUpperCase()} Test Ping
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
