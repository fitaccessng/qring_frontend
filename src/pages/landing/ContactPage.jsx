import { Link } from "react-router-dom";
import { useState } from "react";
import LandingShell from "../../components/landing/LandingShell";

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <LandingShell>
      <section className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2.5rem] border border-slate-200/80 bg-white/90 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Contact</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Talk to the Qring team</h1>
            <p className="mt-4 text-sm text-slate-600 sm:text-base dark:text-slate-300">
              Reach out for deployment planning, onboarding, or custom estate pricing.
            </p>
            <div className="mt-6 grid gap-3">
              <InfoRow label="General" value="hello@useqring.online" />
              <InfoRow label="Support" value="support@useqring.online" />
              <InfoRow label="Sales" value="sales@useqring.online" />
              <InfoRow label="Response time" value="Within 1 business day" />
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-slate-200/80 bg-white/90 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
            <h2 className="text-2xl font-black">Send a message</h2>
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
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>

              {sent ? (
                <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/30 dark:text-emerald-200">
                  Message received. We will contact you shortly.
                </p>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  Send Message
                </button>
                <Link
                  to="/"
                  className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                >
                  Back Home
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-12 w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-10">
        <div className="rounded-[2.5rem] bg-slate-900 p-8 text-white shadow-xl dark:bg-white dark:text-slate-900 sm:p-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black">Need a deployment walkthrough?</h2>
              <p className="mt-2 text-sm text-white/70 dark:text-slate-600">We can join your team for a tailored rollout plan.</p>
            </div>
            <Link to="/pricing" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 dark:bg-slate-900 dark:text-white">
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </LandingShell>
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
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950"
      />
    </label>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">{value}</p>
    </div>
  );
}
