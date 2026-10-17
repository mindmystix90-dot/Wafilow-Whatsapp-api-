"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  MessageSquare,
  Users,
  FileText,
  Megaphone,
  Settings,
  BarChart3,
  Bot,
  UserCheck,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Layers,
  User,
} from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  hideMobileBottomNav?: boolean;
  noMainPadding?: boolean;
  hideMobileHeader?: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: typeof BarChart3;
  section: "core" | "engagement" | "system";
  badge?: string;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3, section: "core" },
  { href: "/inbox", label: "Live Inbox", icon: MessageSquare, section: "core" },
  { href: "/contacts", label: "Contacts", icon: Users, section: "core" },
  { href: "/templates", label: "Templates", icon: FileText, section: "core" },
  { href: "/campaigns", label: "Broadcasts", icon: Megaphone, section: "engagement" },
  { href: "/automations", label: "Automations", icon: Bot, section: "engagement" },
  { href: "/integrations", label: "Integrations", icon: Layers, section: "engagement" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, section: "engagement" },
  { href: "/team", label: "Team", icon: UserCheck, section: "system" },
  { href: "/settings", label: "Settings", icon: Settings, section: "system" },
  { href: "/profile", label: "Profile", icon: User, section: "system" },
];

export default function AppLayout({
  children,
  title,
  subtitle,
  action,
  hideMobileBottomNav = false,
  noMainPadding = false,
  hideMobileHeader = false,
}: AppLayoutProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function checkStatus() {
      try {
        const res = await fetch("/api/whatsapp/config");
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setIsConfigured(Boolean(data.configured));
          }
        }
      } catch {
        // Soft fail
      }
    }
    checkStatus();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-[#070b12] text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row antialiased">
      {/* Mobile Top Header */}
      {!hideMobileHeader && (
        <div className="lg:hidden sticky top-0 z-40 bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 h-15 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-900 to-indigo-700 dark:from-indigo-600 dark:to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              W
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">
                Wafilow
              </span>
              <span className="text-[10px] text-slate-500 font-medium">WhatsApp CRM</span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConfigured ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              <span className="text-slate-600 dark:text-slate-300">
                {isConfigured ? "Connected" : "Setup Required"}
              </span>
            </Link>

            <Link
              href="/profile"
              title="User Profile"
              className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-tr from-slate-900 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700"
            >
              {session?.user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt={session.user.name || "Profile"}
                  className="w-full h-full object-cover"
                />
              ) : (
                (session?.user?.name || session?.user?.email || "U").charAt(0).toUpperCase()
              )}
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-white dark:bg-[#0c1220] border-t border-slate-200 dark:border-slate-800 rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Menu Navigation
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {session?.user && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 overflow-hidden group min-w-0"
                >
                  <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-tr from-slate-900 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                    {session.user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={session.user.image}
                        alt={session.user.name || "User Avatar"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (session.user.name || session.user.email || "U").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="text-xs text-left min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {session.user.name || session.user.email}
                    </div>
                    <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                      Edit Profile & Photo →
                    </div>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 transition-colors flex items-center gap-1.5 shrink-0 ml-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Desktop Fixed Left Sidebar */}
      <aside className="hidden lg:flex w-64 xl:w-72 flex-col justify-between border-r border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-md sticky top-0 h-screen p-5 shrink-0 z-30">
        <div className="space-y-6">
          {/* Brand Logo & Platform Title */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-600 dark:from-indigo-600 dark:to-violet-500 flex items-center justify-center text-white font-extrabold text-lg shadow-sm group-hover:scale-105 transition-transform">
              W
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-950 dark:text-white">
                  Wafilow
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  CRM
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Meta Cloud API Hub</p>
            </div>
          </Link>

          {/* Connection Status Indicator */}
          <Link
            href="/settings"
            className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all text-xs group"
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConfigured ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-amber-500"
                }`}
              />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {isConfigured ? "Cloud API Active" : "Meta Setup Required"}
              </span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 block mb-1.5">
                Core Workspace
              </span>
              <div className="space-y-1">
                {navItems
                  .filter((item) => item.section === "core")
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              isActive
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 block mb-1.5">
                Engagement & Performance
              </span>
              <div className="space-y-1">
                {navItems
                  .filter((item) => item.section === "engagement")
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              isActive
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 block mb-1.5">
                System & Configuration
              </span>
              <div className="space-y-1">
                {navItems
                  .filter((item) => item.section === "system")
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              isActive
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
              </div>
            </div>
          </nav>
        </div>

        {/* User Profile Card at bottom of sidebar */}
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 group">
            <Link
              href="/profile"
              className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0"
              title="View and edit profile"
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-tr from-slate-900 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                {session?.user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User Avatar"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (session?.user?.name || session?.user?.email || "U").charAt(0).toUpperCase()
                )}
              </div>
              <div className="overflow-hidden min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {session?.user?.name || session?.user?.email?.split("@")[0] || "User"}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  Edit Profile & Photo
                </div>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 ml-1.5"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        {/* Top Header Bar */}
        <header
          className={`${
            hideMobileHeader ? "hidden lg:block" : "block"
          } border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-[#0c1220]/70 backdrop-blur-md px-4 sm:px-8 py-5`}
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <span>Wafilow CRM</span>
                <span>/</span>
                <span className="text-slate-600 dark:text-slate-300 font-medium">{title}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                  {subtitle}
                </p>
              )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        </header>

        {/* Page Content */}
        <main
          className={`flex-1 ${
            noMainPadding ? "p-0 sm:px-8 sm:py-6" : "px-4 sm:px-8 py-6"
          } max-w-7xl mx-auto w-full flex flex-col min-h-0`}
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Quick Navigation Bar */}
      {!hideMobileBottomNav && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 px-2 py-1.5 flex items-center justify-around">
          {[
            { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
            { href: "/inbox", label: "Inbox", icon: MessageSquare },
            { href: "/contacts", label: "Contacts", icon: Users },
            { href: "/settings", label: "Settings", icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-semibold transition-colors ${
                  isActive
                    ? "text-[#5938F5] dark:text-indigo-400"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
