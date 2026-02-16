import { Link } from "react-router-dom";
import { useState } from "react";
import { useTheme } from "../../state/ThemeContext";
import BrandMark from "../../components/BrandMark";

const values = [
  {
    title: "Security by design",
    text: "Every session, route, and permission is scoped with strict role boundaries and auditability."
  },
  {
    title: "Realtime reliability",
    text: "Qring is engineered for low-latency alerts, resilient socket delivery, and stable communication."
  },
  {
    title: "Scalable architecture",
    text: "Modular services support growth from single properties to large multi-estate deployments."
  }
];

const milestones = [
  { year: "2024", event: "Qring concept and architecture blueprint defined." },
  { year: "2025", event: "Core QR routing and visitor flow launched in pilot communities." },
  { year: "2026", event: "Realtime session suite and estate operations dashboard released." }
];

export default function AboutPage() {
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
            <Link to="/pricing" className="hidden rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold sm:text-sm sm:inline-block dark:border-slate-700">
              Pricing
            </Link>
            <Link to="/signup" className="hidden rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white sm:px-6 sm:text-sm sm:inline-block dark:bg-white dark:text-slate-900">
              Get Started
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
              <Link
                to="/"
                onClick={() => setSidebarOpen(false)}
                className="block rounded-lg px-3 py-2 text-base font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                Home
              </Link>
              <Link
                to="/contact"
                onClick={() => setSidebarOpen(false)}
                className="block rounded-lg px-3 py-2 text-base font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                Contact
              </Link>
              <Link
                to="/pricing"
                onClick={() => setSidebarOpen(false)}
                className="block rounded-lg px-3 py-2 text-base font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                Pricing
              </Link>
              <Link
                to="/signup"
                onClick={() => setSidebarOpen(false)}
                className="block rounded-lg bg-slate-900 px-3 py-2 text-base font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-16">
        <section className="grid gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8 lg:grid-cols-2 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">About Qring</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Building trusted access communication for modern communities
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
              Qring replaces analog doorbell friction with a secure digital-first experience for homeowners, estate managers, and visitors.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
              We focus on clarity, speed, and control so communities can manage access confidently from anywhere.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">Mission</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
              Make door access communication secure, instant, and auditable while preserving user privacy and operational boundaries.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center sm:gap-4">
              <Impact value="150k+" label="Sessions handled" />
              <Impact value="98%" label="Approval speed" />
              <Impact value="24/7" label="Platform ops" />
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:mt-10 sm:gap-6 md:grid-cols-3">
          {values.map((item) => (
            <article key={item.title} className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-xl font-bold">{item.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.text}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:mt-10 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Journey</h2>
          <div className="mt-5 grid gap-4 sm:mt-6 md:grid-cols-3">
            {milestones.map((item) => (
              <article key={item.year} className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">{item.year}</p>
                <p className="mt-2 text-sm font-medium leading-relaxed">{item.event}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-2xl bg-slate-900 p-6 text-white sm:mt-10 sm:p-8 lg:flex lg:items-center lg:justify-between dark:bg-white dark:text-slate-900">
          <div>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Ready to deploy Qring?</h2>
            <p className="mt-2 text-sm text-slate-300 dark:text-slate-600">Talk to our team about your building or estate setup.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 lg:mt-0">
            <Link to="/contact" className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-900 dark:bg-slate-900 dark:text-white">
              Contact Sales
            </Link>
            <Link to="/" className="rounded-lg border border-white px-5 py-3 text-sm font-semibold dark:border-slate-900">
              Back Home
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function Impact({ value, label }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-2xl font-black sm:text-3xl">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">{label}</p>
    </div>
  );
}
