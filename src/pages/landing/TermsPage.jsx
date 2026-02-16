import { Link } from "react-router-dom";
import { useState } from "react";
import { useTheme } from "../../state/ThemeContext";
import BrandMark from "../../components/BrandMark";

export default function TermsPage() {
  const { isDark, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
          <Link to="/" className="flex items-center gap-3 sm:gap-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 dark:bg-white">
              <BrandMark tone="light" className="h-6 w-6 dark:invert-0" />
            </span>
            <span>
              <span className="block text-xl font-black tracking-tight sm:text-2xl">Qring</span>
              <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-500">Smart Access Control</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:px-4 sm:text-sm dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              {isDark ? "Light" : "Dark"}
            </button>
            <Link to="/about" className="hidden rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold sm:text-sm sm:inline-block dark:border-slate-700">
              About
            </Link>
            <Link to="/pricing" className="hidden rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white sm:px-6 sm:text-sm sm:inline-block dark:bg-white dark:text-slate-900">
              Pricing
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden rounded-lg border border-slate-200 px-3 py-2 text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </nav>

        {sidebarOpen && (
          <div className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:hidden">
            <div className="space-y-1 px-4 py-4 sm:px-6">
              <Link to="/" onClick={() => setSidebarOpen(false)} className="block rounded-lg px-3 py-2 text-base font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
                Home
              </Link>
              <Link to="/about" onClick={() => setSidebarOpen(false)} className="block rounded-lg px-3 py-2 text-base font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
                About
              </Link>
              <Link to="/pricing" onClick={() => setSidebarOpen(false)} className="block rounded-lg px-3 py-2 text-base font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
                Pricing
              </Link>
              <Link to="/contact" onClick={() => setSidebarOpen(false)} className="block rounded-lg px-3 py-2 text-base font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
                Contact
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10">
        <div className="mb-16">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Terms of Service</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Last updated: January 2025</p>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            These Terms of Service govern your use of the Qring platform. By accessing or using our service, you agree to be bound by these terms.
          </p>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold">1. Acceptance of Terms</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                By accessing, using, or registering with Qring, you agree to comply with these Terms of Service and all applicable laws and regulations. If you do not agree with any part of these terms, you may not use our service.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">2. Service Description</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                Qring is a smart access control platform that enables estate managers and homeowners to manage visitor access through QR codes, realtime communication, and digital session management.
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                We reserve the right to modify, suspend, or discontinue service at any time with reasonable notice.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">3. User Accounts & Responsibilities</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Registration:</strong> You must provide accurate, complete information during registration and keep it updated.
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your password. You agree not to share account credentials and are liable for all activities under your account.
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Lawful Use:</strong> You must use the service only for lawful purposes and in accordance with these terms.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">4. User Conduct Restrictions</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                You agree NOT to:
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                • Attempt unauthorized access or hack the platform
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                • Transmit malware, viruses, or malicious code
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                • Use the service for illegal activities or harassment
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                • Violate intellectual property rights of others
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                • Reverse engineer, decompile, or attempt to derive source code
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                • Spam, abuse, or harass other users
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">5. Intellectual Property Rights</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                All content, features, and functionality of Qring are owned by Qring or its licensors, including logos, trademarks, and software code. You may not reproduce, modify, or distribute any content without express written permission.
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                You retain ownership of content you create and upload, but grant us a license to use, display, and process it for service delivery.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">6. Payment & Billing</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Fees:</strong> Subscription fees are as listed on the pricing page and are subject to change with 30 days notice.
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Billing:</strong> You authorize us to charge your payment method on the billing date. Failed payments may result in service suspension.
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Refunds:</strong> Refunds are available within 30 days of payment for first-time subscribers. Other refunds are at our discretion.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">7. Limitation of Liability</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Disclaimer:</strong> The service is provided "as-is" without warranties of any kind, express or implied.
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Limitation:</strong> To the maximum extent permitted by law, Qring shall not be liable for indirect, incidental, special, consequential, or punitive damages.
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Maximum Liability:</strong> Our total liability to you shall not exceed the amount you paid in the 12 months preceding the claim.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">8. Indemnification</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                You agree to indemnify, defend, and hold harmless Qring from any claims, damages, losses, or expenses arising from your violation of these terms, your use of the service, or your infringement of any rights.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">9. Termination</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Account Termination:</strong> You may terminate your account anytime through account settings. No refund of unused subscription fees will be issued.
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Our Right to Terminate:</strong> We may terminate or suspend your account for violation of these terms, non-payment, or abuse of service.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">10. Dispute Resolution</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Governing Law:</strong> These terms are governed by applicable international law.
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Arbitration:</strong> Disputes shall be resolved through informal resolution or binding arbitration, not court proceedings.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">11. Modifications to Terms</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                We may update these terms at any time. Major changes will be notified via email or in-app notice. Your continued use after changes constitutes acceptance.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">12. Contact for Disputes</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Support:</strong> support@useqring.online
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Legal Issues:</strong> legal@useqring.online
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-wrap justify-center gap-4 border-t border-slate-200 pt-8 dark:border-slate-800">
          <Link to="/" className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
            Back Home
          </Link>
          <Link to="/privacy" className="rounded-lg border border-slate-200 px-6 py-3 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
            View Privacy
          </Link>
        </div>
      </main>
    </div>
  );
}
