"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Menu,
  X,
  ChevronDown,
  MessageSquare,
  Smartphone,
  FileText,
  Users,
} from "lucide-react";

export default function PublicHeader({
  onOpenDemo,
}: {
  onOpenDemo?: () => void;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  return (
    <header className="border-b border-slate-800/80 bg-[#070a13]/95 backdrop-blur-md sticky top-0 z-50 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-extrabold text-lg shadow-sm shadow-indigo-600/30 group-hover:scale-105 transition-transform">
            W
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white">
            Wafilow
          </span>
        </Link>

        {/* Center Desktop Navigation Links with Dropdowns */}
        <nav className="hidden lg:flex items-center gap-8 text-[13px] font-medium text-slate-300">
          {/* Product Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setActiveDropdown("product")}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button
              type="button"
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer py-2"
            >
              <span>Product</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  activeDropdown === "product" ? "rotate-180" : ""
                }`}
              />
            </button>

            {activeDropdown === "product" && (
              <div className="absolute top-full left-0 w-72 p-2 bg-[#0c1220] border border-slate-800 rounded-2xl shadow-2xl space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <Link
                  href="/inbox"
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/70 transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Live Shared Inbox</div>
                    <div className="text-[11px] text-slate-400">Manage all chats in one place</div>
                  </div>
                </Link>
                <Link
                  href="/settings"
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/70 transition-colors"
                >
                  <Smartphone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Coexistence Bridge</div>
                    <div className="text-[11px] text-slate-400">Use mobile app and Cloud API together</div>
                  </div>
                </Link>
                <Link
                  href="/templates"
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/70 transition-colors"
                >
                  <FileText className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">HSM Templates</div>
                    <div className="text-[11px] text-slate-400">Meta-approved notification templates</div>
                  </div>
                </Link>
                <Link
                  href="/contacts"
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/70 transition-colors"
                >
                  <Users className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Contacts CRM</div>
                    <div className="text-[11px] text-slate-400">Organize and segment audience</div>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* Solutions Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setActiveDropdown("solutions")}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button
              type="button"
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer py-2"
            >
              <span>Solutions</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  activeDropdown === "solutions" ? "rotate-180" : ""
                }`}
              />
            </button>

            {activeDropdown === "solutions" && (
              <div className="absolute top-full left-0 w-64 p-2 bg-[#0c1220] border border-slate-800 rounded-2xl shadow-2xl space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <Link
                  href="#features"
                  className="block p-2.5 rounded-xl hover:bg-slate-800/70 transition-colors"
                >
                  <div className="text-xs font-bold text-white">E-Commerce & D2C</div>
                  <div className="text-[11px] text-slate-400">Automate order updates & abandoned carts</div>
                </Link>
                <Link
                  href="#features"
                  className="block p-2.5 rounded-xl hover:bg-slate-800/70 transition-colors"
                >
                  <div className="text-xs font-bold text-white">Customer Support Teams</div>
                  <div className="text-[11px] text-slate-400">Handle 1,000+ customer inquiries</div>
                </Link>
                <Link
                  href="#features"
                  className="block p-2.5 rounded-xl hover:bg-slate-800/70 transition-colors"
                >
                  <div className="text-xs font-bold text-white">Marketing Agencies</div>
                  <div className="text-[11px] text-slate-400">Targeted WhatsApp broadcasts</div>
                </Link>
              </div>
            )}
          </div>

          <Link href="#integrations" className="hover:text-white transition-colors">
            Integrations
          </Link>
          <Link href="#pricing" className="hover:text-white transition-colors">
            Pricing
          </Link>

          {/* Resources Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setActiveDropdown("resources")}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button
              type="button"
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer py-2"
            >
              <span>Resources</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  activeDropdown === "resources" ? "rotate-180" : ""
                }`}
              />
            </button>

            {activeDropdown === "resources" && (
              <div className="absolute top-full left-0 w-64 p-2 bg-[#0c1220] border border-slate-800 rounded-2xl shadow-2xl space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setActiveDropdown(null);
                    onOpenDemo?.();
                  }}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/70 transition-colors"
                >
                  <div className="text-xs font-bold text-white">Watch Platform Demo</div>
                  <div className="text-[11px] text-slate-400">Interactive video walkthrough</div>
                </button>
                <Link
                  href="/privacy-policy"
                  className="block p-2.5 rounded-xl hover:bg-slate-800/70 transition-colors"
                >
                  <div className="text-xs font-bold text-white">Meta Compliance & Privacy</div>
                  <div className="text-[11px] text-slate-400">Official Graph API policies</div>
                </Link>
                <Link
                  href="/data-deletion"
                  className="block p-2.5 rounded-xl hover:bg-slate-800/70 transition-colors"
                >
                  <div className="text-xs font-bold text-white">Data Deletion Callback</div>
                  <div className="text-[11px] text-slate-400">Meta platform compliance endpoint</div>
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* Action CTAs */}
        <div className="hidden sm:flex items-center gap-4">
          <Link
            href="/login"
            className="text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-violet-600/30 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex lg:hidden items-center gap-2">
          <Link
            href="/login"
            className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
          >
            Login
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-[#090d18] px-5 py-6 space-y-4 shadow-2xl animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-3 text-sm font-semibold text-slate-300">
            <Link
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-white"
            >
              Why Wafilow
            </Link>
            <Link
              href="/inbox"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-white"
            >
              Shared Inbox
            </Link>
            <Link
              href="#integrations"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-white"
            >
              Integrations (50+)
            </Link>
            <Link
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-white"
            >
              Pricing Plans
            </Link>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenDemo?.();
              }}
              className="text-left py-1.5 text-indigo-400 hover:text-indigo-300"
            >
              ▶ Watch Demo
            </button>
          </nav>

          <div className="pt-4 border-t border-slate-800 flex flex-col gap-2.5">
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 text-xs font-bold text-white"
            >
              Open Dashboard
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
