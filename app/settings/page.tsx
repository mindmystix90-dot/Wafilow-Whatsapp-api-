"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Key, Shield, Globe, Send, Check, Copy, AlertCircle, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
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
  const [configId, setConfigId] = useState("293484983375100");

  // Embedded Signup state
  const [isLaunchingSignup, setIsLaunchingSignup] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState<{
    businessName?: string | null;
    wabaId?: string | null;
    phoneNumberId?: string | null;
    displayPhone?: string | null;
    verifiedName?: string | null;
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
      ? `${window.location.origin}/api/webhook`
      : "https://your-domain.com/api/webhook";

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
      console.warn("Could not reload WhatsApp config:", err);
    }
  };

  const handleLaunchEmbeddedSignup = async () => {
    setIsLaunchingSignup(true);
    setSignupError(null);
    setSignupSuccess(null);

    try {
      // 1. Launch real Meta Facebook JS SDK popup flow: launchWhatsAppSignup() -> FB.login()
      const signupResult = await launchWhatsAppSignup({
        appId: appId || "3356483501181888",
        configId: configId || "293484983375100",
        version: "v26.0",
      });

      // 2. Send authorization code and session IDs to server
      const res = await fetch("/api/whatsapp/embedded-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: signupResult.code,
          wabaId: signupResult.wabaId,
          phoneNumberId: signupResult.phoneNumberId,
          sessionInfo: signupResult.sessionInfo,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to complete Embedded Signup on the server.");
      }

      // 3. Update local state with real database data
      setIsConfigured(true);
      setHasServerToken(true);
      setWabaId(data.wabaId || "");
      setPhoneNumberId(data.phoneNumberId || "");
      setBusinessName(data.businessName || null);
      setDisplayPhone(data.displayPhoneNumber || null);
      setVerifiedName(data.verifiedName || null);
      setAccessToken("•••••••••••••••••••••••••••••• (Stored Server-Side)");

      setSignupSuccess({
        businessName: data.businessName,
        wabaId: data.wabaId,
        phoneNumberId: data.phoneNumberId,
        displayPhone: data.displayPhoneNumber,
        verifiedName: data.verifiedName,
      });

      // Reload config from server
      await refreshConfig();
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
        setSaveStatus({ type: "success", text: "Meta credentials saved successfully on the server." });
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
      subtitle="Configure WhatsApp Cloud API credentials, Webhooks, and Embedded Signup"
    >
      <div className="space-y-6 max-w-4xl">
        {/* Connection Status Banner */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full shrink-0 ${
                isConfigured ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Meta Cloud API Status
              </h4>
              <p className="text-xs text-slate-500">
                {isConfigured
                  ? "Connected and configured for WhatsApp Cloud API v21.0"
                  : "Awaiting Meta Cloud API Phone Number ID and Permanent Access Token"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingConnection || !isConfigured}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {isTestingConnection ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Test Connection
            </button>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                isConfigured
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              }`}
            >
              {isConfigured ? "Active & Ready" : "Setup Required"}
            </span>
          </div>
        </div>

        {/* Real Connection Test Feedback Banners */}
        {connectionTestError && (
          <div className="p-4 rounded-xl text-xs bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div>
              <strong className="font-semibold block mb-0.5">Meta API Connection Error:</strong>
              <p className="leading-relaxed">{connectionTestError}</p>
            </div>
          </div>
        )}

        {connectionTestResult && (
          <div className="p-4 rounded-xl text-xs bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div className="space-y-1">
              <strong className="font-semibold block">{connectionTestResult.message}</strong>
              {connectionTestResult.details && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                  <div>Verified Name: <span className="font-semibold">{connectionTestResult.details.verifiedName}</span></div>
                  <div>Phone Number: <span className="font-semibold">{connectionTestResult.details.displayPhoneNumber}</span></div>
                  <div>Quality Rating: <span className="font-semibold">{connectionTestResult.details.qualityRating}</span></div>
                  <div>Status: <span className="font-semibold">{connectionTestResult.details.verificationStatus}</span></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Meta Embedded Signup Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-900 to-slate-900 text-white border border-emerald-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                1-Click Meta Onboarding
              </span>
              {isConfigured && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Meta WABA Linked
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold">Connect WhatsApp via Embedded Signup</h3>
            <p className="text-xs text-slate-300 max-w-lg">
              Seamlessly link your Meta Business Manager, claim phone numbers, and authorize WhatsApp messaging permissions in seconds.
            </p>

            {/* Connected Account Database Summary */}
            {isConfigured && (
              <div className="pt-2 font-mono text-xs text-emerald-200/90 flex flex-wrap gap-x-4 gap-y-1">
                {businessName && (
                  <div>
                    Business: <span className="text-white font-semibold">{businessName}</span>
                  </div>
                )}
                {wabaId && (
                  <div>
                    WABA ID: <span className="text-white font-semibold">{wabaId}</span>
                  </div>
                )}
                {(displayPhone || phoneNumberId) && (
                  <div>
                    Phone:{" "}
                    <span className="text-white font-semibold">
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
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0"
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

        {/* Embedded Signup Error Banner */}
        {signupError && (
          <div className="p-4 rounded-xl text-xs bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div>
              <strong className="font-semibold block mb-0.5">Embedded Signup Notice:</strong>
              <p className="leading-relaxed">{signupError}</p>
            </div>
          </div>
        )}

        {/* Embedded Signup Success Banner */}
        {signupSuccess && (
          <div className="p-4 rounded-xl text-xs bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div className="space-y-1">
              <strong className="font-semibold block">WhatsApp Business Account Connected Successfully</strong>
              <p className="leading-relaxed">
                Your Meta WABA and Phone Number have been securely registered to your organization.
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

        {/* Credentials Form */}
        <form
          onSubmit={handleSaveCredentials}
          className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-600" />
                WhatsApp Cloud API Credentials
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configured server-side. Stored securely and never leaked to client browsers.
              </p>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {isSaving ? "Saving..." : "Save Credentials"}
            </button>
          </div>

          {saveStatus && (
            <div
              className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                saveStatus.type === "success"
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800"
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
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
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
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
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
                placeholder={hasServerToken ? "•••••••••••••••••••••••••••••• (Configured)" : "EAAGm0PX4ZC..."}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Generated from Meta Business Manager &gt; System Users with <code className="font-mono">whatsapp_business_messaging</code> permissions.
              </p>
            </div>
          </div>
        </form>

        {/* Webhook Configuration */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            Meta Webhook Integration
          </h3>
          <p className="text-xs text-slate-500 mb-5">
            Configure this Callback URL and Verify Token in Meta App Dashboard &gt; WhatsApp &gt; Configuration
          </p>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Callback URL (Supports GET Challenge Verification & POST Events)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(webhookUrl);
                    setCopiedWebhook(true);
                    setTimeout(() => setCopiedWebhook(false), 2000);
                  }}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 font-medium"
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
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* Live Message Dispatch Tester */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <Send className="w-4 h-4 text-violet-600" />
            Send Test WhatsApp Notification
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Sends an immediate real WhatsApp test template (<code className="font-mono">hello_world</code>) through Meta Cloud API v21.0
          </p>

          <form onSubmit={handleSendTestMessage} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value)}
                placeholder="e.g. +14155550192 or 14155550192"
                className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
              <button
                type="submit"
                disabled={isSendingTest}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
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
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-900 dark:text-red-200 text-xs">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="font-semibold block mb-0.5">Meta API Error:</strong>
                    <p className="leading-relaxed">{testError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Notification */}
            {testResult && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200 text-xs">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
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
      </div>
    </AppLayout>
  );
}
