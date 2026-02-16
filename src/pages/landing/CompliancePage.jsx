import { Link } from "react-router-dom";
import { useState } from "react";
import { useTheme } from "../../state/ThemeContext";
import BrandMark from "../../components/BrandMark";

export default function CompliancePage() {
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
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Compliance & Standards</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Last updated: January 2025</p>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            Qring adheres to stringent compliance requirements and best practices for data protection, security, and operational integrity.
          </p>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold">Data Protection Regulations</h2>
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="font-bold text-slate-900 dark:text-white">GDPR Compliance</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Qring complies with the General Data Protection Regulation (GDPR). We honor user rights including data access, correction, deletion, and portability. Our Data Processing Agreements are available upon request.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="font-bold text-slate-900 dark:text-white">CCPA & Privacy Laws</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  For users in California and other jurisdictions with privacy laws, we provide transparency about personal information, allow opt-out options, and facilitate data rights requests.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="font-bold text-slate-900 dark:text-white">UK Data Protection Act (UKDPA)</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Qring honors obligations under the UK Data Protection Act 2018 and recognizes all GDPR rights for UK-based users.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Security Frameworks</h2>
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="font-bold text-slate-900 dark:text-white">NIST Cybersecurity Framework</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Our security practices align with NIST guidelines for identifying, protecting, detecting, responding to, and recovering from cybersecurity incidents.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="font-bold text-slate-900 dark:text-white">OWASP Top 10</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Qring development follows OWASP Top 10 security recommendations to prevent common application vulnerabilities including injection, broken authentication, and sensitive data exposure.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="font-bold text-slate-900 dark:text-white">Encryption Standards</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  All data is encrypted using industry-standard protocols: TLS 1.2+ for transport, AES-256 for data at rest, and WebRTC for realtime communications.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Compliance Certifications</h2>
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="font-bold text-slate-900 dark:text-white">Security Audits</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Qring undergoes regular third-party security assessments and penetration testing to identify and remediate vulnerabilities.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="font-bold text-slate-900 dark:text-white">Incident Response Plan</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  We maintain a documented incident response plan to detect and respond to security incidents within acceptable timeframes and notify affected users.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="font-bold text-slate-900 dark:text-white">Business Continuity</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Qring maintains backup and disaster recovery procedures with regular testing to ensure service availability and data integrity.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Access Control & Authentication</h2>
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="font-bold text-slate-900 dark:text-white">Role-Based Access Control (RBAC)</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Granular permissions ensure users only access data and features required for their role. Regular access reviews are conducted.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="font-bold text-slate-900 dark:text-white">Multi-Factor Authentication</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  MFA is available for all accounts and required for administrative functions to prevent unauthorized access.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="font-bold text-slate-900 dark:text-white">Session Management</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Sessions are scoped, time-limited, and automatically revoked. All session events are logged for audit purposes.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Audit & Logging</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Comprehensive Logging:</strong> All authentication, authorization, and data access events are logged with timestamps, user identifiers, IP addresses, and action details.
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Log Retention:</strong> Audit logs are retained for 12 months and protected against tampering and unauthorized access.
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Log Review:</strong> Logs are regularly reviewed for suspicious activities and security events.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Third-Party Security</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                All third-party service providers are vetted for security and compliance. Data Processing Agreements are in place for any processor handling personal data.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Compliance Contact</h2>
            <div className="mt-4 space-y-3">
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Compliance Officer:</strong> compliance@useqring.online
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Data Protection Officer:</strong> dpo@useqring.online
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Security Team:</strong> security@useqring.online
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-wrap justify-center gap-4 border-t border-slate-200 pt-8 dark:border-slate-800">
          <Link to="/" className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
            Back Home
          </Link>
          <Link to="/security" className="rounded-lg border border-slate-200 px-6 py-3 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
            View Security
          </Link>
        </div>
      </main>
    </div>
  );
}
