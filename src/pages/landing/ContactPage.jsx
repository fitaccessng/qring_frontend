import { Link } from "react-router-dom";
import { useState } from "react";
import { useTheme } from "../../state/ThemeContext";
import BrandMark from "../../components/BrandMark";

export default function ContactPage() {
  const { isDark, toggleTheme } = useTheme();
  const [sent, setSent] = useState(false);
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
              <Link
                to="/"
                onClick={() => setSidebarOpen(false)}
                className="block rounded-lg px-3 py-2 text-base font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                Home
              </Link>
              <Link
                to="/about"
                onClick={() => setSidebarOpen(false)}
                className="block rounded-lg px-3 py-2 text-base font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                About
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

      <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-12 lg:px-10 lg:py-16">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">Contact</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Talk to the Qring team</h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
            Reach out for deployment planning, technical onboarding, or custom estate pricing.
          </p>

          <div className="mt-6 space-y-3">
            <InfoRow label="General" value="hello@useqring.online" />
            <InfoRow label="Support" value="support@useqring.online" />
            <InfoRow label="Sales" value="sales@useqring.online" />
            <InfoRow label="Response time" value="Within 1 business day" />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Send a message</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Tell us about your property setup and goals.</p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSent(true);
            }}
            className="mt-6 space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="First name" placeholder="Your first name" />
              <Input label="Last name" placeholder="Your last name" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Email" type="email" placeholder="you@company.com" />
              <Input label="Phone" placeholder="+234..." />
            </div>
            <Input label="Company / Estate" placeholder="Property name" />
            <label className="block text-sm">
              <span className="mb-2 block font-semibold text-slate-700 dark:text-slate-200">Message</span>
              <textarea
                required
                rows={5}
                placeholder="Share your requirements..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 outline-none ring-0 transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            {sent ? (
              <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
                Message received. We will contact you shortly.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button type="submit" className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
                Send Message
              </button>
              <Link to="/" className="rounded-lg border border-slate-200 px-6 py-3 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                Back Home
              </Link>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

function Input({ label, placeholder, type = "text" }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <input
        required
        type={type}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 outline-none ring-0 transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
      />
    </label>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
