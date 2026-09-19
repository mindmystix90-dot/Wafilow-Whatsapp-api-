"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Key, Shield, Globe, Send, Check, Copy } from "lucide-react";

export default function SettingsPage() {
  const [phoneNumberId, setPhoneNumberId] = useState("109847291039482");
  const [wabaId, setWabaId] = useState("782910384729102");
  const [accessToken, setAccessToken] = useState("EAAGm0PX4ZC...[Meta Cloud API Token]");
  const [verifyToken, setVerifyToken] = useState("wafilow_webhook_token_secure_9921");
  const [testNumber, setTestNumber] = useState("+14155550192");
  const [testSent, setTestSent] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/webhook` : "https://your-domain.com/api/webhook";

  const handleLaunchEmbeddedSignup = () => {
    if (typeof window !== "undefined" && window.FB) {
      window.FB.login(
        (response) => {
          if (response.authResponse) {
            alert("WhatsApp Business Account connected successfully via Meta Embedded Signup!");
          }
        },
        {
          scope: "whatsapp_business_messaging,whatsapp_business_management",
          extras: {
            feature: "whatsapp_embedded_signup",
          },
        }
      );
    } else {
      alert("Meta Embedded Signup SDK simulated: In production, this launches the Facebook modal for 1-click onboarding.");
    }
  };

  const handleSendTestMessage = (e: React.FormEvent) => {
    e.preventDefault();
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <AppLayout
      title="API & Meta WABA Settings"
      subtitle="Configure WhatsApp Cloud API credentials, Webhooks, and Embedded Signup"
    >
      <div className="space-y-6 max-w-4xl">
        {/* Meta Embedded Signup Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-900 to-slate-900 text-white border border-emerald-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1">
              1-Click Meta Onboarding
            </span>
            <h3 className="text-lg font-bold">Connect WhatsApp via Embedded Signup</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-lg">
              Seamlessly link your Meta Business Manager, claim phone numbers, and authorize WhatsApp messaging permissions in seconds.
            </p>
          </div>
          <button
            onClick={handleLaunchEmbeddedSignup}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <Globe className="w-4 h-4" />
            Launch Embedded Signup
          </button>
        </div>

        {/* Credentials Form */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-600" />
            WhatsApp Cloud API Credentials
          </h3>
          <p className="text-xs text-slate-500 mb-5">
            Retrieved from your Meta App Dashboard under WhatsApp &gt; API Setup
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number ID
              </label>
              <input
                type="text"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                WhatsApp Business Account (WABA) ID
              </label>
              <input
                type="text"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                System User Permanent Access Token
              </label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Webhook Configuration */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            Meta Webhook Integration
          </h3>
          <p className="text-xs text-slate-500 mb-5">
            Configure this URL and Verify Token in Meta App Dashboard &gt; WhatsApp &gt; Configuration
          </p>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Callback URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(webhookUrl);
                    setCopiedWebhook(true);
                    setTimeout(() => setCopiedWebhook(false), 2000);
                  }}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 font-medium"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedWebhook ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Verify Token
              </label>
              <input
                type="text"
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* Live Message Dispatch Tester */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <Send className="w-4 h-4 text-violet-600" />
            Send Test WhatsApp Notification
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Verify your Cloud API connection by sending an immediate test template message
          </p>

          <form onSubmit={handleSendTestMessage} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              required
              value={testNumber}
              onChange={(e) => setTestNumber(e.target.value)}
              placeholder="e.g. +14155550192"
              className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
            />
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5"
            >
              {testSent ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              {testSent ? "Test Dispatched!" : "Send Test Ping"}
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
