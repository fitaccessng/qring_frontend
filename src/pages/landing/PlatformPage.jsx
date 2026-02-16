import { Link } from "react-router-dom";
import { useState } from "react";
import { useTheme } from "../../state/ThemeContext";
import BrandMark from "../../components/BrandMark";

export default function PlatformPage() {
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
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Platform Overview</h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            Qring is a modern smart access control platform that replaces traditional doorbells with QR-powered realtime communication and visitor verification.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-xl font-bold">QR Code Scanning</h3>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Visitors scan unique QR codes at entry points to request access. Instant notifications reach homeowners with full context.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-xl font-bold">Realtime Communication</h3>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              WebSocket-powered messaging, voice, and video calls connect homeowners and visitors instantly with no lag.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-xl font-bold">Smart Routing</h3>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Automatically direct visitors to the right person, door, or building based on QR code assignments.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-xl font-bold">Session Management</h3>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Create, approve, deny, or revoke access sessions with configurable time limits on-the-fly.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-xl font-bold">Complete Audit Logs</h3>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Every action is logged for compliance, security investigations, and operational transparency.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-xl font-bold">Multi-Level Access</h3>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Role-based access control for homeowners, estate managers, residents, and visitors.
            </p>
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl font-bold">How It Works</h2>
          <div className="mt-8 space-y-6">
            <div className="flex gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white dark:bg-white dark:text-slate-900">1</div>
              <div>
                <h3 className="font-bold">Visitor Scans QR Code</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Visitor scans a unique QR code at the entry point or gate</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white dark:bg-white dark:text-slate-900">2</div>
              <div>
                <h3 className="font-bold">System Validates & Notifies</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Qring backend verifies the code and sends instant notification to the homeowner</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white dark:bg-white dark:text-slate-900">3</div>
              <div>
                <h3 className="font-bold">Homeowner Responds</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Homeowner approves or denies access from their phone or dashboard</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white dark:bg-white dark:text-slate-900">4</div>
              <div>
                <h3 className="font-bold">Session Established</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Secure chat, voice, or video session opens immediately for communication</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-wrap justify-center gap-4">
          <Link to="/" className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
            Back Home
          </Link>
          <Link to="/pricing" className="rounded-lg border border-slate-200 px-6 py-3 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
            View Pricing
          </Link>
          <Link to="/signup" className="rounded-lg border border-slate-200 px-6 py-3 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
            Start Free Trial
          </Link>
        </div>
      </main>
    </div>
  );
}
