"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import {
  Globe,
  Send,
  Check,
  Copy,
  AlertCircle,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Info,
  Beaker,
  Building2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  X,
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
  lastError?: string | null;
  isPendingRegistration?: boolean;
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const actionParam = searchParams.get("action");

  const [activeTab, setActiveTab] = useState<"production" | "sandbox" | "webhook">(
    actionParam === "register"
      ? "production"
      : tabParam === "sandbox" || tabParam === "webhook"
      ? tabParam
      : "production"
  );

  // Production State
  const [prodPhoneId, setProdPhoneId] = useState("");
  const [prodWabaId, setProdWabaId] = useState("");
  const [prodToken, setProdToken] = useState("");
  const [prodDisplayPhone, setProdDisplayPhone] = useState<string | null>(null);
  const [prodVerifiedName, setProdVerifiedName] = useState<string | null>(null);
  const [isProdConfigured, setIsProdConfigured] = useState(false);
  const [prodStatus, setProdStatus] = useState("disconnected");
  const [prodLastChecked, setProdLastChecked] = useState<string | null>(null);
  const [prodLastError, setProdLastError] = useState<string | null>(null);
  const [prodIsPendingRegistration, setProdIsPendingRegistration] = useState(false);
  const [showProdAdvanced, setShowProdAdvanced] = useState(false);

  // Cloud API Phone Registration State
  const [showRegisterModal, setShowRegisterModal] = useState(actionParam === "register");
  const [regPin, setRegPin] = useState("");
  const [showRegPin, setShowRegPin] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);

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

  // Helper to populate connection state from API response
  const applyConfigData = useCallback((data: {
    verifyToken?: string;
    appId?: string;
    configId?: string;
    production?: ConnectionDetails;
    sandbox?: ConnectionDetails;
  }) => {
    if (data.verifyToken) setVerifyToken(data.verifyToken);
    if (data.appId) setAppId(data.appId);
    if (data.configId) setConfigId(data.configId);

    // Populate Production
    const prod: ConnectionDetails = data.production || {
      configured: false,
      status: "disconnected",
      phoneNumberId: null,
      wabaId: null,
      displayPhoneNumber: null,
      verifiedName: null,
      hasAccessToken: false,
      lastCheckedAt: null,
    };
    setIsProdConfigured(prod.configured || false);
    setProdStatus(prod.status || (prod.configured ? "connected" : "disconnected"));
    setProdPhoneId(prod.phoneNumberId || "");
    setProdWabaId(prod.wabaId || "");
    setProdDisplayPhone(prod.displayPhoneNumber || null);
    setProdVerifiedName(prod.verifiedName || null);
    setProdLastChecked(prod.lastCheckedAt || null);
    setProdLastError(prod.lastError || null);
    setProdIsPendingRegistration(Boolean(prod.isPendingRegistration));
    if (prod.hasAccessToken) {
      setProdToken("•••••••••••••••••••••••••••••• (Stored Server-Side)");
    }

    // Populate Sandbox
    const sand: ConnectionDetails = data.sandbox || {
      configured: false,
      status: "disconnected",
      phoneNumberId: null,
      wabaId: null,
      displayPhoneNumber: null,
      verifiedName: null,
      hasAccessToken: false,
      lastCheckedAt: null,
    };
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
  }, []);

  // Callable configuration reloader for manual refresh and post-save events
  const loadConfigurations = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/config");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          applyConfigData(data);
        }
      }
    } catch (err) {
      console.warn("Could not load WhatsApp config:", err);
    }
  }, [applyConfigData]);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const res = await fetch("/api/whatsapp/config");
        if (res.ok) {
          const data = await res.json();
          if (!ignore && data.success) {
            applyConfigData(data);
          }
        }
      } catch (err) {
        console.warn("Could not load WhatsApp config:", err);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [applyConfigData]);

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

      if (data.registrationRequired) {
        setProdIsPendingRegistration(true);
      }

      await loadConfigurations();
    } catch (err: unknown) {
      setProdDiagnosticError(err instanceof Error ? err.message : "Diagnostic check failed");
    } finally {
      setIsTestingProd(false);
    }
  };

  // Submit Cloud API Phone Registration with 6-digit PIN
  const handleRegisterPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = regPin.trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      setRegError("PIN must be exactly 6 numeric digits.");
      return;
    }

    setIsRegistering(true);
    setRegError(null);
    setRegSuccess(null);

    try {
      const res = await fetch("/api/whatsapp/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: cleanPin }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Meta registration failed. Please verify your 6-digit PIN and try again.");
      }

      setRegSuccess(data.message || "WhatsApp phone number successfully registered with Meta Cloud API!");
      setRegPin("");
      setProdIsPendingRegistration(false);
      setProdLastError(null);
      await loadConfigurations();
    } catch (err: unknown) {
      setRegError(err instanceof Error ? err.message : "Registration request failed.");
    } finally {
      setIsRegistering(false);
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
    <AppLayout
      title="Settings"
      subtitle="Manage WhatsApp Cloud API connections and Sandbox testing"
    >
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Display Phone Number</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1 truncate">
                    {prodDisplayPhone
                      ? `${prodDisplayPhone}${prodVerifiedName ? ` (${prodVerifiedName})` : ""}`
                      : isProdConfigured
                      ? "Connected"
                      : "—"}
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

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Connection State</div>
                  <div className="text-sm font-semibold capitalize text-slate-900 dark:text-white mt-1">
                    {prodStatus}
                  </div>
                  {prodLastChecked && (
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {new Date(prodLastChecked).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Required: Cloud API Registration Alert Banner */}
              {(prodIsPendingRegistration || (prodLastError && (prodLastError.includes("133010") || prodLastError.toLowerCase().includes("registration")))) && (
                <div className="mt-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-200/60 dark:bg-amber-900/60 flex items-center justify-center shrink-0 mt-0.5">
                      <KeyRound className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                    </div>
                    <div>
                      <div className="font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                        <span>Action Required: Phone Number Not Registered for Cloud API (Error 133010)</span>
                      </div>
                      <p className="text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                        Meta requires an explicit registration call with your 6-digit two-step verification PIN before this phone number can send or receive messages.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRegisterModal(true);
                      setRegSuccess(null);
                      setRegError(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shrink-0 cursor-pointer shadow-xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Register Phone Now
                  </button>
                </div>
              )}

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
                  onClick={() => {
                    setShowRegisterModal(true);
                    setRegSuccess(null);
                    setRegError(null);
                  }}
                  disabled={!isProdConfigured}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/40 text-[#5938F5] dark:text-violet-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Register Phone for Cloud API
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

              {/* Phone Number Registration Card (Meta Cloud API v24.0) */}
              {showRegisterModal && (
                <div className="mt-5 p-5 sm:p-6 rounded-2xl border-2 border-violet-400 dark:border-violet-600 bg-slate-50/50 dark:bg-slate-950/50 shadow-xs space-y-4">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#5938F5]/10 text-[#5938F5] flex items-center justify-center font-bold shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          Register Phone Number for Meta Cloud API (v24.0)
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300">
                            Required Step
                          </span>
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Meta requires an explicit Cloud API registration with your 6-digit two-step verification PIN before this number can send or receive messages.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRegisterModal(false);
                        setRegError(null);
                        setRegSuccess(null);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Selected Phone Context Display */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Selected Phone Number:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {prodDisplayPhone || "Registered WhatsApp Business Number"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Phone Number ID:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {prodPhoneId || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">WABA ID:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {prodWabaId || "—"}
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleRegisterPhone} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Two-Step Verification 6-Digit PIN
                      </label>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
                        Enter your 6-digit PIN. If you already created a PIN in Meta WhatsApp Manager (under Two-Step Verification), enter the same PIN. If you have not set one yet, this 6-digit PIN sets your Cloud API two-step verification code.
                      </p>
                      <div className="relative max-w-xs">
                        <input
                          type={showRegPin ? "text" : "password"}
                          maxLength={6}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="off"
                          placeholder="••••••"
                          value={regPin}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 6);
                            setRegPin(digitsOnly);
                          }}
                          disabled={isRegistering}
                          className="w-full tracking-widest text-center text-lg font-mono px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5938F5]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPin(!showRegPin)}
                          tabIndex={-1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                        >
                          {showRegPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {regError && (
                      <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          <span className="font-semibold block">Registration Error</span>
                          {regError}
                        </div>
                      </div>
                    )}

                    {regSuccess && (
                      <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          <span className="font-semibold block">Registration Successful</span>
                          {regSuccess}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="submit"
                        disabled={regPin.length !== 6 || isRegistering || !isProdConfigured}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5938F5] hover:bg-[#4d2ee0] text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-40 shadow-xs"
                      >
                        {isRegistering ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Registering with Meta Cloud API...
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            Submit Registration PIN
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowRegisterModal(false);
                          setRegError(null);
                          setRegSuccess(null);
                        }}
                        disabled={isRegistering}
                        className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <div className="text-[11px] text-slate-400 ml-auto hidden sm:block">
                        Meta rate limit: 10 requests / 72h.
                      </div>
                    </div>
                  </form>
                </div>
              )}

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
                      Connected & Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      Disconnected / Setup Required
                    </span>
                  )}
                </div>
              </div>

              {/* Active Sandbox Connection Info */}
              {isSandConfigured ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Test Phone Number</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1 truncate">
                      {sandDisplayPhone || (sandVerifiedName ? `${sandVerifiedName} (Test)` : "Meta Test Number Active")}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Sandbox Phone Number ID</div>
                    <div className="text-sm font-mono text-slate-900 dark:text-white mt-1 truncate">
                      {sandPhoneId || "—"}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Sandbox WABA ID</div>
                    <div className="text-sm font-mono text-slate-900 dark:text-white mt-1 truncate">
                      {sandWabaId || "—"}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Sandbox Status</div>
                    <div className="text-sm font-semibold capitalize text-slate-900 dark:text-white mt-1">
                      {sandStatus}
                    </div>
                    {sandLastChecked && (
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {new Date(sandLastChecked).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>No sandbox connection exists yet. Enter your test credentials below and click <strong>Save Sandbox Connection</strong> to connect.</span>
                </div>
              )}

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
                    Under the <strong>&quot;To&quot;</strong> dropdown in Meta console, add your personal phone number to the verified recipient whitelist (Meta sandbox only allows messaging pre-approved numbers).
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
                    * In Sandbox mode, recipient must be in your Meta Developer Console &apos;To&apos; allowlist.
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

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500">
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#5938F5]" />
            <span className="text-sm font-medium">Loading WhatsApp Settings...</span>
          </div>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
