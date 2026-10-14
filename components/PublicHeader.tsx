"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function PublicHeader() {
  return (
    <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#080c14]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-600 dark:from-indigo-600 dark:to-violet-500 flex items-center justify-center text-white font-extrabold text-lg shadow-sm group-hover:scale-105 transition-transform">
            W
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-slate-950 dark:text-white">
                Wafilow
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                CRM
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">WhatsApp Cloud API</p>
          </div>
        </Link>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <Link href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            Features
          </Link>
          <Link href="#coexistence" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            Coexistence Mode
          </Link>
          <Link href="#templates" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            HSM Templates
          </Link>
          <Link href="#pricing" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            Pricing
          </Link>
          <Link href="/privacy-policy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            Privacy & Meta
          </Link>
        </nav>

        {/* Action CTAs */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:inline-flex px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-slate-950 to-indigo-900 hover:from-slate-900 hover:to-indigo-800 dark:from-indigo-600 dark:to-violet-600 dark:hover:from-indigo-500 dark:hover:to-violet-500 text-white font-semibold text-xs shadow-md shadow-indigo-950/10 transition-all hover:shadow-lg cursor-pointer"
          >
            Open Dashboard
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
