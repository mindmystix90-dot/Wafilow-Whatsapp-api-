"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import {
  Trash2,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Search,
  AlertCircle,
  Mail,
  Lock,
  Loader2,
} from "lucide-react";

function StatusChecker() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("code") || searchParams.get("confirmation_code");

  const [code, setCode] = useState(codeParam || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    status?: string;
    message?: string;
    error?: string;
  } | null>(null);

  const checkStatus = async (trackingCode: string) => {
    if (!trackingCode.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(
        `/api/whatsapp/data-deletion?code=${encodeURIComponent(trackingCode.trim())}`
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setResult({
          success: true,
          status: data.status,
          message: data.message || "Deletion request verified and processed.",
        });
      } else {
        setResult({
          success: false,
          error: data.error || "Unable to locate deletion record for this code.",
        });
      }
    } catch {
      setResult({
        success: false,
        error: "Network error verifying confirmation code. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!codeParam) return;
    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const res = await fetch(
          `/api/whatsapp/data-deletion?code=${encodeURIComponent(codeParam.trim())}`
        );
        const data = await res.json();
        if (!isMounted) return;
        if (res.ok && data.success) {
          setResult({
            success: true,
            status: data.status,
            message: data.message || "Deletion request verified and processed.",
          });
        } else {
          setResult({
            success: false,
            error: data.error || "Unable to locate deletion record for this code.",
          });
        }
      } catch {
        if (!isMounted) return;
        setResult({
          success: false,
          error: "Network error verifying confirmation code. Please try again.",
        });
      }
    };
    fetchStatus();
    return () => {
      isMounted = false;
    };
  }, [codeParam]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkStatus(code);
  };

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-base mb-2">
        <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        Track Deletion Request Status
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        If you received a confirmation code from Meta or our support team, enter it below to verify the status of your data deletion request:
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. waf_del_m8z9... or confirmation code"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#5938F5] hover:bg-[#4d2ee0] disabled:opacity-50 text-white font-medium text-sm transition-colors shrink-0 cursor-pointer shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Check Status
            </>
          )}
        </button>
      </form>

      {result && (
        <div
          className={`mt-4 p-4 rounded-xl text-sm border flex items-start gap-3 ${
            result.success
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
              : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200"
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="font-semibold">
              {result.success ? `Status: ${result.status?.toUpperCase()}` : "Request Not Found"}
            </div>
            <div className="mt-1 text-xs sm:text-sm">
              {result.success ? result.message : result.error}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DataDeletionPage() {
  const lastUpdated = "September 21, 2026";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <PublicHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full">
        {/* Category Header */}
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3">
          <Trash2 className="w-4 h-4" />
          User Rights & Compliance
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Data Deletion Instructions
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Last Updated: <span className="font-medium text-slate-700 dark:text-slate-300">{lastUpdated}</span>
        </p>

        {/* Overview Box */}
        <div className="mt-8 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
            In accordance with Meta Platform policies, the General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA), and global privacy standards, Wafilow provides a transparent and straightforward process for users and businesses to request the deletion of their personal and business data from our systems.
          </p>
        </div>

        {/* Interactive Status Checker with Suspense */}
        <div className="mt-8">
          <Suspense
            fallback={
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-500 flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600 mr-2" />
                Loading status verification...
              </div>
            }
          >
            <StatusChecker />
          </Suspense>
        </div>

        {/* Detailed Guidelines */}
        <div className="mt-12 space-y-10 text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              1. What Data Deletion Means
            </h2>
            <p>
              When you submit a data deletion request for your Wafilow account, we initiate an immediate severance and permanent data purge process:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Immediate Token Revocation:</strong> Your stored WhatsApp Cloud API access tokens, system user credentials, and webhook verification tokens are cleared, immediately disconnecting Wafilow from your Meta WhatsApp Business Account (WABA).
              </li>
              <li>
                <strong>Account Unlinking:</strong> Your WABA ID and Phone Number IDs are disassociated from your organization profile, preventing any future message ingestion or status callbacks.
              </li>
              <li>
                <strong>Customer & Message Data Purge:</strong> Contact records, audience tags, message history, media attachments, and conversation threads are permanently erased from our production databases.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              2. Data That May Be Retained
            </h2>
            <p>
              Under applicable statutory regulations, certain minimal records may need to be retained for a limited duration:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Security & Fraud Prevention Logs:</strong> Redacted operational access logs may be retained for up to 90 days to prevent denial-of-service attacks, detect malicious intrusions, and ensure infrastructure security.
              </li>
              <li>
                <strong>Accounting & Tax Records:</strong> Where applicable, records of commercial transactions and invoices must be retained for periods prescribed by commercial tax authorities.
              </li>
              <li>
                <strong>Legal Hold:</strong> Information subject to a lawful subpoena, court order, or ongoing legal inquiry will be retained strictly until the legal requirement expires.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              3. How to Submit a Data Deletion Request
            </h2>
            <p>
              You can request data deletion through any of the three following methods:
            </p>

            {/* Method A */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                Method A: In-App Organization Disconnect (Instant)
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                If you are an active Wafilow user, you can disconnect your WhatsApp integration and clear credentials directly from your dashboard:
              </p>
              <ol className="list-decimal pl-6 text-sm space-y-1 text-slate-600 dark:text-slate-400">
                <li>Log in to your Wafilow account.</li>
                <li>Navigate to <strong className="text-slate-800 dark:text-slate-200">API Settings</strong> (<code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">/settings</code>).</li>
                <li>In the WhatsApp Business Account section, click <strong className="text-slate-800 dark:text-slate-200">Disconnect WhatsApp</strong> or clear your configured credentials.</li>
                <li>Confirm disconnection to immediately purge stored tokens.</li>
              </ol>
            </div>

            {/* Method B */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-600" />
                Method B: Via Meta / Facebook App Settings (Automated Callback)
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                If you connected Wafilow using Meta Facebook Login or Embedded Signup, you can trigger an automated deletion request via your Facebook account:
              </p>
              <ol className="list-decimal pl-6 text-sm space-y-1 text-slate-600 dark:text-slate-400">
                <li>Go to your Facebook profile or Meta Business Suite.</li>
                <li>Navigate to <strong className="text-slate-800 dark:text-slate-200">Settings &amp; Privacy &gt; Settings</strong>.</li>
                <li>Click <strong className="text-slate-800 dark:text-slate-200">Apps and Websites</strong>.</li>
                <li>Locate <strong className="text-slate-800 dark:text-slate-200">Wafilow</strong> in the active apps list.</li>
                <li>Click <strong className="text-slate-800 dark:text-slate-200">Remove</strong>, and check the option to request that Wafilow delete your data.</li>
                <li>Meta will automatically trigger our secure server-side callback endpoint (<code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">/api/whatsapp/data-deletion</code>) and provide you with a confirmation tracking code.</li>
              </ol>
            </div>

            {/* Method C */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-600" />
                Method C: Email Deletion Request
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                You may also send a written request to our support team:
              </p>
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm">
                <strong>Email:</strong> [CONTACT EMAIL]
                <br />
                <strong>Subject:</strong> Data Deletion Request - [Your Organization Name]
                <br />
                <strong>Required Details:</strong> Registered business email, WABA ID (if known), and requested scope (token revocation only, or complete account deletion).
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              4. Processing Timeline
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <Clock className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                <div className="font-bold text-slate-900 dark:text-white text-sm">Immediate</div>
                <div className="text-xs text-slate-500 mt-1">Access token revocation &amp; webhook unbinding</div>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                <div className="font-bold text-slate-900 dark:text-white text-sm">Within 48 Hours</div>
                <div className="text-xs text-slate-500 mt-1">Confirmation code issuance &amp; database staging</div>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <Trash2 className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                <div className="font-bold text-slate-900 dark:text-white text-sm">Within 30 Days</div>
                <div className="text-xs text-slate-500 mt-1">Complete purge from all databases &amp; backups</div>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              5. Contact & Assistance
            </h2>
            <p>
              If you have any questions or require assistance submitting a deletion request, please reach out to our team at:
            </p>
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm">
              <p><strong>Privacy Contact:</strong> [CONTACT EMAIL]</p>
            </div>
          </section>
        </div>

        {/* Bottom Navigation */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-sm">
          <Link href="/" className="text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400">
            ← Back to Home
          </Link>
          <div className="flex gap-4">
            <Link href="/privacy-policy" className="text-emerald-600 hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-emerald-600 hover:underline">
              Terms of Service
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
