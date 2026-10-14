"use client";

import { useState } from "react";
import {
  MessageSquare,
  Send,
  CheckCheck,
  Check,
  Smartphone,
  Sparkles,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  Zap,
} from "lucide-react";
import Link from "next/link";

interface DemoMessage {
  id: string;
  sender: "customer" | "business";
  text: string;
  time: string;
  status?: "sent" | "delivered" | "read";
  echo?: boolean;
}

export default function InteractiveProductDemo() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [customReply, setCustomReply] = useState("");
  const [messages, setMessages] = useState<DemoMessage[]>([
    {
      id: "m-1",
      sender: "customer",
      text: "Hi there! We want to confirm our appointment for tomorrow at 2:00 PM. Can you share the location pin?",
      time: "10:14 AM",
    },
  ]);
  const [isSending, setIsSending] = useState(false);

  const simulateCustomerMessage = () => {
    const newMsg: DemoMessage = {
      id: `m-${Date.now()}`,
      sender: "customer",
      text: "Also, do you accept mobile payments or invoice billing on delivery?",
      time: "10:16 AM",
    };
    setMessages((prev) => [...prev, newMsg]);
    setCurrentStep(2);
  };

  const handleSendReply = (textToSend?: string) => {
    const text = textToSend || customReply || "Hi! Yes, appointment confirmed at 2:00 PM. We accept both instant card payments and Net-30 invoice billing.";
    if (!text.trim()) return;

    setIsSending(true);
    const newId = `msg-${Date.now()}`;

    // Step 1: Sent (single check)
    const newMsg: DemoMessage = {
      id: newId,
      sender: "business",
      text: text.trim(),
      time: "10:17 AM",
      status: "sent",
    };

    setMessages((prev) => [...prev, newMsg]);
    setCustomReply("");
    setCurrentStep(4);

    // Simulate real webhook status tick progression
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === newId ? { ...m, status: "delivered" } : m))
      );
    }, 1200);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === newId ? { ...m, status: "read", echo: true } : m))
      );
      setIsSending(false);
    }, 2400);
  };

  const resetDemo = () => {
    setCurrentStep(1);
    setCustomReply("");
    setMessages([
      {
        id: "m-1",
        sender: "customer",
        text: "Hi there! We want to confirm our appointment for tomorrow at 2:00 PM. Can you share the location pin?",
        time: "10:14 AM",
      },
    ]);
  };

  return (
    <section id="demo" className="py-20 sm:py-28 border-t border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-b from-slate-50/50 via-white to-slate-50/70 dark:from-[#070b12] dark:via-[#090d16] dark:to-[#0c1220]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/60 px-3.5 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Interactive Walkthrough Demo · Simulated Live Experience</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            See How Customer Messaging Flows Through Wafilow
          </h2>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Test the live 4-step workflow: receive inbound inquiries, inspect contact consent, respond with templates or freeform text, and verify real-time read ticks and mobile coexistence echoes.
          </p>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
            * This sandbox is an interactive simulated walkthrough. No live messages are sent to external devices from this demo box.
          </p>
        </div>

        {/* Step Progression Bar */}
        <div className="max-w-4xl mx-auto mb-8 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs font-semibold">
          {[
            { num: 1, title: "1. Inbound Message", desc: "Customer reaches out" },
            { num: 2, title: "2. Contact Consent", desc: "Verify 24h care window" },
            { num: 3, title: "3. Send Reply", desc: "Freeform or HSM Template" },
            { num: 4, title: "4. Status & Echo", desc: "Delivery ticks & Mobile sync" },
          ].map((step) => (
            <button
              key={step.num}
              type="button"
              onClick={() => setCurrentStep(step.num)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                currentStep === step.num
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                  : currentStep > step.num
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>{step.title}</span>
                {currentStep > step.num && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
              </div>
              <p className={`text-[11px] mt-0.5 ${currentStep === step.num ? "text-indigo-100" : "text-slate-400"}`}>
                {step.desc}
              </p>
            </button>
          ))}
        </div>

        {/* Interactive Walkthrough Sandbox Container */}
        <div className="max-w-5xl mx-auto bg-white dark:bg-[#0c1220] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
          {/* Left Panel: Contact Profile & Context (4 cols) */}
          <div className="lg:col-span-4 p-5 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#090e18]/60 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer Dossier</span>
              <button
                type="button"
                onClick={resetDemo}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                title="Reset demo to step 1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset Demo</span>
              </button>
            </div>

            {/* Profile Summary */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-sm flex items-center justify-center">
                  CW
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Clara Winters</h4>
                  <p className="text-xs text-slate-400 font-mono">+1 (555) 234-5678</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Consent State</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Opt-In Recorded
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Service Window</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                    23h 48m left
                  </span>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Audience Segments</span>
                <div className="flex flex-wrap gap-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    VIP Client
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
                    Appointment Q4
                  </span>
                </div>
              </div>
            </div>

            {/* Simulated Trigger Actions */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Interactive Triggers
              </span>

              <button
                type="button"
                onClick={simulateCustomerMessage}
                className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500/60 transition-all text-xs space-y-1 cursor-pointer"
              >
                <div className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Simulate Follow-Up Inbound</span>
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <p className="text-[11px] text-slate-400">
                  Injects an incoming message via simulated Meta Webhook.
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSendReply("Hello Clara! Your location pin is 450 Mission St, Suite 800. Looking forward to meeting you tomorrow.")
                }
                className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500/60 transition-all text-xs space-y-1 cursor-pointer"
              >
                <div className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Send HSM Template: appointment_confirmation</span>
                  <Zap className="w-3.5 h-3.5 text-violet-600" />
                </div>
                <p className="text-[11px] text-slate-400">
                  Dispatches pre-approved Meta HSM template with dynamic parameters.
                </p>
              </button>
            </div>
          </div>

          {/* Right Panel: Interactive Message Thread & Composer (8 cols) */}
          <div className="lg:col-span-8 flex flex-col justify-between bg-white dark:bg-[#0c1220]">
            {/* Thread Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/40 dark:bg-[#080d16]/40">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Live Conversation Feed</h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Cloud API v24.0 · Connected to WABA 3356483501181888
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <Smartphone className="w-3 h-3" />
                  <span>Coexistence Sync Active</span>
                </span>
              </div>
            </div>

            {/* Messages Display */}
            <div className="p-5 space-y-4 flex-1 overflow-y-auto max-h-[360px]">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "business" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs space-y-1.5 shadow-xs ${
                      msg.sender === "business"
                        ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-tr-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs"
                    }`}
                  >
                    <p className="leading-relaxed">{msg.text}</p>
                    <div
                      className={`flex items-center justify-end gap-1.5 text-[10px] font-mono ${
                        msg.sender === "business" ? "text-indigo-200" : "text-slate-400"
                      }`}
                    >
                      <span>{msg.time}</span>
                      {msg.sender === "business" && (
                        <>
                          {msg.status === "sent" && <Check className="w-3.5 h-3.5 text-indigo-300" />}
                          {msg.status === "delivered" && (
                            <CheckCheck className="w-3.5 h-3.5 text-slate-300" />
                          )}
                          {msg.status === "read" && (
                            <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                          )}
                          <span className="capitalize">{msg.status}</span>
                        </>
                      )}
                    </div>

                    {msg.echo && (
                      <div className="pt-1.5 border-t border-indigo-500/40 text-[10px] text-indigo-100 flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-emerald-300" />
                        <span>Synced to Agent WhatsApp Business App (Echo Verified)</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex justify-end">
                  <div className="p-3 rounded-2xl rounded-tr-xs bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Transmitting to Meta Cloud API v24.0...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Composer Box */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#080d16]/70 space-y-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendReply();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={customReply}
                  onChange={(e) => setCustomReply(e.target.value)}
                  placeholder="Type a simulated response or pick a trigger above..."
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={isSending}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>24-Hour Customer Care Window active · Freeform replies allowed</span>
                </span>
                <Link
                  href="/dashboard"
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1"
                >
                  <span>Open Full Production Inbox</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
