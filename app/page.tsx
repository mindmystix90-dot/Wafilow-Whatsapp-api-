import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import {
  MessageSquare,
  Users,
  FileText,
  BarChart3,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Smartphone,
  Cloud,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 dark:bg-[#070b12] text-slate-900 dark:text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 border-b border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-b from-white via-slate-50/50 to-slate-100/40 dark:from-[#0c1220] dark:via-[#090d16] dark:to-[#070b12]">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-indigo-500/10 via-violet-500/5 to-transparent blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              {/* Quiet Top Kicker */}
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/50 px-3.5 py-1 rounded-full">
                <Zap className="w-3.5 h-3.5" />
                <span>Meta Graph API v24.0 Enterprise CRM</span>
              </div>

              {/* Dominant Headline */}
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-950 dark:text-white leading-[1.1]">
                The Modern WhatsApp CRM for High-Velocity Teams
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 font-normal leading-relaxed max-w-2xl mx-auto">
                Unified live inbox, Meta-approved HSM notification templates, contact directories, and dual WhatsApp Business App Coexistence on one clean surface.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-slate-950 to-indigo-900 hover:from-slate-900 hover:to-indigo-800 dark:from-indigo-600 dark:to-violet-600 dark:hover:from-indigo-500 dark:hover:to-violet-500 text-white font-semibold text-sm shadow-md shadow-indigo-950/20 transition-all hover:scale-[1.01] cursor-pointer"
                >
                  Open CRM Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/inbox"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200 font-semibold text-sm shadow-sm transition-all"
                >
                  <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Explore Live Inbox
                </Link>
              </div>

              {/* Architectural Badges */}
              <div className="pt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Dual Coexistence Mode</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Server-Side Token Security</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Encrypted PostgreSQL</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid Section */}
        <section id="features" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-2">
              Architecture & Features
            </span>
            <h2 className="text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
              Engineered for Real WhatsApp Operations
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Every screen is backed by verified database models and direct Meta Cloud API endpoints.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Live Inbox */}
            <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0c1220] shadow-sm hover:border-indigo-500/50 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Live Unified Inbox</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Bi-directional customer messaging with real webhook delivery ticks, read receipts, phone number validation, and instant chat creation.
              </p>
              <Link
                href="/inbox"
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 pt-1"
              >
                Open Inbox &rarr;
              </Link>
            </div>

            {/* Coexistence Mode */}
            <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0c1220] shadow-sm hover:border-indigo-500/50 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">WhatsApp Coexistence</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Keep using your WhatsApp Business mobile app while running Cloud API v24.0 automation on the exact same business phone number.
              </p>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 pt-1"
              >
                Configure Coexistence &rarr;
              </Link>
            </div>

            {/* HSM Templates */}
            <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0c1220] shadow-sm hover:border-indigo-500/50 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Meta HSM Templates</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Structured message templates for 24h customer care re-engagement, utility notifications, and direct parameter-bound test pings.
              </p>
              <Link
                href="/templates"
                className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 pt-1"
              >
                View Templates &rarr;
              </Link>
            </div>

            {/* Customer Directory */}
            <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0c1220] shadow-sm hover:border-indigo-500/50 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Customer Directory</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Clean audience database with E.164 phone normalization, opt-in verification, tags, and one-click WhatsApp message initiation.
              </p>
              <Link
                href="/contacts"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 pt-1"
              >
                Manage Contacts &rarr;
              </Link>
            </div>

            {/* Delivery Analytics */}
            <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0c1220] shadow-sm hover:border-indigo-500/50 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Real Metrics & Telemetry</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Zero fabricated charts. Genuine calculated counts for message delivery rates, read receipts, inbound volume, and active customer sessions.
              </p>
              <Link
                href="/analytics"
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 pt-1"
              >
                Inspect Analytics &rarr;
              </Link>
            </div>

            {/* Multi-Tenant Security */}
            <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0c1220] shadow-sm hover:border-indigo-500/50 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Tenant Isolation</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Encrypted PostgreSQL data architecture with atomic transactions ensuring complete isolation of customer accounts, tokens, and messages.
              </p>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 pt-1"
              >
                Security Settings &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* Coexistence Spotlight Section */}
        <section id="coexistence" className="py-16 border-y border-slate-200/80 dark:border-slate-800/80 bg-slate-950 text-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-3 py-1 rounded-full uppercase tracking-wider">
                  Featured Innovation
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  Dual-Channel WhatsApp Coexistence
                </h2>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  Traditionally, adopting the WhatsApp Cloud API required permanently deleting your WhatsApp Business mobile account. With Wafilow Coexistence, both channels remain simultaneously active on the same phone number.
                </p>

                <div className="space-y-3 pt-2 text-xs sm:text-sm text-slate-300">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Your support agents continue chatting normally on the WhatsApp Business mobile app.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Automated HSM notifications and Webhook flows dispatch simultaneously through Cloud API v24.0.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Mobile app replies automatically echo back to Wafilow Live Inbox via <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-300">smb_message_echoes</code>.</span>
                  </div>
                </div>

                <div className="pt-4">
                  <Link
                    href="/settings"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
                  >
                    Connect WhatsApp via Embedded Signup
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Architecture Diagram Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 space-y-4">
                <div className="text-xs font-mono text-slate-400 flex items-center justify-between pb-3 border-b border-slate-800">
                  <span>META_CLOUD_API // COEXISTENCE_V24</span>
                  <span className="text-emerald-400 font-semibold">Active Pipeline</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <Smartphone className="w-6 h-6 text-emerald-400 mx-auto" />
                    <div className="font-bold text-xs text-white">Mobile Device</div>
                    <div className="text-[11px] text-slate-400">WhatsApp Business App (v2.24.17+)</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <Cloud className="w-6 h-6 text-indigo-400 mx-auto" />
                    <div className="font-bold text-xs text-white">Cloud API v24.0</div>
                    <div className="text-[11px] text-slate-400">Automated Webhooks & Live Inbox</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/50 text-center text-xs text-indigo-200">
                  Single E.164 Business Phone Number shared concurrently across both channels
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Tiers Section */}
        <section id="pricing" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-2">
              Transparent Pricing
            </span>
            <h2 className="text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
              Flexible Plans for Every Stage
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Pay Meta conversation fees at direct wholesale rates. No markups on WhatsApp message charges.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Starter Tier */}
            <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0c1220] shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="text-sm font-bold text-slate-900 dark:text-white">Starter</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">$29</span>
                  <span className="text-xs text-slate-500">/ month</span>
                </div>
                <p className="text-xs text-slate-500">Ideal for small business owners launching their first Cloud API channel.</p>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>1 WhatsApp Business Number</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Live Bi-directional Inbox</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Coexistence Mode Enabled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Up to 1,000 Contacts</span>
                  </div>
                </div>
              </div>
              <Link
                href="/signup"
                className="w-full text-center py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-semibold text-xs transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Growth Tier (Highlighted) */}
            <div className="p-6 rounded-2xl border-2 border-indigo-600 bg-white dark:bg-[#0e1628] shadow-md shadow-indigo-600/10 flex flex-col justify-between space-y-6 relative">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Professional</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white uppercase tracking-wider">
                    Most Popular
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">$79</span>
                  <span className="text-xs text-slate-500">/ month</span>
                </div>
                <p className="text-xs text-slate-500">For scaling customer support teams and high-volume notifications.</p>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>3 WhatsApp Business Numbers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Multi-Agent Inbox Access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Meta HSM Template Testing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Up to 10,000 Contacts</span>
                  </div>
                </div>
              </div>
              <Link
                href="/signup"
                className="w-full text-center py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-colors"
              >
                Start Professional Plan
              </Link>
            </div>

            {/* Enterprise Tier */}
            <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0c1220] shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="text-sm font-bold text-slate-900 dark:text-white">Enterprise</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">$199</span>
                  <span className="text-xs text-slate-500">/ month</span>
                </div>
                <p className="text-xs text-slate-500">Dedicated Meta WABA infrastructure, SLAs, and unlimited customer scale.</p>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Unlimited Phone Numbers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Dedicated Solution Provider WABA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Webhook Pipeline Auto-Scaling</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Dedicated Technical Architect</span>
                  </div>
                </div>
              </div>
              <Link
                href="/signup"
                className="w-full text-center py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-semibold text-xs transition-colors"
              >
                Contact Enterprise
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
