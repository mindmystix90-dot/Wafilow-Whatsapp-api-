import Link from "next/link";
import Footer from "@/components/Footer";
import { 
  MessageSquare, 
  Send, 
  Users, 
  FileText, 
  Bot, 
  BarChart3, 
  Settings, 
  Zap,
  Globe,
  ArrowRight
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-sm font-bold text-xl">
              W
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">Wafilow</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                WhatsApp Cloud API
              </span>
            </div>
          </div>
          
          <nav className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors shadow-sm"
            >
              Open Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Hero & Quick Navigation */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium mb-4">
            <Zap className="w-3.5 h-3.5" />
            Meta WhatsApp Business Platform Ready
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            WhatsApp Business API Management Hub
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Manage your customer conversations, automated notification broadcasts, template submissions, and multi-agent customer support in one unified workspace.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/dashboard"
            className="group block p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all shadow-sm hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
              Dashboard
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Overview of sent messages, delivery rates, open rates, active conversations, and Cloud API quotas.
            </p>
          </Link>

          <Link
            href="/inbox"
            className="group block p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all shadow-sm hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
              Live Inbox & Chats
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Two-way messaging with customers, media attachments, quick replies, and ticket assignment.
            </p>
          </Link>

          <Link
            href="/campaigns"
            className="group block p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all shadow-sm hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Send className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-violet-600 transition-colors">
              Broadcast Campaigns
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Schedule and dispatch bulk marketing and transactional template notifications to segmented audiences.
            </p>
          </Link>

          <Link
            href="/templates"
            className="group block p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all shadow-sm hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">
              Message Templates
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage Meta-approved HSM message templates with variables, buttons, and multilingual copies.
            </p>
          </Link>

          <Link
            href="/contacts"
            className="group block p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all shadow-sm hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
              Contacts & Lists
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Audience directory with phone validation, opt-in status, custom attributes, and tags.
            </p>
          </Link>

          <Link
            href="/automations"
            className="group block p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all shadow-sm hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Bot className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-rose-600 transition-colors">
              Automations & Flows
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Welcome greetings, out-of-office autoreplies, keyword autoresponders, and abandoned cart alerts.
            </p>
          </Link>
        </div>

        {/* API Integration Callout */}
        <div className="mt-12 p-6 rounded-2xl bg-slate-900 text-white border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold mb-1">
              <Globe className="w-4 h-4" />
              Meta Cloud API & Embedded Signup
            </div>
            <p className="text-sm text-slate-300 max-w-xl">
              Connect your WhatsApp Business Account (WABA) or use the interactive developer sandbox to simulate webhooks and outgoing notifications.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-colors"
            >
              <Settings className="w-4 h-4" />
              API Settings
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
