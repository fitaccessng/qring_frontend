import { Link } from "react-router-dom";
import { useState } from "react";
import { useTheme } from "../../state/ThemeContext";
import BrandMark from "../../components/BrandMark";

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Last updated: January 2025</p>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            We respect your privacy and are committed to protecting your personal data. This policy explains how we collect, use, and safeguard your information.
          </p>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold">1. Information We Collect</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Account Information:</strong> Name, email address, phone number, password, and profile details provided during registration.
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Session Data:</strong> QR code scans, access requests, visitor interactions, and device information for each session.
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Communication Data:</strong> Messages, voice recordings, and video data shared through our realtime communication features (encrypted end-to-end).
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Technical Data:</strong> IP address, browser type, device information, and usage patterns for analytics and security.
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Payment Information:</strong> Billing address and payment method data (processed securely by third-party providers, we do not store full credit card numbers).
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">2. How We Use Your Information</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                • Provide and improve our smart access control platform and services
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                • Process transactions, payments, and account management
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                • Communicate service updates, security alerts, and support responses
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                • Generate audit logs for security, compliance, and troubleshooting
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                • Analyze usage patterns to enhance user experience and platform performance
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                • Comply with legal obligations and enforce our terms of service
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">3. Data Retention</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Active Account:</strong> Your account information is retained for the duration of your subscription.
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Audit Logs:</strong> Session logs and access records are retained for 90 days to 1 year for security and compliance purposes.
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Communication Data:</strong> Realtime communication is not stored unless explicitly backed up by the user.
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>After Account Deletion:</strong> We delete or anonymize personal data within 30 days of account closure, except where required by law.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">4. Data Sharing & Third Parties</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                We do not sell, rent, or trade your personal data. We may share information only:
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                • With service providers (hosting, payment processing, analytics) under data processing agreements
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                • When required by law, court order, or government authority
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                • To protect against security threats or fraud (with minimal data shared)
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                • In case of business restructuring or acquisition (with privacy terms maintained)
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">5. Your Rights & Controls</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Access:</strong> You can view and download your personal data through account settings.
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Correction:</strong> Update or correct account information in your profile at any time.
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Deletion:</strong> Request deletion of your account and associated personal data (some data retained for audit/legal purposes).
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Opt-Out:</strong> Disable marketing emails and notifications through account preferences.
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>GDPR Rights:</strong> If you're in the EU, you have additional rights under GDPR. Contact us for a formal data request.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">6. Cookies & Tracking</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                We use cookies and localStorage to maintain sessions, remember preferences, and analyze platform usage. You can control cookie settings in your browser.
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                We use Google Analytics for aggregated usage insights. No personally identifiable information is sent to Google.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">7. Security Measures</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                • Data encrypted in transit (HTTPS/TLS 1.2+) and at rest (AES-256)
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                • Passwords hashed with bcrypt to prevent unauthorized access
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                • End-to-end encryption for realtime communications
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                • Regular security audits and penetration testing
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                • Multi-factor authentication available for enhanced account protection
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">8. Children's Privacy</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                Our service is not intended for users under 18. We do not knowingly collect data from minors. If we discover such data, we delete it promptly.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">9. Policy Changes</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                We may update this policy periodically. Significant changes will be notified via email or in-app notice. Continued use after changes constitutes acceptance.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">10. Contact Us</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Privacy Questions:</strong> privacy@useqring.online
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>GDPR/Data Requests:</strong> dpo@useqring.online
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Security Concerns:</strong> security@useqring.online
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-wrap justify-center gap-4 border-t border-slate-200 pt-8 dark:border-slate-800">
          <Link to="/" className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
            Back Home
          </Link>
          <Link to="/terms" className="rounded-lg border border-slate-200 px-6 py-3 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
            View Terms
          </Link>
        </div>
      </main>
    </div>
  );
}
