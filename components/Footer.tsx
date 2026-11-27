import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#070b12] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-950 to-indigo-600 flex items-center justify-center text-white font-extrabold text-base shadow-sm">
                W
              </div>
              <span className="font-extrabold text-lg tracking-tight text-slate-950 dark:text-white">
                Wafilow
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                CRM
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
              Enterprise WhatsApp Business Platform interface for high-velocity customer conversations, Meta HSM templates, broadcast campaigns, and automated webhooks.
            </p>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-2">
              <span>Meta WhatsApp Cloud API</span>
              <span>·</span>
              <span>Cloud API Coexistence</span>
              <span>·</span>
              <span>Encrypted Storage</span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              Platform Modules
            </h3>
            <ul className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/dashboard" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Dashboard & Metrics
                </Link>
              </li>
              <li>
                <Link href="/inbox" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Live Unified Inbox
                </Link>
              </li>
              <li>
                <Link href="/contacts" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Customer Directory
                </Link>
              </li>
              <li>
                <Link href="/templates" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  HSM Message Templates
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  API & Coexistence Settings
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              Compliance & Legal
            </h3>
            <ul className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/privacy-policy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/data-deletion" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  User Data Deletion Callback
                </Link>
              </li>
              <li>
                <a
                  href="https://developers.facebook.com/docs/whatsapp"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Meta Developer Docs
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200/80 dark:border-slate-800/80 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 dark:text-slate-500">
          <p>© {new Date().getFullYear()} Wafilow CRM. All rights reserved.</p>
          <p className="text-center sm:text-right">
            WhatsApp and Meta are registered trademarks of Meta Platforms, Inc. Wafilow is an independent WhatsApp Cloud API management interface.
          </p>
        </div>
      </div>
    </footer>
  );
}
