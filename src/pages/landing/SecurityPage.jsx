import { Link } from "react-router-dom";
import { useState } from "react";
import { useTheme } from "../../state/ThemeContext";
import BrandMark from "../../components/BrandMark";

export default function SecurityPage() {
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
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Security & Privacy</h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            Qring employs industry-standard security practices to protect your data, sessions, and access control.
          </p>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold">Encryption & Data Protection</h2>
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-bold text-slate-900 dark:text-white">End-to-End Encryption</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                All realtime communication (messages, voice, video) is encrypted using WebRTC protocols and TLS 1.2+.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-bold text-slate-900 dark:text-white">JWT Authentication</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Sessions are secured with JSON Web Tokens with configurable expiration. Tokens are stored securely on client devices.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-bold text-slate-900 dark:text-white">Password Security</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Passwords are hashed with bcrypt (10+ rounds). We enforce strong password policies and support two-factor authentication.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-bold text-slate-900 dark:text-white">Database Encryption</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Sensitive data at rest is encrypted using AES-256 encryption. Database backups are regularly tested and encrypted.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold">Access Control & Permissions</h2>
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-bold text-slate-900 dark:text-white">Role-Based Access Control (RBAC)</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Granular permissions for admins, estate managers, homeowners, and visitors. Each role has strict scope boundaries.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-bold text-slate-900 dark:text-white">Session Scoping</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Each session is scoped to specific users, doors, and time windows. Access is automatically revoked on expiration.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-bold text-slate-900 dark:text-white">Audit Logging</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Every authentication, authorization, and access event is logged with timestamp, user, IP, and outcome.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-bold text-slate-900 dark:text-white">Rate Limiting</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                API endpoints are rate-limited to prevent brute-force attacks and abuse.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold">Infrastructure & Compliance</h2>
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-bold text-slate-900 dark:text-white">HTTPS/TLS</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                All traffic is encrypted in transit using HTTPS with TLS 1.2 or higher. Certificate pinning for mobile apps.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-bold text-slate-900 dark:text-white">Secure Infrastructure</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Application runs on managed cloud infrastructure with DDoS protection, firewalls, and intrusion detection.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-bold text-slate-900 dark:text-white">Regular Security Audits</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Third-party security assessments, penetration testing, and code reviews are conducted regularly.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-bold text-slate-900 dark:text-white">Vulnerability Disclosure</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                We follow responsible disclosure practices. Report security issues to security@useqring.online
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-wrap justify-center gap-4">
          <Link to="/" className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
            Back Home
          </Link>
          <Link to="/compliance" className="rounded-lg border border-slate-200 px-6 py-3 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
            View Compliance
          </Link>
        </div>
      </main>
    </div>
  );
}
