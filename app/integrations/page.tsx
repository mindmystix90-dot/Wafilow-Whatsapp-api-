"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import {
  Search,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  FileSpreadsheet,
  Share2,
  Zap,
  BookOpen,
  ShoppingBag,
  Building2,
  MessageSquare,
  Shield,
  ArrowLeft,
  Globe,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Sliders,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { launchWhatsAppSignup } from "@/lib/facebook-sdk";

type IntegrationId =
  | "whatsapp"
  | "meta"
  | "webhooks"
  | "google-sheets"
  | "facebook-leads"
  | "zapier"
  | "notion"
  | "shopify"
  | "hubspot";

interface BaseIntegration {
  id: IntegrationId;
  name: string;
  category: string;
  description: string;
  icon: typeof MessageSquare;
}

const integrationList: BaseIntegration[] = [
  {
    id: "whatsapp",
    name: "WhatsApp Cloud API",
    category: "Messaging Infrastructure",
    description: "Official Meta Cloud API connection for sending and receiving messages at global scale.",
    icon: MessageSquare,
  },
  {
    id: "meta",
    name: "Meta Business",
    category: "Account & Assets",
    description: "Link Meta Business Manager, claim phone numbers, and manage WABA assets.",
    icon: Globe,
  },
  {
    id: "webhooks",
    name: "Webhooks",
    category: "Developer Tools",
    description: "Real-time webhook subscriptions for instant inbound messages and delivery status updates.",
    icon: Shield,
  },
  {
    id: "google-sheets",
    name: "Google Sheets",
    category: "Productivity & Data",
    description: "Sync contacts, incoming inquiries, and order submissions automatically to spreadsheets.",
    icon: FileSpreadsheet,
  },
  {
    id: "facebook-leads",
    name: "Facebook Leads",
    category: "Lead Generation",
    description: "Instantly capture incoming leads from Meta Lead Ads and trigger WhatsApp welcome messages.",
    icon: Share2,
  },
  {
    id: "zapier",
    name: "Zapier",
    category: "Automation Hub",
    description: "Connect Wafilow with 5,000+ apps. Trigger workflows when new messages or contacts arrive.",
    icon: Zap,
  },
  {
    id: "notion",
    name: "Notion",
    category: "CRM & Knowledge",
    description: "Sync customer communication history and support requests directly into your Notion workspace.",
    icon: BookOpen,
  },
  {
    id: "shopify",
    name: "Shopify",
    category: "E-Commerce",
    description: "Send automated order confirmations, shipping tracking updates, and abandoned cart alerts.",
    icon: ShoppingBag,
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "Enterprise CRM",
    description: "Bi-directional contact syncing and deal pipeline timeline updates from WhatsApp chats.",
    icon: Building2,
  },
];

