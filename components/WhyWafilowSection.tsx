"use client";

import Image from "next/image";
import Link from "next/link";
import {
  MessageSquare,
  Zap,
  Megaphone,
  Monitor,
  Users,
  BarChart3,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

export default function WhyWafilowSection() {
  return (
    <section id="features" className="py-20 sm:py-28 bg-[#f8fafc] dark:bg-[#080d18] border-b border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* ========================================================================= */}
          {/* LEFT COLUMN: Entrepreneur Image with Floating Notification Chips */}
          {/* ========================================================================= */}
          <div className="lg:col-span-6 relative">
            {/* Ambient Background Radial Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/15 via-indigo-500/10 to-transparent blur-3xl pointer-events-none" />

            {/* Container for Image & Floating Chips */}
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              {/* Main Visual: Entrepreneur with Smartphone */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200/90 dark:border-slate-800/80 aspect-[4/3] sm:aspect-square bg-gradient-to-tr from-slate-200 via-slate-100 to-indigo-100 dark:from-slate-900 dark:to-indigo-950">
                <Image
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80"
                  alt="Entrepreneur growing business on WhatsApp with Wafilow"
                  fill
                  className="object-cover object-center"
                  referrerPolicy="no-referrer"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />

                {/* Subtle Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Floating Chip 1: New Order (Top Left) */}
              <div className="absolute -top-4 -left-3 sm:-top-6 sm:-left-6 p-3 sm:p-3.5 rounded-2xl bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-md border border-emerald-500/30 shadow-xl shadow-slate-900/10 flex items-center gap-3 animate-in fade-in zoom-in duration-300">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/30">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    New Order
                  </span>
                  <div className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                    ₹2,499
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold block">
                    via WhatsApp
                  </span>
                </div>
              </div>

              {/* Floating Chip 2: Order Confirmed (Mid Left) */}
              <div className="absolute top-1/3 -left-4 sm:-left-8 p-2.5 sm:p-3 rounded-2xl bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-900/10 flex items-center gap-2.5 max-w-[210px] hidden sm:flex">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  S
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                    <span>Order Confirmed</span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">
                    Your order has been confirmed! 🎉
                  </p>
                </div>
              </div>

              {/* Floating Chip 3: Payment Received (Bottom Left) */}
              <div className="absolute -bottom-4 -left-3 sm:-bottom-5 sm:-left-5 p-2.5 sm:p-3 rounded-2xl bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-900/10 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  A
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Payment Received</span>
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white">₹2,499</span>
                </div>
              </div>

              {/* Floating Chip 4: Payment Received 2 (Mid Right) */}
              <div className="absolute top-1/4 -right-3 sm:-right-6 p-2.5 sm:p-3 rounded-2xl bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-900/10 flex items-center gap-2.5 hidden sm:flex">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  R
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Payment Received</span>
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white">₹2,499</span>
                </div>
              </div>

              {/* Floating Chip 5: Automated Message Metric (Bottom Right) */}
              <div className="absolute -bottom-5 -right-3 sm:-bottom-7 sm:-right-6 p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-md border border-indigo-500/30 shadow-xl shadow-indigo-950/20 flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Automated Message
                  </span>
                  <span className="text-[11px] text-slate-500 block">Sent Successfully</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white font-mono">
                      12,842
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1 py-0.2 rounded flex items-center gap-0.5">
                      <TrendingUp className="w-2.5 h-2.5" />
                      +18%
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating 3D WhatsApp Orb */}
              <div className="absolute -top-4 right-10 w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 border border-white/40">
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: Feature Grid Matching Reference Image */}
          {/* ========================================================================= */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              {/* Section Kicker */}
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/60 px-3.5 py-1 rounded-full mb-3">
                <Zap className="w-3.5 h-3.5" />
                <span>WHY WAFILOW</span>
              </div>

              {/* Main Headline */}
              <h2 className="text-3xl sm:text-5xl font-black text-slate-950 dark:text-white tracking-tight leading-[1.15]">
                Everything you need to <span className="text-violet-600 dark:text-violet-400">grow on WhatsApp</span>
              </h2>

              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
                Powerful tools to attract, engage, and convert customers — without technical complexity.
              </p>
            </div>

            {/* 6 Feature Cards (2 cols x 3 rows) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Card 1: Shared Inbox */}
              <Link
                href="/inbox"
                className="p-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/50 transition-all shadow-xs group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Shared Inbox</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Manage all chats in one place
                </p>
              </Link>

              {/* Card 2: Automation */}
              <Link
                href="/automations"
                className="p-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-slate-800 hover:border-violet-500/50 transition-all shadow-xs group"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Automation</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Turn conversations into workflows
                </p>
              </Link>

              {/* Card 3: Broadcasts */}
              <Link
                href="/campaigns"
                className="p-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/50 transition-all shadow-xs group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Megaphone className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Broadcasts</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Send messages at scale
                </p>
              </Link>

              {/* Card 4: Templates */}
              <Link
                href="/templates"
                className="p-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-slate-800 hover:border-violet-500/50 transition-all shadow-xs group"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Monitor className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Templates</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Use approved WhatsApp templates
                </p>
              </Link>

              {/* Card 5: Contacts CRM */}
              <Link
                href="/contacts"
                className="p-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/50 transition-all shadow-xs group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Contacts CRM</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Organize and segment customers
                </p>
              </Link>

              {/* Card 6: Analytics */}
              <Link
                href="/analytics"
                className="p-4 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-slate-800 hover:border-purple-500/50 transition-all shadow-xs group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Analytics</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Track your growth and performance
                </p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
