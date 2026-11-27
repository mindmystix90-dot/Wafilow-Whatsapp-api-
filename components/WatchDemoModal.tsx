"use client";

import { useState } from "react";
import Link from "next/link";
import {
  X,
  Play,
  MessageSquare,
  Smartphone,
  FileText,
  Zap,
  CheckCircle2,
  ArrowRight,
  CheckCheck,
} from "lucide-react";

interface WatchDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WatchDemoModal({ isOpen, onClose }: WatchDemoModalProps) {
  const [activeTab, setActiveTab] = useState<"inbox" | "coexistence" | "templates" | "automation">("inbox");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0c1220] border border-slate-800 text-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-sm">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white">
                Wafilow Platform Interactive Walkthrough
              </h3>
              <p className="text-xs text-slate-400">
                Meta WhatsApp Cloud API Enterprise CRM Tour
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close demo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feature Selector Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800/80 pb-3">
          {[
            { id: "inbox", label: "Shared Live Inbox", icon: MessageSquare },
            { id: "coexistence", label: "Dual Coexistence Bridge", icon: Smartphone },
            { id: "templates", label: "HSM Templates", icon: FileText },
            { id: "automation", label: "Workflows & Webhooks", icon: Zap },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                    : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Preview Canvas */}
        <div className="bg-[#080d18] rounded-2xl border border-slate-800 p-5 space-y-4">
          {activeTab === "inbox" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 pb-2 border-b border-slate-800">
                <span>Unified Customer Thread & Webhook Ingestion</span>
                <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 24h Care Window Active
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200">
                  <span className="text-[10px] text-slate-400 block font-mono">Customer · 10:40 AM</span>
                  <p className="mt-1">&ldquo;Hi! We want to confirm our appointment for tomorrow at 2:00 PM.&rdquo;</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white ml-8">
                  <span className="text-[10px] text-violet-200 block font-mono flex items-center justify-between">
                    <span>Agent Reply via WhatsApp Cloud API</span>
                    <span className="flex items-center gap-1 text-cyan-300">
                      <CheckCheck className="w-3.5 h-3.5" /> Read
                    </span>
                  </span>
                  <p className="mt-1">&ldquo;Appointment confirmed! Looking forward to meeting you at Suite 800.&rdquo;</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "coexistence" && (
            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Smartphone className="w-4 h-4" />
                <span>Keep Your Mobile WhatsApp Business App Active</span>
              </div>
              <p className="text-slate-400">
                Embedded Signup connects your existing WhatsApp Business account directly to Wafilow with Business App Coexistence enabled.
              </p>
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/60 text-emerald-300">
                ✓ Chat on your smartphone while automating broadcasts and CRM workflows on Wafilow.
              </div>
            </div>
          )}

          {activeTab === "templates" && (
            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <div className="flex items-center gap-2 text-violet-400 font-bold">
                <FileText className="w-4 h-4" />
                <span>Pre-Approved Highly Structured Message (HSM) Templates</span>
              </div>
              <p className="text-slate-400">
                Reach out to customers beyond the 24-hour service window using pre-approved templates. Test the default <code className="bg-slate-900 px-1.5 py-0.5 rounded text-violet-300 font-mono">hello_world</code> template directly from the Templates screen.
              </p>
            </div>
          )}

          {activeTab === "automation" && (
            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <div className="flex items-center gap-2 text-blue-400 font-bold">
                <Zap className="w-4 h-4" />
                <span>Direct Meta Webhook Dispatcher</span>
              </div>
              <p className="text-slate-400">
                Inbound messages and delivery ticks verify payload HMAC SHA-256 signatures via <code className="bg-slate-900 px-1.5 py-0.5 rounded text-blue-300 font-mono">x-hub-signature-256</code> to ensure 100% cryptographic authenticity.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Link
            href="/inbox"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors text-center"
          >
            Open Live CRM Inbox
          </Link>

          <Link
            href="/signup"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white shadow-md shadow-violet-600/30 transition-all flex items-center justify-center gap-1.5"
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