export default function IntegrationsPage() {
  const [activeIntegrationId, setActiveIntegrationId] = useState<IntegrationId | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "connected" | "available">("all");

  // Real WhatsApp config from server
  const [isConfigured, setIsConfigured] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [verifyToken, setVerifyToken] = useState("wafilow_webhook_token_secure_9921");
  const [hasServerToken, setHasServerToken] = useState(false);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [displayPhone, setDisplayPhone] = useState<string | null>(null);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [appId, setAppId] = useState("3356483501181888");
  const [configId, setConfigId] = useState("2934849833375100");
  const [apiVersion, setApiVersion] = useState("v24.0");

  // UI States
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [showAdvancedManual, setShowAdvancedManual] = useState(false);

  // Other third party integration toggles
  const [connectedServices, setConnectedServices] = useState<Record<string, boolean>>({
    "google-sheets": false,
    "facebook-leads": false,
    zapier: false,
    notion: false,
    shopify: false,
    hubspot: false,
  });

  // Action states
  const [isLaunchingSignup, setIsLaunchingSignup] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState<{
    businessName?: string | null;
    wabaId?: string | null;
    phoneNumberId?: string | null;
    displayPhoneNumber?: string | null;
    verifiedName?: string | null;
    isCoexistence?: boolean;
  } | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    message: string;
    details?: { verifiedName?: string; displayPhoneNumber?: string; qualityRating?: string; verificationStatus?: string };
  } | null>(null);
  const [connectionTestError, setConnectionTestError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhook`
      : "https://wafilow-whatsapp-api.vercel.app/api/webhook";

  // Fetch real WhatsApp config
  useEffect(() => {
    let isMounted = true;
    async function loadConfig() {
      try {
        const res = await fetch("/api/whatsapp/config");
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.success && isMounted) {
            setIsConfigured(Boolean(data.configured));
            setPhoneNumberId(data.phoneNumberId || "");
            setWabaId(data.wabaId || "");
            setVerifyToken(data.verifyToken || "wafilow_webhook_token_secure_9921");
            setHasServerToken(Boolean(data.hasAccessToken));
            if (data.appId) setAppId(data.appId);
            if (data.configId) setConfigId(data.configId);
            if (data.apiVersion) setApiVersion(data.apiVersion);
            if (data.businessName) setBusinessName(data.businessName);
            if (data.displayPhoneNumber) setDisplayPhone(data.displayPhoneNumber);
            if (data.verifiedName) setVerifiedName(data.verifiedName);
            if (data.hasAccessToken) {
              setAccessToken("•••••••••••••••••••••••••••••• (Stored Server-Side)");
            }
          }
        }
      } catch (err) {
        console.warn("Could not load WhatsApp config in Integrations:", err);
      }
    }
    loadConfig();
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
          setIsConfigured(Boolean(data.configured));
          setPhoneNumberId(data.phoneNumberId || "");
          setWabaId(data.wabaId || "");
          setHasServerToken(Boolean(data.hasAccessToken));
          if (data.appId) setAppId(data.appId);
          if (data.configId) setConfigId(data.configId);
          if (data.apiVersion) setApiVersion(data.apiVersion);
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
        version: apiVersion,
      });

      if (!signupResult?.code) {
        throw new Error("No authorization code received from Meta Embedded Signup.");
      }

      const res = await fetch("/api/whatsapp/embedded-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: signupResult.code,
          wabaId: signupResult.wabaId,
          phoneNumberId: signupResult.phoneNumberId,
          sessionInfo: signupResult.sessionInfo,
          event: signupResult.event,
          environment: "production",
        }),
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
        if (data.displayPhoneNumber) setDisplayPhone(data.displayPhoneNumber);
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

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionTestError(null);
    setConnectionTestResult(null);

    try {
      const res = await fetch("/api/whatsapp/test-connection", { method: "POST" });
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
      setConnectionTestError(`Connection test failed: ${msg}`);
    } finally {
      setIsTestingConnection(false);
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
        setSaveStatus({ type: "success", text: "Configuration saved securely on the server." });
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

  const getStatus = (id: IntegrationId): { label: "Connected" | "Setup required" | "Not connected"; isConnected: boolean } => {
    if (id === "whatsapp") {
      return isConfigured
        ? { label: "Connected", isConnected: true }
        : { label: "Setup required", isConnected: false };
    }
    if (id === "meta") {
      return isConfigured && wabaId
        ? { label: "Connected", isConnected: true }
        : { label: "Setup required", isConnected: false };
    }
    if (id === "webhooks") {
      return isConfigured
        ? { label: "Connected", isConnected: true }
        : { label: "Setup required", isConnected: false };
    }
    const isConn = Boolean(connectedServices[id]);
    return isConn
      ? { label: "Connected", isConnected: true }
      : { label: "Not connected", isConnected: false };
  };

  const filteredList = integrationList.filter((item) => {
    const status = getStatus(item.id);
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeFilter === "connected") return matchesSearch && status.isConnected;
    if (activeFilter === "available") return matchesSearch && !status.isConnected;
    return matchesSearch;
  });

  const activeIntegration = activeIntegrationId
    ? integrationList.find((i) => i.id === activeIntegrationId)
    : null;

  return (
    <AppLayout
      title="Integrations"
      subtitle="Connect the tools your workspace uses."
      action={
        activeIntegrationId && (
          <button
            type="button"
            onClick={() => setActiveIntegrationId(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Integrations
          </button>
        )
      }
    >
      <div className="space-y-6">
        {/* ======================= DETAILS VIEW (CLICK-TO-CONFIGURE) ======================= */}
        {activeIntegration ? (
          <div className="space-y-6 max-w-4xl animate-in fade-in duration-150">
            {/* Detail Top Header */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#5938F5]/10 text-[#5938F5] flex items-center justify-center shrink-0">
                  <activeIntegration.icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {activeIntegration.name}
                    </h2>
                    {getStatus(activeIntegration.id).isConnected ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Connected
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        {getStatus(activeIntegration.id).label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                    {activeIntegration.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveIntegrationId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Integrations
              </button>
            </div>

            {/* DEDICATED VIEW: WHATSAPP CLOUD API */}
            {activeIntegration.id === "whatsapp" && (
              <div className="space-y-5">
                {/* Embedded Signup Card */}
                <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5938F5] bg-[#5938F5]/10 px-2 py-0.5 rounded-md">
                          Meta Verified Setup
                        </span>
                        {isConfigured && (
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            Active
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Connect WhatsApp via Meta Embedded Signup
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
                        Authorize your Meta Business Account and link WhatsApp phone numbers with automatic token generation.
                      </p>

                      {isConfigured && (
                        <div className="pt-2 font-mono text-xs text-slate-600 dark:text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
                          {businessName && <div>Business: <span className="text-slate-900 dark:text-white font-semibold">{businessName}</span></div>}
                          {wabaId && <div>WABA ID: <span className="text-slate-900 dark:text-white font-semibold">{wabaId}</span></div>}
                          {(displayPhone || phoneNumberId) && (
                            <div>
                              Phone: <span className="text-slate-900 dark:text-white font-semibold">
                                {displayPhone || phoneNumberId}
                                {verifiedName ? ` (${verifiedName})` : ""}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleLaunchEmbeddedSignup}
                        disabled={isLaunchingSignup}
                        className="px-5 py-2.5 rounded-xl bg-[#5938F5] hover:bg-[#4d2ee0] disabled:opacity-50 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
                      >
                        {isLaunchingSignup ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Connecting with Meta...
                          </>
                        ) : (
                          <>
                            <Globe className="w-4 h-4" />
                            {isConfigured ? "Reconnect WhatsApp" : "Connect WhatsApp"}
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={isTestingConnection || !isConfigured}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs transition-all disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
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

                  {signupError && (
                    <div className="mt-4 p-3.5 rounded-xl text-xs bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/60 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                      <span>{signupError}</span>
                    </div>
                  )}

                  {signupSuccess && (
                    <div className="mt-4 p-3.5 rounded-xl text-xs bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <strong>
                          {signupSuccess.isCoexistence
                            ? "WhatsApp Connected with Business App Coexistence!"
                            : "WhatsApp Connected Successfully!"}
                        </strong>
                        <p className="mt-0.5">
                          {signupSuccess.isCoexistence
                            ? "Your WhatsApp Business App and Cloud API are now linked and will stay synchronized."
                            : "Your phone number and business account have been saved to your workspace."}
                        </p>
                      </div>
                    </div>
                  )}

                  {connectionTestError && (
                    <div className="mt-4 p-3.5 rounded-xl text-xs bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/60 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                      <span>{connectionTestError}</span>
                    </div>
                  )}

                  {connectionTestResult && (
                    <div className="mt-4 p-3.5 rounded-xl text-xs bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <strong>{connectionTestResult.message}</strong>
                        {connectionTestResult.details && (
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
                            <span>Verified Name: {connectionTestResult.details.verifiedName || "N/A"}</span>
                            <span>Phone: {connectionTestResult.details.displayPhoneNumber || "N/A"}</span>
                            <span>Rating: {connectionTestResult.details.qualityRating || "N/A"}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Webhook Status & Configuration */}
                <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#5938F5]" />
                        Webhook Configuration
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Ensure real-time incoming messages and read receipts flow into your Wafilow Inbox.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      Webhook Ready
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Callback URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={webhookUrl}
                          className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 font-mono text-xs select-all text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(webhookUrl);
                            setCopiedWebhook(true);
                            setTimeout(() => setCopiedWebhook(false), 2000);
                          }}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedWebhook ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Verify Token
                      </label>
                      <input
                        type="text"
                        value={verifyToken}
                        onChange={(e) => setVerifyToken(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 font-mono text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Collapsible Manual Settings */}
                <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedManual(!showAdvancedManual)}
                    className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sliders className="w-4 h-4 text-[#5938F5]" />
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          Advanced Manual Credentials
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Configure Phone Number ID, WABA ID, and permanent tokens directly
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <span>{showAdvancedManual ? "Hide" : "Expand"}</span>
                      {showAdvancedManual ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {showAdvancedManual && (
                    <form onSubmit={handleSaveCredentials} className="p-6 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
                      {saveStatus && (
                        <div
                          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                            saveStatus.type === "success"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-red-50 text-red-800 border border-red-200"
                          }`}
                        >
                          {saveStatus.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          <span>{saveStatus.text}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Phone Number ID
                          </label>
                          <input
                            type="text"
                            value={phoneNumberId}
                            onChange={(e) => setPhoneNumberId(e.target.value)}
                            placeholder="e.g. 109847291039482"
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            WhatsApp Business Account ID (WABA)
                          </label>
                          <input
                            type="text"
                            value={wabaId}
                            onChange={(e) => setWabaId(e.target.value)}
                            placeholder="e.g. 782910384729102"
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Permanent Access Token
                          </label>
                          <input
                            type="password"
                            value={accessToken}
                            onChange={(e) => setAccessToken(e.target.value)}
                            placeholder={hasServerToken ? "•••••••••••••••••••••••••••••• (Stored Server-Side)" : "EAAGm0PX4ZC..."}
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="px-5 py-2.5 rounded-xl bg-[#5938F5] hover:bg-[#4d2ee0] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                        >
                          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* DEDICATED VIEW: META BUSINESS */}
            {activeIntegration.id === "meta" && (
              <div className="space-y-5">
                <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        Meta Business Manager Link
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Manage linked Facebook Business Portfolios, App permissions, and WABA ownership.
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        isConfigured && wabaId
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {isConfigured && wabaId ? "Linked" : "Setup Required"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Meta App ID
                      </span>
                      <span className="text-slate-900 dark:text-white font-semibold">{appId}</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Configuration ID
                      </span>
                      <span className="text-slate-900 dark:text-white font-semibold">{configId}</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Business Name
                      </span>
                      <span className="text-slate-900 dark:text-white font-semibold">
                        {businessName || "Not connected"}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        WABA Account ID
                      </span>
                      <span className="text-slate-900 dark:text-white font-semibold">
                        {wabaId || "Not assigned"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleLaunchEmbeddedSignup}
                      disabled={isLaunchingSignup}
                      className="px-5 py-2.5 rounded-xl bg-[#5938F5] hover:bg-[#4d2ee0] text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                    >
                      {isLaunchingSignup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                      Launch Meta Authorization
                    </button>

                    <a
                      href="https://business.facebook.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#5938F5] flex items-center gap-1"
                    >
                      Meta Business Suite <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* DEDICATED VIEW: WEBHOOKS */}
            {activeIntegration.id === "webhooks" && (
              <div className="space-y-5">
                <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        Webhook Endpoint Details
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        High-throughput serverless webhook handler with automated tenant message resolution.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                      Active Endpoint
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Callback URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={webhookUrl}
                          className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 font-mono text-xs select-all text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(webhookUrl);
                            setCopiedWebhook(true);
                            setTimeout(() => setCopiedWebhook(false), 2000);
                          }}
                          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedWebhook ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Verify Token
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={verifyToken}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 font-mono text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200 mb-2">
                      Subscribed Webhook Fields
                    </h4>
                    <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                        messages
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                        message_status
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                        message_template_status_update
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DEDICATED VIEW: OTHER SUPPORTED INTEGRATIONS */}
            {activeIntegration.id !== "whatsapp" &&
              activeIntegration.id !== "meta" &&
              activeIntegration.id !== "webhooks" && (
                <div className="p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        {activeIntegration.name} Sync Settings
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Configure automated triggers and bi-directional updates with {activeIntegration.name}.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const next = !connectedServices[activeIntegration.id];
                        setConnectedServices((prev) => ({
                          ...prev,
                          [activeIntegration.id]: next,
                        }));
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        connectedServices[activeIntegration.id]
                          ? "bg-slate-100 dark:bg-slate-800 hover:bg-red-50 hover:text-red-600 text-slate-700 dark:text-slate-300"
                          : "bg-[#5938F5] hover:bg-[#4d2ee0] text-white shadow-xs"
                      }`}
                    >
                      {connectedServices[activeIntegration.id] ? "Disconnect" : "Connect Account"}
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#5938F5]" />
                      <span>Supported Workflows:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
                      <li>Trigger real-time message dispatch when records update</li>
                      <li>Sync inbound WhatsApp messages and contact tags instantly</li>
                      <li>Automatic deduplication based on international phone format</li>
                    </ul>
                  </div>
                </div>
              )}
          </div>
        ) : (
          /* ======================= OVERVIEW GRID VIEW ======================= */
          <div className="space-y-6">
            {/* Top Control Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search integrations by name or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5938F5]/20 focus:border-[#5938F5]"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveFilter("all")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    activeFilter === "all"
                      ? "bg-white dark:bg-slate-800 text-[#5938F5] shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  All ({integrationList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("connected")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    activeFilter === "connected"
                      ? "bg-white dark:bg-slate-800 text-[#5938F5] shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Connected ({integrationList.filter((i) => getStatus(i.id).isConnected).length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("available")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    activeFilter === "available"
                      ? "bg-white dark:bg-slate-800 text-[#5938F5] shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Available ({integrationList.filter((i) => !getStatus(i.id).isConnected).length})
                </button>
              </div>
            </div>

            {/* Integrations Responsive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredList.map((item) => {
                const Icon = item.icon;
                const status = getStatus(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveIntegrationId(item.id)}
                    className="group p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-[#5938F5]/40 transition-all flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      {/* Card Header with Icon, Name, and Status Badge */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-[#5938F5]/10 text-[#5938F5] group-hover:scale-105 transition-transform flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-950 dark:text-white group-hover:text-[#5938F5] transition-colors">
                              {item.name}
                            </h3>
                            <span className="text-[11px] font-medium text-slate-400">
                              {item.category}
                            </span>
                          </div>
                        </div>

                        {status.isConnected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            {status.label}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                        {item.description}
                      </p>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#5938F5]" />
                        <span>Cloud API Sync</span>
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveIntegrationId(item.id);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          status.isConnected
                            ? "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
                            : "bg-[#5938F5] hover:bg-[#4d2ee0] text-white shadow-xs"
                        }`}
                      >
                        {status.isConnected ? "Manage" : "Configure"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
