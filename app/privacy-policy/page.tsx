import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { Shield, Lock, FileText, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | Wafilow WhatsApp API",
  description: "Learn how Wafilow collects, uses, processes, and protects your information and WhatsApp Business data.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "September 21, 2026";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <PublicHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full">
        {/* Breadcrumb / Category Header */}
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3">
          <Shield className="w-4 h-4" />
          Legal & Privacy
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Last Updated: <span className="font-medium text-slate-700 dark:text-slate-300">{lastUpdated}</span>
        </p>

        {/* Quick Summary Card */}
        <div className="mt-8 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Privacy Overview
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Wafilow is a business software platform designed to manage communications through the official Meta WhatsApp Cloud API. We treat all business records, customer contact lists, and message communications with strict confidentiality and multi-tenant security isolation. We never sell your data or your customers&apos; personal data to third parties.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="mt-8 p-5 rounded-xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-sm">
          <div className="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            Table of Contents
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
            <li><a href="#about-wafilow" className="hover:text-emerald-600 hover:underline">1. What Wafilow Is</a></li>
            <li><a href="#information-we-collect" className="hover:text-emerald-600 hover:underline">2. Information We Collect</a></li>
            <li><a href="#how-we-use-information" className="hover:text-emerald-600 hover:underline">3. How We Use Information</a></li>
            <li><a href="#storage-and-security" className="hover:text-emerald-600 hover:underline">4. Storage & Security</a></li>
            <li><a href="#data-retention" className="hover:text-emerald-600 hover:underline">5. Data Retention</a></li>
            <li><a href="#third-party-processors" className="hover:text-emerald-600 hover:underline">6. Meta & Third-Party Processors</a></li>
            <li><a href="#business-responsibilities" className="hover:text-emerald-600 hover:underline">7. Business User Responsibilities</a></li>
            <li><a href="#your-rights" className="hover:text-emerald-600 hover:underline">8. User Rights & Data Deletion</a></li>
            <li><a href="#contact" className="hover:text-emerald-600 hover:underline">9. How to Contact Wafilow</a></li>
            <li><a href="#changes" className="hover:text-emerald-600 hover:underline">10. Policy Changes</a></li>
          </ul>
        </div>

        {/* Legal Content */}
        <div className="mt-10 space-y-10 text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
          {/* Section 1 */}
          <section id="about-wafilow" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              1. What Wafilow Is
            </h2>
            <p>
              Wafilow is an independent customer communication software-as-a-service (SaaS) platform built for commercial businesses. Wafilow provides tools including an omnichannel live inbox, broadcast notification campaign dispatching, message template management, and webhook routing by integrating directly with the official WhatsApp Business Platform (WhatsApp Cloud API) provided by Meta Platforms, Inc.
            </p>
            <p>
              Wafilow acts as a data processor on behalf of our business users (the data controllers) with respect to customer contact lists and message content transmitted through our software.
            </p>
          </section>

          {/* Section 2 */}
          <section id="information-we-collect" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              2. Information We Collect
            </h2>
            <p>
              We collect information that you directly provide when registering and using Wafilow, as well as data processed automatically through platform integrations:
            </p>
            <div className="space-y-3 pl-2">
              <div>
                <strong className="text-slate-900 dark:text-white">A. Account and Registration Information:</strong>
                <p className="mt-1">
                  When you sign up for Wafilow, we collect your name, business email address, encrypted password hash, and the name of your company or organization.
                </p>
              </div>

              <div>
                <strong className="text-slate-900 dark:text-white">B. WhatsApp Business Account (WABA) Information:</strong>
                <p className="mt-1">
                  When you connect your WhatsApp Business Account (via manual credentials or Meta Embedded Signup), we store your WhatsApp Business Account ID (WABA ID), Phone Number ID, display phone number, verified business name, quality rating, and associated access tokens.
                </p>
              </div>

              <div>
                <strong className="text-slate-900 dark:text-white">C. Customer and Contact Records:</strong>
                <p className="mt-1">
                  When you upload contacts, create audience segments, or receive inbound messages, we store contact phone numbers (WhatsApp IDs), customer names, custom attributes, tags, and opt-in/opt-out statuses.
                </p>
              </div>

              <div>
                <strong className="text-slate-900 dark:text-white">D. WhatsApp Messages and Message Metadata:</strong>
                <p className="mt-1">
                  We process the contents of inbound and outbound messages transmitted through your connected phone numbers, including text content, media references, and delivery metadata (sent, delivered, read timestamps, error codes, and unique WhatsApp message identifiers known as <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">wamId</code>).
                </p>
              </div>

              <div>
                <strong className="text-slate-900 dark:text-white">E. Automatically Collected Diagnostic Data:</strong>
                <p className="mt-1">
                  We collect operational system logs, browser user-agent headers, IP addresses, and request timestamps strictly for application security, authentication session validation, rate-limiting, and error diagnostics.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section id="how-we-use-information" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              3. How We Use Information
            </h2>
            <p>Wafilow uses collected information exclusively for legitimate operational purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Providing and operating the Wafilow service:</strong> Creating accounts, managing organization workspaces, and powering the live inbox and template builders.
              </li>
              <li>
                <strong>Sending and receiving WhatsApp communications:</strong> Relaying messages to and from Meta&apos;s Cloud API servers on your organization&apos;s behalf.
              </li>
              <li>
                <strong>Maintaining security and tenant isolation:</strong> Ensuring that each organization&apos;s messages, contacts, and access tokens remain strictly isolated from other organizations.
              </li>
              <li>
                <strong>Troubleshooting and technical support:</strong> Investigating failed message deliveries, reviewing API response codes, and diagnosing system faults.
              </li>
              <li>
                <strong>Legal compliance:</strong> Fulfilling obligations under applicable privacy and telecommunication laws.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section id="storage-and-security" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              4. Storage & Security
            </h2>
            <p>
              We implement industry-standard technical and organizational measures to safeguard your information:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Encrypted Communications:</strong> All traffic between your browser and Wafilow servers, as well as traffic between Wafilow and Meta Graph API endpoints, is encrypted in transit via Transport Layer Security (TLS/HTTPS).
              </li>
              <li>
                <strong>Server-Side Secret Isolation:</strong> Meta App Secrets, System User access tokens, and database credentials are stored exclusively on secure server environments and are never delivered to client-side browser code or logged in plain text.
              </li>
              <li>
                <strong>Database Protection:</strong> Data is persisted in a protected relational database with multi-tenant access control logic enforced at both the application and query levels.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section id="data-retention" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              5. Data Retention
            </h2>
            <p>
              We retain customer data, contacts, and message logs for as long as your organization account remains active or as needed to provide our services. When an organization closes its account or submits a validated deletion request:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Stored WhatsApp access tokens and webhook verification keys are immediately revoked and cleared.</li>
              <li>Message records, contacts, and conversation threads are permanently deleted or anonymized.</li>
              <li>Certain operational log records may be retained for a limited duration where required by law or for fraud and security prevention.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section id="third-party-processors" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              6. Meta & Third-Party Processors
            </h2>
            <p>
              Wafilow connects with third-party service providers to deliver the platform:
            </p>
            <div className="space-y-2 pl-2">
              <p>
                <strong>Meta Platforms, Inc. (WhatsApp Business Platform):</strong> To send and receive WhatsApp messages, message payloads and recipient phone numbers are transmitted to Meta&apos;s WhatsApp Cloud API infrastructure. All processing by Meta is governed by the{" "}
                <span className="font-semibold text-slate-900 dark:text-white">Meta Platform Terms</span> and the{" "}
                <span className="font-semibold text-slate-900 dark:text-white">WhatsApp Business Terms of Service</span>.
              </p>
              <p>
                <strong>Cloud Hosting Infrastructure:</strong> Wafilow utilizes cloud hosting and database infrastructure providers that enforce strict data protection and physical server security standards.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section id="business-responsibilities" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              7. Business User Responsibilities
            </h2>
            <p>
              As a business utilizing Wafilow, you are responsible for maintaining compliance with all applicable laws and Meta policies regarding the individuals you contact:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Explicit Opt-in Consent:</strong> You must ensure that you have obtained prior affirmative consent from every WhatsApp user before sending marketing or outbound transactional messages.
              </li>
              <li>
                <strong>Honoring Opt-outs:</strong> You must immediately cease messaging recipients who reply with opt-out keywords (such as &quot;STOP&quot;) or request to be removed from your contact list.
              </li>
              <li>
                <strong>Prohibited Messaging:</strong> You may not use Wafilow to send unsolicited messages, spam, deceptive communications, or content violating WhatsApp&apos;s Business and Commerce Policies.
              </li>
            </ul>
          </section>

          {/* Section 8 */}
          <section id="your-rights" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              8. User Rights & Data Deletion
            </h2>
            <p>
              Depending on your jurisdiction, you have the right to access, correct, export, restrict, or request the deletion of your personal and business data.
            </p>
            <p>
              To learn more about how account deletion is handled or to submit a data deletion request, please visit our dedicated page:
            </p>
            <div className="pt-2">
              <Link
                href="/data-deletion"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
              >
                View Data Deletion Instructions & Policy
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </section>

          {/* Section 9 */}
          <section id="contact" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              9. How to Contact Wafilow
            </h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or the handling of your data, please contact our privacy and support team at:
            </p>
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm">
              <p><strong>Support & Privacy Inquiries:</strong> [CONTACT EMAIL]</p>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                Please include your registered account email and company name in any correspondence so we can verify your organization identity.
              </p>
            </div>
          </section>

          {/* Section 10 */}
          <section id="changes" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              10. Changes to this Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our legal obligations, platform capabilities, or Meta Developer Policies. When modifications are made, the revised policy will be posted on this page with an updated &quot;Last Updated&quot; date at the top. We encourage you to review this policy periodically.
            </p>
          </section>
        </div>

        {/* Bottom Navigation */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-sm">
          <Link href="/" className="text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400">
            ← Back to Home
          </Link>
          <div className="flex gap-4">
            <Link href="/terms" className="text-emerald-600 hover:underline">
              Terms of Service
            </Link>
            <Link href="/data-deletion" className="text-emerald-600 hover:underline">
              Data Deletion
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
