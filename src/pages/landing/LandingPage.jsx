import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import LandingShell from "../../components/landing/LandingShell";

const testimonials = [
  {
    name: "Chukwudi Okafor",
    role: "Homeowner, Abuja",
    quote: "Approvals are instant now. I see who is at the gate and respond in seconds."
  },
  {
    name: "Aisha Mohammed",
    role: "Estate Manager, Lekki",
    quote: "We went from manual logs to realtime visibility. Our team finally has control."
  },
  {
    name: "Tunde Alabi",
    role: "Facility Lead, Ibadan",
    quote: "Qring unified access, messaging, and incident logs in one dashboard."
  }
];

const featureCards = [
  {
    title: "Realtime access control",
    body: "Approve, deny, or redirect visitors instantly with a full session timeline."
  },
  {
    title: "QR-first entry",
    body: "Every door gets a secure QR entry point. No app installs for visitors."
  },
  {
    title: "Smart routing",
    body: "Route by door, resident, or block with granular access windows."
  },
  {
    title: "Incident-ready logs",
    body: "Audit trails, approvals, and media are stored with every visitor record."
  },
  {
    title: "Estate operations",
    body: "Broadcasts, polls, dues, and maintenance in the same control center."
  },
  {
    title: "Privacy-first",
    body: "Encrypted sessions and scoped permissions protect every interaction."
  }
];

const workflow = [
  {
    number: "01",
    title: "Visitor scans",
    description: "Scan a QR at the gate to create a request with context."
  },
  {
    number: "02",
    title: "System verifies",
    description: "Qring validates the entry route and notifies the right resident."
  },
  {
    number: "03",
    title: "Approval in seconds",
    description: "Homeowner approves, denies, or reroutes the visitor instantly."
  },
  {
    number: "04",
    title: "Session recorded",
    description: "Every action is logged for security and audit readiness."
  }
];

export default function LandingPage() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const testimonial = testimonials[currentTestimonial];

  return (
    <LandingShell>
      <section className="mx-auto w-full max-w-7xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-10 lg:pt-24">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:border-slate-800 dark:bg-slate-950">
              Smart Access for Modern Estates
            </div>
            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Access control that feels modern, fast, and human.
            </h1>
            <p className="max-w-xl text-base text-slate-600 sm:text-lg dark:text-slate-300">
              Qring replaces legacy doorbells with QR-based entry, realtime approvals, and secure estate-wide operations.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Start Free Trial
              </Link>
              <Link
                to="/contact"
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                Request a Demo
              </Link>
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
              <span className="rounded-full border border-slate-200 px-3 py-1 dark:border-slate-800">99.9% uptime</span>
              <span className="rounded-full border border-slate-200 px-3 py-1 dark:border-slate-800">Sub-second alerts</span>
              <span className="rounded-full border border-slate-200 px-3 py-1 dark:border-slate-800">24/7 support</span>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -left-6 -top-6 h-28 w-28 rounded-full bg-emerald-200/60 blur-3xl" />
            <div className="rounded-[2.5rem] border border-slate-200/80 bg-white/90 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Live Snapshot</p>
              <h2 className="mt-4 text-2xl font-black">Estate control room</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                One dashboard to manage doors, residents, dues, maintenance, and visitor flow.
              </p>
              <div className="mt-6 grid gap-3">
                {[
                  "Realtime visitor approvals",
                  "Broadcasts + polls",
                  "Maintenance and dues tracking"
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-16 w-full max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="grid gap-6 rounded-[2.5rem] border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 sm:p-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Why Qring</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Everything you need to run a modern estate.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-16 w-full max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2.5rem] border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">How it works</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Clear steps, secure outcomes.</h2>
            <div className="mt-6 space-y-4">
              {workflow.map((step) => (
                <div key={step.number} className="flex gap-4">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-sm font-bold text-white dark:bg-white dark:text-slate-900">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">{step.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[2.5rem] border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Teams love Qring</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Built for estates, loved by homeowners.</h2>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              <p className="text-base font-semibold">"{testimonial.quote}"</p>
              <p className="mt-3 text-xs uppercase tracking-[0.3em] text-slate-500">{testimonial.name}</p>
              <p className="text-xs text-slate-500">{testimonial.role}</p>
            </div>
            <div className="mt-4 flex gap-2">
              {testimonials.map((_, idx) => (
                <span
                  key={`testimonial-dot-${idx}`}
                  className={`h-2 w-2 rounded-full ${
                    idx === currentTestimonial ? "bg-slate-900 dark:bg-white" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-16 w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-10">
        <div className="rounded-[2.5rem] bg-slate-900 p-8 text-white shadow-xl dark:bg-white dark:text-slate-900 sm:p-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60 dark:text-slate-500">
                Ready to modernize access?
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Start with a free estate trial today.
              </h2>
              <p className="mt-2 text-sm text-white/70 dark:text-slate-600">
                Deploy in days, not months. Bring your teams and residents onboard smoothly.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
              >
                Start Free Trial
              </Link>
              <Link
                to="/contact"
                className="rounded-full border border-white/70 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 dark:border-slate-900 dark:text-slate-900"
              >
                Talk to Sales
              </Link>
            </div>
          </div>
        </div>
      </section>
    </LandingShell>
  );
}
