"use client";

import Link from "next/link";
import { ArrowRight, Check, Play, Zap } from "lucide-react";

export default function BottomCTASection({
  onOpenDemo,
}: {
  onOpenDemo?: () => void;
}) {
  return (
    <section className="py-20 sm:py-28 bg-[#f5f3ff] dark:bg-[#090d18] relative overflow-hidden border-t border-slate-200/80 dark:border-slate-800/80">
      {/* Ambient Lilac & Violet Blur Elements */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-purple-300/30 dark:bg-purple-900/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-4 right-1/4 w-80 h-80 bg-indigo-300/20 dark:bg-indigo-900/15 rounded-full blur-3xl pointer-events-none" />

      {/* Decorative Bottom Left Glass Sphere */}
      <div className="absolute -bottom-8 left-8 sm:left-16 w-24 h-24 rounded-full bg-gradient-to-tr from-violet-600/30 to-indigo-400/20 backdrop-blur-md border border-white/40 shadow-xl hidden md:flex items-center justify-center pointer-events-none">
        <Zap className="w-8 h-8 text-violet-600 dark:text-violet-400 opacity-60" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
        {/* Top Pill Kicker */}
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-700 dark:text-violet-400 bg-violet-100 dark:bg-violet-950/80 px-4 py-1.5 rounded-full shadow-xs">
          <span>GET STARTED TODAY</span>
        </div>

        {/* Headline */}
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 dark:text-white tracking-tight leading-[1.12]">
          Ready to <span className="text-violet-600 dark:text-violet-400">grow your business</span> with WhatsApp?
        </h2>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
          Join thousands of businesses already using Wafilow.
        </p>

        {/* CTA Buttons Row */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-violet-600/30 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <button
            type="button"
            onClick={onOpenDemo}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-sm shadow-xs transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current text-slate-700 dark:text-slate-300" />
            <span>Watch Demo</span>
          </button>
        </div>

        {/* Checkmarks Row */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
              <Check className="w-3 h-3 stroke-[3]" />
            </span>
            <span>No credit card required</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
              <Check className="w-3 h-3 stroke-[3]" />
            </span>
            <span>Quick setup</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
              <Check className="w-3 h-3 stroke-[3]" />
            </span>
            <span>Full features included</span>
          </div>
        </div>
      </div>
    </section>
  );
}
