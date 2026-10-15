import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";
import { Scale, AlertCircle, FileText } from "lucide-react";

export const metadata = {
  title: "Terms of Service | Wafilow WhatsApp API",
  description: "Terms of Service governing the use of the Wafilow WhatsApp Business API customer communication platform.",
};

export default function TermsOfServicePage() {
  const lastUpdated = "September 21, 2026";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <PublicHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full">
        {/* Category Header */}
        <div className="flex items-center gap-2 text-xs font-semibold text-[#5938F5] dark:text-violet-400 uppercase tracking-wider mb-3">
          <Scale className="w-4 h-4" />
          Legal Terms
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Last Updated: <span className="font-medium text-slate-700 dark:text-slate-300">{lastUpdated}</span>
        </p>

        {/* Third-Party Disclaimer Banner */}
        <div className="mt-8 p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-sm leading-relaxed flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong>Important Meta / WhatsApp Disclaimer:</strong> Wafilow is an independent software application that provides software interfaces and tools for the WhatsApp Business Platform. Wafilow is not affiliated, associated, authorized, endorsed by, or in any way officially connected with Meta Platforms, Inc., WhatsApp LLC, or any of their subsidiaries or affiliates.
          </div>
        </div>

        {/* Table of Contents */}
        <div className="mt-8 p-5 rounded-xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-sm">
          <div className="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#5938F5]" />
            Table of Contents
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
            <li><a href="#acceptance" className="hover:text-[#5938F5] hover:underline">1. Acceptance of Terms</a></li>
            <li><a href="#description" className="hover:text-[#5938F5] hover:underline">2. Description of Wafilow</a></li>
            <li><a href="#account" className="hover:text-[#5938F5] hover:underline">3. Account Registration & Eligibility</a></li>
            <li><a href="#meta-compliance" className="hover:text-[#5938F5] hover:underline">4. Meta & WhatsApp Policy Compliance</a></li>
            <li><a href="#prohibited-uses" className="hover:text-[#5938F5] hover:underline">5. Prohibited Uses & Content</a></li>
            <li><a href="#messaging-consent" className="hover:text-[#5938F5] hover:underline">6. Customer Consent & Messaging Rules</a></li>
            <li><a href="#account-security" className="hover:text-[#5938F5] hover:underline">7. Account Security & Credentials</a></li>
            <li><a href="#availability" className="hover:text-[#5938F5] hover:underline">8. Service Availability & Third-Party APIs</a></li>
            <li><a href="#intellectual-property" className="hover:text-[#5938F5] hover:underline">9. Intellectual Property</a></li>
            <li><a href="#suspension" className="hover:text-[#5938F5] hover:underline">10. Suspension & Termination</a></li>
            <li><a href="#liability" className="hover:text-[#5938F5] hover:underline">11. Limitation of Liability</a></li>
            <li><a href="#disclaimer" className="hover:text-[#5938F5] hover:underline">12. Disclaimer of Warranties</a></li>
            <li><a href="#governing-law" className="hover:text-[#5938F5] hover:underline">13. Governing Law</a></li>
            <li><a href="#contact" className="hover:text-[#5938F5] hover:underline">14. Contact Information</a></li>
          </ul>
        </div>

        {/* Sections */}
        <div className="mt-10 space-y-10 text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
          {/* Section 1 */}
          <section id="acceptance" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing, browsing, registering for, or using Wafilow (&quot;the Service&quot;), you confirm that you have read, understood, and agreed to be bound by these Terms of Service. If you are entering into these Terms on behalf of a company, corporation, or other legal entity, you represent and warrant that you have full legal authority to bind that entity to these Terms. If you do not agree with these Terms, you must not access or use Wafilow.
            </p>
          </section>

          {/* Section 2 */}
          <section id="description" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              2. Description of Wafilow
            </h2>
            <p>
              Wafilow is a cloud-based software platform that provides customer communication tools for commercial organizations. The platform features an omnichannel live inbox, broadcast campaign management, Meta message template creation, audience directory tagging, and webhook routing by connecting with the WhatsApp Business Platform (WhatsApp Cloud API).
            </p>
          </section>

          {/* Section 3 */}
          <section id="account" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              3. Account Registration & Eligibility
            </h2>
            <p>
              To use Wafilow, you must register for an account by providing accurate, complete, and current information, including your full name, business email address, and company name. You must be at least 18 years of age or the age of legal majority in your jurisdiction to create an account. You are responsible for keeping your login credentials confidential.
            </p>
          </section>

          {/* Section 4 */}
          <section id="meta-compliance" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              4. Meta & WhatsApp Policy Compliance
            </h2>
            <p>
              Your use of Wafilow depends upon access to the WhatsApp Business Platform provided by Meta Platforms, Inc. You explicitly acknowledge and agree that:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                You must possess a valid, active Meta Business Manager and WhatsApp Business Account (WABA) in good standing.
              </li>
              <li>
                You are solely responsible for strict compliance with the{" "}
                <span className="font-semibold text-slate-900 dark:text-white">WhatsApp Business Messaging Policy</span>, the{" "}
                <span className="font-semibold text-slate-900 dark:text-white">WhatsApp Commerce Policy</span>, and the{" "}
                <span className="font-semibold text-slate-900 dark:text-white">Meta Platform Terms</span>.
              </li>
              <li>
                Meta reserves the unilateral right to approve, reject, rate, or restrict WhatsApp phone numbers, message templates, or accounts based on recipient feedback, spam reports, or quality tier downgrades. Wafilow has no authority over Meta&apos;s enforcement decisions.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section id="prohibited-uses" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              5. Prohibited Uses & Content
            </h2>
            <p>You agree not to use Wafilow to transmit, distribute, or facilitate any of the following:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Unsolicited bulk marketing communications (spam) to individuals who have not provided affirmative opt-in consent.</li>
              <li>Deceptive, fraudulent, phishing, or impersonation campaigns.</li>
              <li>Harassing, defamatory, threatening, obscene, or unlawful materials.</li>
              <li>Sale or promotion of prohibited goods or services as defined by WhatsApp&apos;s Commerce Policy (e.g., weapons, illegal drugs, unauthorized pharmaceuticals, adult products).</li>
              <li>Any activity that attempts to reverse engineer, disrupt, overload, or compromise the security of Wafilow servers or connected networks.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section id="messaging-consent" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              6. Customer Consent & Messaging Rules
            </h2>
            <p>
              You, as the business sender, bear sole legal and regulatory responsibility for the communications dispatched via your connected phone numbers:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                You must obtain prior opt-in consent from each recipient clearly stating that they agree to receive WhatsApp communications from your business.
              </li>
              <li>
                You must provide an intuitive and readily available mechanism for recipients to unsubscribe or opt out (e.g., responding &quot;STOP&quot;), and you must honor all opt-out requests promptly.
              </li>
              <li>
                You must adhere to applicable telecommunications and anti-spam legislation in all jurisdictions where your recipients reside.
              </li>
            </ul>
          </section>

          {/* Section 7 */}
          <section id="account-security" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              7. Account Security & Credentials
            </h2>
            <p>
              You are responsible for safeguarding your account password and API credentials. You must notify Wafilow immediately if you suspect any unauthorized access to your account or any security breach. Wafilow will not be liable for any loss or damage arising from your failure to protect your authentication credentials.
            </p>
          </section>

          {/* Section 8 */}
          <section id="availability" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              8. Service Availability & Third-Party APIs
            </h2>
            <p>
              While we strive to provide reliable and consistent service, Wafilow is provided on an &quot;as available&quot; basis. We do not guarantee uninterrupted, continuous, or error-free platform uptime. We may perform routine maintenance, updates, or emergency repairs that temporarily interrupt availability.
            </p>
            <p>
              Because Wafilow relies on external APIs maintained by Meta, any outages, throttling, latency, rate limits, or service suspensions originating from Meta&apos;s infrastructure are beyond our control.
            </p>
          </section>

          {/* Section 9 */}
          <section id="intellectual-property" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              9. Intellectual Property
            </h2>
            <p>
              All software, interfaces, graphics, code, and documentation comprising Wafilow are the exclusive property of Wafilow and its licensors. You are granted a limited, non-exclusive, non-transferable license to access and use the platform solely for your internal business purposes.
            </p>
            <p>
              WhatsApp, Meta, and related trademarks, logos, and service marks are the registered intellectual property of Meta Platforms, Inc.
            </p>
          </section>

          {/* Section 10 */}
          <section id="suspension" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              10. Suspension & Termination
            </h2>
            <p>
              We reserve the right to suspend or terminate your access to Wafilow immediately and without prior notice if:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You violate any provision of these Terms or applicable Meta policies.</li>
              <li>Your WhatsApp Business Account is flagged, penalized, or terminated by Meta.</li>
              <li>Your account demonstrates abusive, fraudulent, or high-spam messaging patterns.</li>
              <li>Required subscription fees are overdue, where applicable.</li>
            </ul>
            <p>
              Upon termination, your right to access Wafilow terminates immediately, and you may request data deletion in accordance with our Privacy Policy.
            </p>
          </section>

          {/* Section 11 */}
          <section id="liability" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              11. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law, in no event shall Wafilow, its officers, directors, employees, or contractors be liable for any indirect, incidental, special, consequential, punitive, or exemplary damages, including but not limited to loss of profits, revenue, data, goodwill, or business interruption, arising out of or in connection with your use or inability to use the platform.
            </p>
          </section>

          {/* Section 12 */}
          <section id="disclaimer" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              12. Disclaimer of Warranties
            </h2>
            <p>
              Wafilow is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis, without warranties of any kind, whether express, implied, statutory, or otherwise, including but not limited to implied warranties of merchantability, fitness for a particular purpose, non-infringement, or course of performance.
            </p>
          </section>

          {/* Section 13 */}
          <section id="governing-law" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              13. Governing Law & Jurisdiction
            </h2>
            <p>
              These Terms and any dispute or claim arising out of or in connection with them shall be governed by and construed in accordance with the laws of [GOVERNING JURISDICTION], without giving effect to any choice or conflict of law principles. Any legal suit, action, or proceeding arising out of or related to these Terms shall be instituted exclusively in the competent courts of [GOVERNING JURISDICTION].
            </p>
          </section>

          {/* Section 14 */}
          <section id="contact" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              14. Contact Information
            </h2>
            <p>
              If you have any questions, legal inquiries, or notices regarding these Terms of Service, please contact us at:
            </p>
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm">
              <p><strong>Legal & Inquiries:</strong> [CONTACT EMAIL]</p>
            </div>
          </section>
        </div>

        {/* Bottom Navigation */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-sm">
          <Link href="/" className="text-slate-600 hover:text-[#5938F5] dark:text-slate-400 dark:hover:text-[#5938F5]">
            ← Back to Home
          </Link>
          <div className="flex gap-4">
            <Link href="/privacy-policy" className="text-[#5938F5] hover:underline">
              Privacy Policy
            </Link>
            <Link href="/data-deletion" className="text-[#5938F5] hover:underline">
              Data Deletion
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
