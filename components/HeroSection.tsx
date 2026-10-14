"use client";

import Link from "next/link";
import {
  ArrowRight,
  Play,
  Check,
  Search,
  Phone,
  Paperclip,
  Smile,
  Send,
  BarChart3,
  Zap,
  Megaphone,
} from "lucide-react";

interface HeroSectionProps {
  onOpenDemo: () => void;
}

export default function HeroSection({ onOpenDemo }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden pt-10 pb-20 sm:pt-16 sm:pb-28 bg-[#070a13] text-white">
      {/* Ambient Radial Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-indigo-600/18 via-violet-600/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Floating 3D WhatsApp Sphere at Top */}
      <div className="absolute top-6 right-1/4 sm:right-1/3 w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 border border-white/30 rotate-12 pointer-events-none hidden sm:flex">
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z"/>
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* ========================================================================= */}
          {/* LEFT COLUMN: Hero Copy & Actions */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 space-y-6 text-left">
            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3.5 py-1.5 rounded-full shadow-xs">
              <svg className="w-3.5 h-3.5 fill-current text-emerald-400" viewBox="0 0 24 24">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2Z"/>
              </svg>
              <span>WhatsApp Business Growth Platform</span>
            </div>

            {/* Dominant Headline Matching Reference Image */}
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.08]">
              Turn WhatsApp Conversations into{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-300">
                Real Business
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl font-normal">
              Wafilow helps you manage chats, automate workflows, send broadcasts, and grow your business on WhatsApp — all in one simple and powerful platform.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-violet-600/30 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                type="button"
                onClick={onOpenDemo}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-semibold text-sm transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current text-slate-300" />
                <span>Watch Demo</span>
              </button>
            </div>

            {/* Trust Checkmarks */}
            <div className="pt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px]">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
                <span>No coding required</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px]">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
                <span>Quick setup</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px]">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
                <span>All-in-one platform</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: 3D Tablet Mockup with Annotation Arrows */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 relative">
            {/* Handwritten Annotation 1: Manage Conversations (Top Left) */}
            <div className="absolute -top-7 -left-4 sm:-top-8 sm:-left-6 hidden sm:flex items-center gap-2 text-slate-300 z-20 pointer-events-none">
              <span className="font-serif italic text-sm tracking-wide text-indigo-300 rotate-[-8deg] font-medium">
                Manage Conversations
              </span>
              <svg className="w-10 h-7 text-indigo-400 rotate-12" viewBox="0 0 50 30" fill="none">
                <path d="M5 25C18 5 35 12 45 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3"/>
                <path d="M40 10L46 15L39 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>

            {/* Handwritten Annotation 2: Automate & Grow (Top Right) */}
            <div className="absolute -top-7 -right-2 sm:-top-8 sm:right-4 hidden sm:flex items-center gap-2 text-slate-300 z-20 pointer-events-none">
              <svg className="w-8 h-7 text-violet-400 -rotate-12" viewBox="0 0 50 30" fill="none">
                <path d="M45 25C32 5 15 12 5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3"/>
                <path d="M10 10L4 15L11 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span className="font-serif italic text-sm tracking-wide text-violet-300 rotate-[6deg] font-medium">
                Automate & Grow
              </span>
            </div>

            {/* Handwritten Annotation 3: Analytics to aid growth (Bottom Left) */}
            <div className="absolute -bottom-8 -left-4 sm:-bottom-9 sm:left-4 hidden sm:flex items-center gap-2 text-slate-300 z-20 pointer-events-none">
              <span className="font-serif italic text-sm tracking-wide text-indigo-300 rotate-[6deg] font-medium">
                Analytics to aid growth
              </span>
              <svg className="w-10 h-7 text-indigo-400 -rotate-45" viewBox="0 0 50 30" fill="none">
                <path d="M5 15C18 10 32 18 45 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3"/>
                <path d="M38 6L45 10L40 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>

            {/* Floating Top Right Card: +72% More Sales */}
            <div className="absolute -top-5 right-6 sm:-top-6 sm:right-10 z-30 p-3 sm:p-3.5 rounded-2xl bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-md border border-indigo-500/30 shadow-xl shadow-indigo-950/30 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500 text-white flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                  +72%
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                  More Sales
                </div>
              </div>
            </div>

            {/* Main Angled 3D Tablet Window */}
            <div className="relative rounded-3xl bg-[#0b101d] border-2 border-slate-700/80 shadow-2xl shadow-indigo-950/40 p-3 sm:p-4 text-xs select-none">
              <div className="rounded-2xl bg-[#0e1628] border border-slate-800 overflow-hidden">
                {/* Tablet Screen Top Bar */}
                <div className="px-4 py-3 bg-[#080d18] border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xs flex items-center justify-center">
                      W
                    </div>
                    <span className="font-extrabold text-sm text-white">Wafilow</span>
                  </div>

                  {/* Tablet Search Bar */}
                  <div className="relative flex-1 max-w-[220px] mx-4">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      readOnly
                      placeholder="Search conversations..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-7 pr-2 py-1 text-[11px] text-slate-300 placeholder:text-slate-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Filter Tabs */}
                  <div className="hidden sm:flex items-center gap-1 text-[10px] font-semibold">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white">All 120</span>
                    <span className="px-2 py-0.5 rounded-md text-slate-400 hover:text-white">Unread 3</span>
                    <span className="px-2 py-0.5 rounded-md text-slate-400">Assigned</span>
                    <span className="px-2 py-0.5 rounded-md text-slate-400">VIP</span>
                  </div>
                </div>

                {/* Tablet Screen Body (Grid) */}
                <div className="grid grid-cols-12 min-h-[380px]">
                  {/* Left Column (Conversations List) */}
                  <div className="col-span-5 border-r border-slate-800 bg-[#090e1a] p-2 space-y-1.5">
                    {/* Conversation Row 1 (Active) */}
                    <div className="p-2 rounded-xl bg-violet-600/15 border border-violet-500/40 space-y-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 text-white font-bold text-[10px] flex items-center justify-center">
                            RS
                          </div>
                          <span className="font-bold text-xs text-white">Ritika Sharma</span>
                        </div>
                        <span className="text-[9px] text-slate-400">2 min ago</span>
                      </div>
                      <p className="text-[11px] text-slate-300 truncate">
                        Hi, I want to know pricing details...
                      </p>
                      <div className="flex justify-end">
                        <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                          2
                        </span>
                      </div>
                    </div>

                    {/* Conversation Row 2 */}
                    <div className="p-2 rounded-xl hover:bg-slate-900/60 transition-colors space-y-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                            AV
                          </div>
                          <span className="font-semibold text-xs text-slate-200">Aman Verma</span>
                        </div>
                        <span className="text-[9px] text-slate-500">12 min ago</span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        Can you share more details?
                      </p>
                    </div>

                    {/* Conversation Row 3 */}
                    <div className="p-2 rounded-xl hover:bg-slate-900/60 transition-colors space-y-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center">
                            PS
                          </div>
                          <span className="font-semibold text-xs text-slate-200">Priya Singh</span>
                        </div>
                        <span className="text-[9px] text-slate-500">1 hour ago</span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        Thank you! It worked 🙌
                      </p>
                    </div>

                    {/* Floating Side Action Badges matching reference */}
                    <div className="pt-2 border-t border-slate-800 space-y-1.5 hidden sm:block">
                      <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                            <Megaphone className="w-3 h-3" />
                          </div>
                          <span className="text-[10px] font-semibold text-slate-200">Broadcast</span>
                        </div>
                        <span className="text-[9px] text-slate-400">Send at scale</span>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-violet-500/20 text-violet-400 flex items-center justify-center">
                            <Zap className="w-3 h-3" />
                          </div>
                          <span className="text-[10px] font-semibold text-slate-200">Automation</span>
                        </div>
                        <span className="text-[9px] text-slate-400">Save time</span>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center">
                            <BarChart3 className="w-3 h-3" />
                          </div>
                          <span className="text-[10px] font-semibold text-slate-200">Analytics</span>
                        </div>
                        <span className="text-[9px] text-slate-400">Track growth</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column (Active Chat Feed) */}
                  <div className="col-span-7 flex flex-col justify-between bg-[#0e1628] p-3">
                    {/* Chat Header */}
                    <div className="pb-2 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 text-white font-bold text-xs flex items-center justify-center">
                            RS
                          </div>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -bottom-0.5 -right-0.5 border border-[#0e1628]" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-white block">Ritika Sharma</span>
                          <span className="text-[9px] text-emerald-400">Online</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-slate-400">
                        <Phone className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
                        <Search className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
                      </div>
                    </div>

                    {/* Messages Area */}
                    <div className="py-3 space-y-2.5 flex-1">
                      {/* Incoming Customer Message */}
                      <div className="flex justify-start">
                        <div className="max-w-[85%] p-2.5 rounded-2xl rounded-tl-xs bg-slate-900 text-slate-200 text-[11px] space-y-1">
                          <p>Hi, I want to know pricing details for your WhatsApp CRM platform.</p>
                          <span className="text-[9px] text-slate-500 block text-right">11:28 AM</span>
                        </div>
                      </div>

                      {/* Outgoing Purple Bubble */}
                      <div className="flex justify-end">
                        <div className="max-w-[85%] p-2.5 rounded-2xl rounded-tr-xs bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[11px] space-y-1">
                          <p>Hi Ritika! 👋 Sure, I&apos;ll be happy to help. Here are our pricing plans.</p>
                          <span className="text-[9px] text-violet-200 block text-right">11:28 AM</span>
                        </div>
                      </div>

                      {/* Interactive Rich Plan Card Inside Chat matching Reference Image */}
                      <div className="flex justify-end">
                        <div className="p-3 rounded-2xl bg-white dark:bg-[#0c1220] border border-violet-500/40 text-slate-900 dark:text-white text-xs space-y-2 max-w-[210px] shadow-lg">
                          <div className="flex items-center gap-2 font-bold text-[11px]">
                            <div className="w-6 h-6 rounded-lg bg-violet-600 text-white flex items-center justify-center text-[10px]">
                              W
                            </div>
                            <span>Wafilow Pricing Plans</span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Choose the best plan for your business needs.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              const el = document.getElementById("pricing");
                              el?.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="w-full text-center py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] hover:bg-indigo-100 transition-colors cursor-pointer"
                          >
                            View Plans
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Composer Bar */}
                    <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value="Type a message..."
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-[11px] text-slate-400 focus:outline-hidden"
                      />
                      <Paperclip className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                      <Smile className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                      <div className="w-6 h-6 rounded-lg bg-violet-600 text-white flex items-center justify-center cursor-pointer">
                        <Send className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
