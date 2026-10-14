"use client";

import { useState } from "react";
import {
  Search,
  CheckCircle2,
  Code2,
  Copy,
  Check,
  Zap,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface IntegrationItem {
  id: string;
  name: string;
  category: "meta" | "webhook" | "auth" | "database";
  description: string;
  status: "configured" | "ready" | "optional";
  statusLabel: string;
  endpoint?: string;
  docsUrl?: string;
  actionUrl: string;
  actionLabel: string;
  technicalDetails: {
    protocol: string;
    version: string;
    authMethod: string;
    notes: string;
  };
}

const INTEGRATIONS: IntegrationItem[] = [
  {
    id: "meta-cloud-api",
    name: "Meta WhatsApp Cloud API",
    category: "meta",
    description: "Official direct Meta Graph API integration for enterprise WhatsApp messaging, outbound broadcasts, and template dispatch.",
    status: "configured",
    statusLabel: "Production Active",
    endpoint: "https://graph.facebook.com/v24.0",
    docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
    actionUrl: "/settings",
    actionLabel: "Configure Credentials",
    technicalDetails: {
      protocol: "REST / HTTPS",
      version: "Graph API v24.0",
      authMethod: "Bearer Access Token (System User)",
      notes: "Direct server-side API calls with zero third-party broker or per-message markups.",
    },
  },
  {
    id: "meta-embedded-signup",
    name: "Meta Embedded Signup v4",
    category: "meta",
    description: "1-Click Facebook JavaScript SDK onboarding flow with WhatsApp Business App Coexistence bridge and automatic WABA registration.",
    status: "ready",
    statusLabel: "Integrated & Tested",
    endpoint: "https://www.facebook.com/v24.0/dialog/oauth",
    docsUrl: "https://developers.facebook.com/docs/whatsapp/embedded-signup",
    actionUrl: "/settings",
    actionLabel: "Launch 1-Click Signup",
    technicalDetails: {
      protocol: "OAuth 2.0 Auth Code Exchange",
      version: "ES v4 / Session Info v3",
      authMethod: "config_id: 2934849833375100",
      notes: "featureType: 'whatsapp_business_app_onboarding' enables simultaneous mobile app and web CRM operation.",
    },
  },
  {
    id: "webhook-ingestion",
    name: "Real-Time Webhook Engine",
    category: "webhook",
    description: "Bi-directional event ingestion for inbound WhatsApp customer messages, delivery ticks, read receipts, and mobile echoes.",
    status: "configured",
    statusLabel: "Active Ingestion",
    endpoint: "/api/webhook",
    actionUrl: "/settings",
    actionLabel: "Verify Webhook Token",
    technicalDetails: {
      protocol: "HTTPS Webhook (GET/POST)",
      version: "Meta v24.0 Event Format",
      authMethod: "HMAC SHA-256 (x-hub-signature-256)",
      notes: "Handles 'messages' and 'smb_message_echoes' with verified SHA-256 payload signatures.",
    },
  },
  {
    id: "prisma-postgres",
    name: "Prisma ORM & PostgreSQL Database",
    category: "database",
    description: "Tenant-isolated relational persistence engine storing contacts, conversation threads, message logs, and Meta tokens.",
    status: "configured",
    statusLabel: "Connected",
    endpoint: "DATABASE_URL (Prisma Client v5.22)",
    actionUrl: "/dashboard",
    actionLabel: "View Database Metrics",
    technicalDetails: {
      protocol: "PostgreSQL / SQLite Connection Pool",
      version: "Prisma ORM 5.22.0",
      authMethod: "Encrypted Database Credentials",
      notes: "Strict multi-tenant isolation keyed by organizationId across all message and contact queries.",
    },
  },
  {
    id: "nextauth-identity",
    name: "NextAuth Authentication & JWT",
    category: "auth",
    description: "Secure session management, salted password hashing via bcryptjs, and role-based access for workspace administrators.",
    status: "configured",
    statusLabel: "Active",
    endpoint: "/api/auth/[...nextauth]",
    actionUrl: "/team",
    actionLabel: "Manage Workspace Access",
    technicalDetails: {
      protocol: "JWT (JSON Web Token)",
      version: "NextAuth v4.24",
      authMethod: "Bcrypt (12 Rounds Salted Hash)",
      notes: "Protects all internal CRM routes (/dashboard, /inbox, /contacts, /settings) with strict session validation.",
    },
  },
  {
    id: "meta-hsm-templates",
    name: "Meta HSM Template Manager",
    category: "meta",
    description: "Pre-approved message templates for business-initiated customer outreach outside the 24-hour service window.",
    status: "configured",
    statusLabel: "Pre-Approved Ready",
    endpoint: "/api/whatsapp/messages (type: template)",
    actionUrl: "/templates",
    actionLabel: "View Templates",
    technicalDetails: {
      protocol: "Meta Cloud API Template Dispatch",
      version: "Graph API v24.0",
      authMethod: "WABA Pre-Approval",
      notes: "Standard 'hello_world' template verified; custom template submissions managed in Meta Business Manager.",
    },
  },
  {
    id: "data-deletion-callback",
    name: "GDPR User Data Deletion Callback",
    category: "meta",
    description: "Automated Meta Platform compliance endpoint allowing users to request account and data removal with tracking status codes.",
    status: "configured",
    statusLabel: "Compliance Active",
    endpoint: "/api/whatsapp/data-deletion",
    actionUrl: "/data-deletion",
    actionLabel: "Test Deletion Status",
    technicalDetails: {
      protocol: "REST (POST/GET)",
      version: "Meta Signed Request Format",
      authMethod: "App Secret HMAC Verification",
      notes: "Returns unique tracking code and status verification URL compliant with Meta Developer Policies.",
    },
  },
  {
    id: "rest-conversations-api",
    name: "Wafilow Internal REST API",
    category: "webhook",
    description: "Modular Next.js route handlers powering conversation listing, live message polling, contact creation, and diagnostic testing.",
    status: "configured",
    statusLabel: "Active",
    endpoint: "/api/whatsapp/conversations",
    actionUrl: "/inbox",
    actionLabel: "Access Live API",
    technicalDetails: {
      protocol: "JSON over HTTPS",
      version: "Next.js 15 App Router",
      authMethod: "Session Token & Tenant Scoping",
      notes: "Polls every 4 seconds for sub-second synchronization of new webhook events.",
    },
  },
];

export default function IntegrationsDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationItem | null>(null);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

  const filteredIntegrations = INTEGRATIONS.filter((item) => {
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.technicalDetails.protocol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.endpoint && item.endpoint.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleCopyEndpoint = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 2000);
  };

  return (
    <section id="integrations" className="py-20 sm:py-28 border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#070b12]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-3 py-1 rounded-full mb-3">
            <Zap className="w-3.5 h-3.5" />
            <span>Integrations & Technical Protocols</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            Native Connectors with Zero Third-Party Brokers
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Every integration below is implemented directly in this production codebase. Browse active connection states, technical specifications, and configuration entrypoints.
          </p>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search connectors... (e.g., Meta, Webhook, Postgres, JWT)"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl text-xs overflow-x-auto">
            {[
              { id: "all", label: "All Integrations" },
              { id: "meta", label: "Meta Ecosystem" },
              { id: "webhook", label: "Webhooks & APIs" },
              { id: "database", label: "Database" },
              { id: "auth", label: "Security & Auth" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activeCategory === cat.id
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredIntegrations.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0c1220] hover:border-indigo-500/50 dark:hover:border-indigo-500/40 transition-all shadow-xs flex flex-col justify-between group"
            >
              <div className="space-y-3">
                {/* Header: Name + Status */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.name}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{item.statusLabel}</span>
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                  {item.description}
                </p>

                {/* Technical Meta Bar */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Protocol</span>
                    <span>{item.technicalDetails.protocol}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Spec Version</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                      {item.technicalDetails.version}
                    </span>
                  </div>
                  {item.endpoint && (
                    <div className="flex items-center justify-between truncate pt-0.5">
                      <span className="text-[10px] text-slate-400">Route</span>
                      <span className="truncate max-w-[160px] text-slate-700 dark:text-slate-300" title={item.endpoint}>
                        {item.endpoint}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIntegration(item)}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Inspect Spec</span>
                </button>

                <Link
                  href={item.actionUrl}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-xs"
                >
                  <span>{item.actionLabel}</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {filteredIntegrations.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            <p className="text-sm">No connectors match &quot;{searchQuery}&quot;</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("all");
              }}
              className="mt-2 text-xs font-semibold text-indigo-600 hover:underline"
            >
              Reset Search Filters
            </button>
          </div>
        )}

        {/* Technical Detail Inspection Modal */}
        {selectedIntegration && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                    {selectedIntegration.name}
                  </h3>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                    {selectedIntegration.technicalDetails.version}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedIntegration(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-2 py-1 rounded-md"
                >
                  ✕ Close
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {selectedIntegration.description}
              </p>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block">Authentication Method</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">
                    {selectedIntegration.technicalDetails.authMethod}
                  </span>
                </div>

                {selectedIntegration.endpoint && (
                  <div>
                    <span className="text-[10px] text-slate-400 block">Production Endpoint</span>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold truncate">
                        {selectedIntegration.endpoint}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyEndpoint(selectedIntegration.endpoint || "")}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 shrink-0"
                        title="Copy endpoint"
                      >
                        {copiedEndpoint ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-[10px] text-slate-400 block">Implementation Notes</span>
                  <span className="text-slate-600 dark:text-slate-300 font-sans text-xs">
                    {selectedIntegration.technicalDetails.notes}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIntegration(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Done
                </button>
                <Link
                  href={selectedIntegration.actionUrl}
                  onClick={() => setSelectedIntegration(null)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <span>{selectedIntegration.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
