import { Link } from "react-router-dom";
import LandingShell from "../../components/landing/LandingShell";

const modules = [
  {
    title: "QR Entry",
    body: "Visitors scan a QR code to start a verified access request."
  },
  {
    title: "Realtime Sessions",
    body: "Instant alerts with chat, call, or video when needed."
  },
  {
    title: "Smart Routing",
    body: "Route by door, block, or resident with custom rules."
  },
  {
    title: "Estate Operations",
    body: "Broadcasts, dues, maintenance, polls, and resident coordination."
  },
  {
    title: "Audit + Analytics",
    body: "Every action logged for compliance and performance reporting."
  },
  {
    title: "Access Governance",
    body: "Role-based permissions with scoped visibility."
  }
];

const steps = [
  {
    number: "01",
    title: "Create door routes",
    description: "Assign QR codes to gates, lobbies, or units."
  },
  {
    number: "02",
    title: "Invite residents",
    description: "Homeowners approve or deny visits from any device."
  },
  {
    number: "03",
    title: "Activate estate ops",
    description: "Manage dues, polls, and maintenance from one dashboard."
  }
];

export default function PlatformPage() {
  return (
    <LandingShell>
      <section className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-10">
        <div className="rounded-[2.5rem] border border-slate-200/80 bg-white/90 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Platform</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Access control, modernized.</h1>
          <p className="mt-4 max-w-2xl text-sm text-slate-600 sm:text-base dark:text-slate-300">
            Qring brings visitor verification, estate operations, and analytics into one coherent control center.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-4 sm:px-6 lg:px-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((item) => (
            <div key={item.title} className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h3 className="text-lg font-bold">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-12 w-full max-w-6xl px-4 sm:px-6 lg:px-10">
        <div className="rounded-[2.5rem] border border-slate-200/80 bg-white/90 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <h2 className="text-2xl font-black">How teams deploy Qring</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{step.number}</p>
                <h3 className="mt-2 text-sm font-bold">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{step.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/pricing" className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">
              View Pricing
            </Link>
            <Link to="/contact" className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-200">
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-12 w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-10">
        <div className="rounded-[2.5rem] bg-slate-900 p-8 text-white shadow-xl dark:bg-white dark:text-slate-900 sm:p-10">
          <h2 className="text-2xl font-black">See Qring in action</h2>
          <p className="mt-2 text-sm text-white/70 dark:text-slate-600">Book a walkthrough tailored to your estate configuration.</p>
          <Link to="/request-demo" className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 dark:bg-slate-900 dark:text-white">
            Request Demo
          </Link>
        </div>
      </section>
    </LandingShell>
  );
}
