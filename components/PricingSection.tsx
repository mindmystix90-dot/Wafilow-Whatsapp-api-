"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight, Zap, Crown } from "lucide-react";

export default function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const pricing = {
    starter: billingCycle === "monthly" ? "₹499" : "₹399",
    pro: billingCycle === "monthly" ? "₹999" : "₹799",
    lifetime: "₹4,999",
  };

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-[#080b15] text-white relative overflow-hidden border-b border-slate-800">
      {/* Ambient Radial Background Glow */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[700px] h-[450px] bg-gradient-to-tr from-violet-600/15 via-indigo-600/10 to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* ========================================================================= */}
          {/* Left Column: Heading & Billing Toggle */}
          {/* ========================================================================= */}
          <div className="lg:col-span-4 space-y-6">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-400 bg-violet-950/70 border border-violet-800/60 px-3.5 py-1 rounded-full">
              <Zap className="w-3.5 h-3.5" />
              <span>PRICING</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.12]">
              Simple, transparent <span className="text-violet-400">pricing</span>
            </h2>

            <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-sm">
              Choose a plan that fits your business needs. No hidden charges.
            </p>

            {/* Billing Toggle Group (Monthly / Yearly / Save 20%) */}
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === "monthly"
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  billingCycle === "yearly"
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>Yearly</span>
                <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* Right Column: 3 Pricing Cards */}
          {/* ========================================================================= */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-5 relative">
            {/* Card 1: Starter */}
            <div className="p-6 rounded-2xl bg-[#0c1220]/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg text-white">Starter</h3>
                  <p className="text-xs text-slate-400 mt-0.5">For small businesses</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white">
                    {pricing.starter}
                  </span>
                  <span className="text-xs text-slate-400">/month</span>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-300 pt-3 border-t border-slate-800">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>1 WhatsApp number</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Shared Inbox</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Basic automation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Standard support</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/signup"
                className="w-full text-center py-2.5 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Card 2: Pro (Most Popular) */}
            <div className="p-6 rounded-2xl bg-[#0e1628] border-2 border-violet-500 shadow-2xl shadow-violet-950/40 relative flex flex-col justify-between space-y-6">
              {/* Most Popular Badge */}
              <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                Most Popular
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg text-white">Pro</h3>
                  <p className="text-xs text-slate-400 mt-0.5">For growing teams</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white">
                    {pricing.pro}
                  </span>
                  <span className="text-xs text-slate-400">/month</span>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-200 pt-3 border-t border-slate-800">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>3 WhatsApp numbers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Advanced automation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Broadcasts & templates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Integrations (50+)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Priority support</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/signup"
                className="w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-violet-600/30 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Card 3: Lifetime */}
            <div className="p-6 rounded-2xl bg-[#0c1220]/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg text-white">Lifetime</h3>
                  <p className="text-xs text-slate-400 mt-0.5">One-time payment</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white">
                    {pricing.lifetime}
                  </span>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-300 pt-3 border-t border-slate-800">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>All Pro features</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Lifetime access</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Future updates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Priority support</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/signup"
                className="w-full text-center py-2.5 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5"
              >
                <span>Get Lifetime Access</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Floating 3D Purple Crown on bottom right */}
            <div className="absolute -bottom-10 -right-6 hidden xl:flex items-center justify-center pointer-events-none opacity-80">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white flex items-center justify-center shadow-2xl shadow-violet-600/50 border border-violet-400/40 rotate-12">
                <Crown className="w-10 h-10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
