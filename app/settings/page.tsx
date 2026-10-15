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
  ChevronDown,
  ChevronUp,
  Sliders,
} from "lucide-react";
import { launchWhatsAppSignup } from "@/lib/facebook-sdk";

export default function SettingsPage() {
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [verifyToken, setVerifyToken] = useState("wafilow_webhook_token_secure_9921");
  const [testNumber, setTestNumber] = useState("+14155550192");
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [hasServerToken, setHasServerToken] = useState(false);

  // Business & Phone Details from Database
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [displayPhone, setDisplayPhone] = useState<string | null>(null);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [appId, setAppId] = useState("3356483501181888");
  const [configId, setConfigId] = useState("2934849833375100");

  // Collapsible Advanced Section
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Embedded Signup state
  const [isLaunchingSignup, setIsLaunchingSignup] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState<{
    businessName?: string | null;
    wabaId?: string | null;
    phoneNumberId?: string | null;
    displayPhone?: string | null;
    verifiedName?: string | null;
    isCoexistence?: boolean;
  } | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);

  // Save config state
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Test ping state
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ messageId?: string; text?: string } | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Real Meta Connection Test state
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    message: string;
    details?: { verifiedName?: string; displayPhoneNumber?: string; qualityRating?: string; verificationStatus?: string };
  } | null>(null);
  const [connectionTestError, setConnectionTestError] = useState<string | null>(null);

  const webhookUrl =
    typeof window !== "undefined"
      ? window.location.hostname.endsWith(".vercel.app") && window.location.hostname !== "wafilow-whatsapp-api.vercel.app"
        ? "https://wafilow-whatsapp-api.vercel.app/api/webhook"
        : `${window.location.origin}/api/webhook`
      : "https://wafilow-whatsapp-api.vercel.app/api/webhook";

  // Load existing configuration status on mount
  useEffect(() => {
    let isMounted = true;

    async function fetchInitialConfig() {
      try {
        const res = await fetch("/api/whatsapp/config");
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.success && isMounted) {
            setPhoneNumberId(data.phoneNumberId || "");
            setWabaId(data.wabaId || "");
            setVerifyToken(data.verifyToken || "wafilow_webhook_token_secure_9921");
            setIsConfigured(data.configured || false);
            setHasServerToken(data.hasAccessToken || false);
            if (data.appId) setAppId(data.appId);
            if (data.configId) setConfigId(data.configId);
            if (data.businessName) setBusinessName(data.businessName);
            if (data.displayPhoneNumber) setDisplayPhone(data.displayPhoneNumber);
            if (data.verifiedName) setVerifiedName(data.verifiedName);
            if (data.hasAccessToken) {
              setAccessToken("•••••••••••••••••••••••••••••• (Stored Server-Side)");
            }
          }
        }
      } catch (err) {
        console.warn("Could not load WhatsApp config:", err);
      }
    }

    fetchInitialConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshConfig = async () => {
    try {
      const res = await fetch("/api/whatsapp/config");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPhoneNumberId(data.phoneNumberId || "");
          setWabaId(data.wabaId || "");
          setIsConfigured(data.configured || false);
          setHasServerToken(data.hasAccessToken || false);
          if (data.businessName) setBusinessName(data.businessName);
          if (data.displayPhoneNumber) setDisplayPhone(data.displayPhoneNumber);
          if (data.verifiedName) setVerifiedName(data.verifiedName);
        }
      }
    } catch {
      // Soft fail
    }
  };

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
        body: JSON.stringify(signupResult),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setSignupError(data.error || "Failed to persist WhatsApp connection.");
      } else {
        setSignupSuccess(data);
        setIsConfigured(true);
        if (data.wabaId) setWabaId(data.wabaId);
        if (data.phoneNumberId) setPhoneNumberId(data.phoneNumberId);
        if (data.businessName) setBusinessName(data.businessName);
        if (data.displayPhone) setDisplayPhone(data.displayPhone);
        if (data.verifiedName) setVerifiedName(data.verifiedName);
        setHasServerToken(true);
        setAccessToken("•••••••••••••••••••••••••••••• (Stored Server-Side)");
        await refreshConfig();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Embedded Signup failed.";
      setSignupError(msg);
    } finally {
      setIsLaunchingSignup(false);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);

    try {
      const res = await fetch("/api/whatsapp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberId,
          wabaId,
          accessToken: accessToken.startsWith("••••") ? undefined : accessToken,
          verifyToken,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsConfigured(data.configured);
        setSaveStatus({ type: "success", text: "Meta credentials saved securely on the server." });
        setTimeout(() => setSaveStatus(null), 4000);
      } else {
        setSaveStatus({ type: "error", text: data.error || "Failed to save configuration." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setSaveStatus({ type: "error", text: `Error saving: ${msg}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingTest(true);
    setTestError(null);
    setTestResult(null);

    try {
      const res = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testNumber,
          messageType: "template",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setTestError(data.error || "Meta Cloud API rejected the test notification.");
      } else {
        setTestResult({
          messageId: data.messageId,
          text: data.message || `Test message delivered successfully to ${data.recipient}.`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network request failed";
      setTestError(`Failed to reach server test endpoint: ${msg}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionTestError(null);
    setConnectionTestResult(null);

    try {
      const res = await fetch("/api/whatsapp/test-connection", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setConnectionTestError(data.error || "Meta Cloud API connection test failed.");
      } else {
        setConnectionTestResult({
          message: data.message || "Connected successfully to Meta WhatsApp Cloud API.",
          details: data.details,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network request failed";
      setConnectionTestError(`Failed to reach connection test endpoint: ${msg}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <AppLayout
      title="API & Meta WABA Settings"
      subtitle="Manage your Meta Cloud API connection, credentials, and webhook configurations."
    >
      <div className="space-y-6 max-w-4xl">
        {/* Connection Status Overview - Clean Neutral Card */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                isConfigured ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-500"
              }`}
            />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Meta WhatsApp Cloud API v24.0
                </h4>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                    isConfigured
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {isConfigured ? "Connected" : "Setup Required"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isConfigured
                  ? "Connected and active for automated messaging and real-time webhook events."
                  : "Requires Meta Embedded Signup authorization or saved Cloud API credentials."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingConnection || !isConfigured}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs transition-all disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
            >
              {isTestingConnection ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5938F5]" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Test Connection
            </button>
          </div>
        </div>

        {/* Real Connection Test Feedback Banners - Restrained States */}
        {connectionTestError && (
          <div className="p-4 rounded-xl text-xs bg-red-50/90 text-red-900 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/60 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div>
              <strong className="font-semibold block mb-0.5">Meta API Connection Error:</strong>
              <p className="leading-relaxed">{connectionTestError}</p>
            </div>
          </div>
        )}

        {connectionTestResult && (
          <div className="p-4 rounded-xl text-xs bg-emerald-50/90 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div className="space-y-1">
              <strong className="font-semibold block">{connectionTestResult.message}</strong>
              {connectionTestResult.details && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px] text-emerald-800 dark:text-emerald-300">
                  <div>Verified Name: <span className="font-semibold">{connectionTestResult.details.verifiedName || "N/A"}</span></div>
                  <div>Phone Number: <span className="font-semibold">{connectionTestResult.details.displayPhoneNumber || "N/A"}</span></div>
                  <div>Quality Rating: <span className="font-semibold">{connectionTestResult.details.qualityRating || "N/A"}</span></div>
                  <div>Status: <span className="font-semibold">{connectionTestResult.details.verificationStatus || "N/A"}</span></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 1. Primary WhatsApp Connection - Clean Neutral Card with Violet Brand CTA */}
        <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#5938F5]/10 text-[#5938F5] border border-[#5938F5]/20">
                  Recommended Onboarding
                </span>
                {isConfigured && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                    Linked to Meta
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Meta Embedded Signup
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                Connect your WhatsApp Business Account directly with Meta. Link existing business numbers, claim new phone numbers, and grant permissions securely in seconds.
              </p>

              {/* Connected Account Database Summary */}
              {isConfigured && (
                <div className="pt-3 font-mono text-xs text-slate-600 dark:text-slate-300 flex flex-wrap gap-x-5 gap-y-1.5">
                  {businessName && (
                    <div className="bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                      Business: <span className="text-slate-900 dark:text-white font-semibold">{businessName}</span>
                    </div>
                  )}
                  {wabaId && (
                    <div className="bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                      WABA ID: <span className="text-slate-900 dark:text-white font-semibold">{wabaId}</span>
                    </div>
                  )}
                  {(displayPhone || phoneNumberId) && (
                    <div className="bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                      Phone:{" "}
                      <span className="text-slate-900 dark:text-white font-semibold">
                        {displayPhone || phoneNumberId}
                        {verifiedName ? ` (${verifiedName})` : ""}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              id="connect-whatsapp-embedded-button"
              onClick={handleLaunchEmbeddedSignup}
              disabled={isLaunchingSignup}
              className="px-5 py-2.5 rounded-xl bg-[#5938F5] hover:bg-[#4d2ee0] disabled:opacity-50 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0"
            >
              {isLaunchingSignup ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting with Meta...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  {isConfigured ? "Reconnect WhatsApp Business" : "Connect WhatsApp"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Embedded Signup Error Banner */}
        {signupError && (
          <div className="p-4 rounded-xl text-xs bg-red-50/90 text-red-900 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/60 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div>
              <strong className="font-semibold block mb-0.5">Embedded Signup Notice:</strong>
              <p className="leading-relaxed">{signupError}</p>
            </div>
          </div>
        )}

        {/* Embedded Signup Success Banner */}
        {signupSuccess && (
          <div className="p-4 rounded-xl text-xs bg-emerald-50/90 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <strong className="font-semibold block">
                  {signupSuccess.isCoexistence
                    ? "WhatsApp Business App Coexistence Connected"
                    : "WhatsApp Business Account Connected Successfully"}
                </strong>
                {signupSuccess.isCoexistence && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-600 text-white uppercase tracking-wider">
                    Coexistence Active
                  </span>
                )}
              </div>
              <p className="leading-relaxed">
                {signupSuccess.isCoexistence
                  ? "Coexistence enabled: Your existing WhatsApp Business App number is linked. You can continue chatting on your mobile app while accessing Cloud API v24.0 automation."
                  : "Your Meta WABA and Phone Number have been securely registered to your organization."}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                {signupSuccess.businessName && (
                  <div>
                    Business: <span className="font-semibold">{signupSuccess.businessName}</span>
                  </div>
                )}
                {signupSuccess.wabaId && (
                  <div>
                    WABA ID: <span className="font-semibold">{signupSuccess.wabaId}</span>
                  </div>
                )}
                {(signupSuccess.displayPhone || signupSuccess.phoneNumberId) && (
                  <div>
                    Phone:{" "}
                    <span className="font-semibold">
                      {signupSuccess.displayPhone || signupSuccess.phoneNumberId}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. Webhook Configuration Section */}
        <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#5938F5]" />
              Meta Webhook Integration
            </h3>
            <span className="text-[11px] font-medium text-slate-400">
              Receives messages & statuses
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Configure this Callback URL and Verify Token in Meta App Dashboard &gt; WhatsApp &gt; Configuration
          </p>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Callback URL (GET Challenge Verification & POST Events)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-mono text-xs select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(webhookUrl);
                    setCopiedWebhook(true);
                    setTimeout(() => setCopiedWebhook(false), 2000);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedWebhook ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Verify Token (META_WEBHOOK_VERIFY_TOKEN)
              </label>
              <input
                type="text"
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#5938F5]/20 focus:border-[#5938F5]"
              />
            </div>
          </div>
        </div>

        {/* 3. Live Message Dispatch Tester */}
        <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] shadow-sm">
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <Send className="w-4 h-4 text-[#5938F5]" />
            Send Test WhatsApp Notification
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Sends an immediate real WhatsApp test template (<code className="font-mono">hello_world</code>) through Meta Cloud API v24.0
          </p>

          <form onSubmit={handleSendTestMessage} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value)}
                placeholder="e.g. +14155550192 or 14155550192"
                className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#5938F5]/20 focus:border-[#5938F5]"
              />
              <button
                type="submit"
                disabled={isSendingTest}
                className="px-5 py-2.5 rounded-xl bg-[#5938F5] hover:bg-[#4d2ee0] disabled:opacity-50 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                {isSendingTest ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending to Meta...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Send Test Ping
                  </>
                )}
              </button>
            </div>

            {/* Error Notification */}
            {testError && (
              <div className="p-4 rounded-xl bg-red-50/90 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200 text-xs">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <strong className="font-semibold block mb-0.5">Meta API Error:</strong>
                    <p className="leading-relaxed">{testError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Notification */}
            {testResult && (
              <div className="p-4 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200 text-xs">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <strong className="font-semibold block mb-0.5">Test Message Sent:</strong>
                    <p className="leading-relaxed">{testResult.text}</p>
                    {testResult.messageId && (
                      <p className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300 mt-1">
                        Meta Message ID: {testResult.messageId}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* 4. Collapsible Advanced / Manual API Credentials Section */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Sliders className="w-4 h-4 text-[#5938F5]" />
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Advanced / Manual API Configuration
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Override Phone Number ID, WABA ID, or System User tokens manually
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span>{showAdvanced ? "Hide" : "Show"}</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showAdvanced && (
            <form
              onSubmit={handleSaveCredentials}
              className="p-6 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-4 animate-in fade-in duration-200"
            >
              {saveStatus && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    saveStatus.type === "success"
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800"
                  }`}
                >
                  {saveStatus.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{saveStatus.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number ID (META_PHONE_NUMBER_ID)
                  </label>
                  <input
                    type="text"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    placeholder="e.g. 109847291039482"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#5938F5]/20 focus:border-[#5938F5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp Business Account ID (META_WABA_ID)
                  </label>
                  <input
                    type="text"
                    value={wabaId}
                    onChange={(e) => setWabaId(e.target.value)}
                    placeholder="e.g. 782910384729102"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#5938F5]/20 focus:border-[#5938F5]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    System User Permanent Access Token (META_ACCESS_TOKEN)
                  </label>
                  <input
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder={hasServerToken ? "•••••••••••••••••••••••••••••• (Stored Server-Side)" : "EAAGm0PX4ZC..."}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#5938F5]/20 focus:border-[#5938F5]"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Generated from Meta Business Manager &gt; System Users with <code className="font-mono">whatsapp_business_messaging</code> permissions.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#5938F5] hover:bg-[#4d2ee0] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {isSaving ? "Saving..." : "Save Credentials"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
