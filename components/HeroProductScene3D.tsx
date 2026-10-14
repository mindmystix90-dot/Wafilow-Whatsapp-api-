"use client";

import { useState, useRef, useEffect, MouseEvent } from "react";
import {
  Smartphone,
  CheckCheck,
  Zap,
  Send,
} from "lucide-react";

export default function HeroProductScene3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(8);
  const [rotateY, setRotateY] = useState(-12);
  const [isHovered, setIsHovered] = useState(false);
  const [activeTab, setActiveTab] = useState<"inbox" | "contact" | "webhook">("inbox");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Check user preference for reduced motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setTimeout(() => setReducedMotion(true), 0);
    }
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (reducedMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Subtle, restrained tilt angles (-14 to +14 deg)
    const newRotateY = ((x - centerX) / centerX) * 14;
    const newRotateX = -((y - centerY) / centerY) * 14;

    setRotateX(newRotateX);
    setRotateY(newRotateY);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // Smoothly return to elegant resting angle
    setRotateX(8);
    setRotateY(-12);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-5xl mx-auto py-6 sm:py-10 perspective-[1400px] select-none"
      style={{ perspective: "1400px" }}
    >
      {/* Ambient background glow behind the 3D rig */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-700 ease-out"
        style={{
          background: isHovered
            ? "radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.18), rgba(124, 58, 237, 0.08) 45%, transparent 70%)"
            : "radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.12), transparent 60%)",
        }}
      />

      {/* 3D Transform Container */}
      <div
        className="relative transition-transform duration-300 ease-out will-change-transform"
        style={{
          transformStyle: "preserve-3d",
          transform: reducedMotion
            ? "none"
            : `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        }}
      >
        {/* BASE CANVAS: The Main Wafilow CRM Window */}
        <div
          className="relative bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-xl rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xl shadow-indigo-950/20 overflow-hidden"
          style={{ transform: "translateZ(0px)" }}
        >
          {/* Mac-style Window Titlebar */}
          <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/90 dark:bg-[#090e18]/90 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-3 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <span className="font-extrabold text-slate-900 dark:text-white">Wafilow CRM</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500 font-mono text-[11px]">Meta Graph API v24.0</span>
              </span>
            </div>

            {/* Interactive Scene Tab Switcher */}
            <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800/60 p-1 rounded-lg text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("inbox")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeTab === "inbox"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Live Inbox
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("contact")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeTab === "contact"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Customer Card
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("webhook")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeTab === "webhook"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Webhook Ingestion
              </button>
            </div>
          </div>

          {/* Window Body */}
          <div className="grid grid-cols-12 min-h-[420px] text-xs">
            {/* Sidebar Column */}
            <div className="col-span-4 border-r border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#080d16]/50 p-3 space-y-3">
              <div className="flex items-center justify-between text-slate-500 font-medium px-1">
                <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">Conversations</span>
                <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-mono font-bold">
                  2 Active
                </span>
              </div>

              {/* Chat Item 1 (Selected) */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#0f172a] border border-indigo-200 dark:border-indigo-900/60 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white truncate">Marcus Sterling</span>
                  <span className="text-[10px] text-slate-400 font-mono">10:42 AM</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  <Smartphone className="w-3 h-3 text-emerald-600" />
                  <span>+1 (415) 555-0192</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                  Can we verify the dispatch for batch #WF-92?
                </p>
                <div className="flex items-center gap-1 pt-1 text-[10px]">
                  <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium">
                    Priority
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium">
                    Opt-in Verified
                  </span>
                </div>
              </div>

              {/* Chat Item 2 */}
              <div className="p-2.5 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-colors space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">Elena Rostova</span>
                  <span className="text-[10px] text-slate-400 font-mono">09:15 AM</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                  <span>+44 7911 123456</span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  Thank you! The template was received.
                </p>
              </div>

              {/* Quick Coexistence status in sidebar */}
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 text-[11px] space-y-1 mt-4">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Coexistence Bridge</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  Mobile WhatsApp Business app and Wafilow Cloud API synchronized via Meta Webhooks.
                </p>
              </div>
            </div>

            {/* Main Chat / Details Column */}
            <div className="col-span-8 flex flex-col justify-between bg-white dark:bg-[#0c1220]">
              {/* Active Chat Header */}
              <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xs flex items-center justify-center">
                    MS
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">Marcus Sterling</span>
                      <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                        WhatsApp Verified
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">+1 (415) 555-0192 · Tier 1 WABA</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400">24h Care Window: Active</span>
                </div>
              </div>

              {/* Tab 1: Live Inbox View */}
              {activeTab === "inbox" && (
                <div className="p-4 space-y-3 flex-1 overflow-hidden">
                  {/* Customer Inbound Message */}
                  <div className="flex items-start gap-2 max-w-[85%]">
                    <div className="p-3 rounded-2xl rounded-tl-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs shadow-xs space-y-1">
                      <p>Hello! Can we verify the dispatch schedule for batch #WF-92? We need delivery before 3 PM.</p>
                      <div className="text-[10px] text-slate-400 text-right font-mono">10:40 AM</div>
                    </div>
                  </div>

                  {/* System Context Note */}
                  <div className="flex justify-center my-1">
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 px-2 py-0.5 rounded-full">
                      Inbound via Meta Cloud API v24.0 Webhook
                    </span>
                  </div>

                  {/* Agent Outbound Message */}
                  <div className="flex items-start justify-end gap-2 ml-auto max-w-[85%]">
                    <div className="p-3 rounded-2xl rounded-tr-xs bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs shadow-xs space-y-1">
                      <p>Hi Marcus! Batch #WF-92 is loaded on courier truck #14. Expected arrival is 1:45 PM today.</p>
                      <div className="flex items-center justify-end gap-1 text-[10px] text-indigo-200 font-mono">
                        <span>10:42 AM</span>
                        <CheckCheck className="w-3 h-3 text-cyan-300" />
                        <span>Read</span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile App Echo Notification */}
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 text-[11px] text-emerald-800 dark:text-emerald-300">
                    <Smartphone className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    <span>
                      <strong>Coexistence Echo:</strong> Synchronized with agent&apos;s mobile WhatsApp Business app in real-time.
                    </span>
                  </div>
                </div>
              )}

              {/* Tab 2: Contact Card View */}
              {activeTab === "contact" && (
                <div className="p-4 space-y-3 flex-1">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">Customer Record</span>
                      <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                        OPTED_IN
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50">
                        <span className="text-[10px] text-slate-400 block">Phone Identifier</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">+1 (415) 555-0192</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50">
                        <span className="text-[10px] text-slate-400 block">Organization</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Sterling Logistics LLC</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Audience Tags</span>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold">
                          B2B Enterprise
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 text-[10px] font-semibold">
                          Priority Support
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold">
                          Warehouse 4
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Webhook Ingestion View */}
              {activeTab === "webhook" && (
                <div className="p-4 space-y-2 flex-1 font-mono text-[11px]">
                  <div className="p-3 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 space-y-1.5 overflow-hidden">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-1">
                      <span>POST /api/webhook (Meta Cloud API)</span>
                      <span className="text-emerald-400">200 OK · 18ms</span>
                    </div>
                    <pre className="text-[10px] text-indigo-300 leading-relaxed overflow-x-auto">
{`{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "3356483501181888",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "contacts": [{"wa_id": "14155550192"}],
        "messages": [{"from": "14155550192", "text": "Batch #WF-92"}]
      },
      "field": "messages"
    }]
  }]
}`}
                    </pre>
                  </div>
                </div>
              )}

              {/* Message Composer Bar */}
              <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#090e18]/70 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value="Reply using Cloud API v24.0 or send pre-approved HSM template..."
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-400 focus:outline-hidden"
                />
                <button
                  type="button"
                  className="px-3 py-2 rounded-xl bg-indigo-600 text-white font-semibold flex items-center gap-1 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* FLOATING CARD 1: Dual Coexistence Badge (Z: 60px) */}
        <div
          className="absolute -top-5 -left-4 sm:-top-8 sm:-left-8 p-3.5 rounded-2xl bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border border-emerald-500/30 shadow-xl shadow-emerald-950/20 flex items-center gap-3 transition-transform duration-300 hidden sm:flex"
          style={{
            transform: reducedMotion ? "none" : "translateZ(60px)",
          }}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xs text-slate-900 dark:text-white">Dual Coexistence</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              WhatsApp Business App + Cloud API active together
            </p>
          </div>
        </div>

        {/* FLOATING CARD 2: Meta Cloud API v24.0 Verified Pill (Z: 85px) */}
        <div
          className="absolute -bottom-6 -right-4 sm:-bottom-8 sm:-right-6 p-4 rounded-2xl bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border border-indigo-500/30 shadow-xl shadow-indigo-950/25 flex items-center gap-3.5 transition-transform duration-300"
          style={{
            transform: reducedMotion ? "none" : "translateZ(85px)",
          }}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Zap className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs text-slate-900 dark:text-white">Graph API v24.0</span>
              <span className="text-[9px] font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded">
                Config 2934849833375100
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Embedded Signup v4 · Session Info Version 3
            </p>
          </div>
        </div>

        {/* FLOATING CARD 3: Delivery Rate Badge (Z: 45px) */}
        <div
          className="absolute top-1/2 -right-4 sm:-right-10 -translate-y-1/2 p-3 rounded-xl bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-lg text-left hidden md:block"
          style={{
            transform: reducedMotion ? "none" : "translateZ(45px)",
          }}
        >
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
            <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Database Metrics</span>
          </div>
          <div className="font-black font-mono text-base text-slate-900 dark:text-white">
            100% Delivery Sync
          </div>
          <div className="text-[9px] text-slate-400">
            Real webhook tick callbacks
          </div>
        </div>
      </div>
    </div>
  );
}
