import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell";
import { getEstateOverview } from "../../services/estateService";

const modules = [
  {
    title: "Create Estate",
    description: "Set up a new estate profile before adding homes and access doors."
  },
  {
    title: "Add Doors",
    description: "Register entry points so each door can be mapped and monitored."
  },
  {
    title: "Assign Doors To Homeowners",
    description: "Link doors to responsible homeowners for approvals and notifications."
  },
  {
    title: "Invite Homeowners",
    description: "Send access invites so residents can sign in and control their doors."
  },
  {
    title: "Manage Door Mappings",
    description: "Review and adjust door-to-homeowner mappings at any time."
  },
  {
    title: "View Access Logs",
    description: "Track entry attempts and approvals for audit and security review."
  },
  {
    title: "Plan Restrictions",
    description: "See usage limits and plan-based restrictions for estate operations."
  },
  {
    title: "Multi-Home Support",
    description: "Handle multiple homes under one estate workspace."
  }
];

export default function EstateDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await getEstateOverview();
        if (!mounted) return;
        setOverview(data);
      } catch (requestError) {
        if (!mounted) return;
        setError(requestError.message ?? "Failed to load estate data");
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const counts = {
    estates: overview?.estates?.length ?? 0,
    homes: overview?.homes?.length ?? 0,
    doors: overview?.doors?.length ?? 0,
    homeowners: overview?.homeowners?.length ?? 0
  };

  return (
    <AppShell title="Estate Overview">
      {error ? <Alert tone="danger" message={error} /> : null}

      <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Estates" tip="Total estate profiles currently configured." value={counts.estates} />
        <MetricCard label="Homes" tip="Number of homes across your estate setup." value={counts.homes} />
        <MetricCard label="Doors" tip="Registered access doors managed from this account." value={counts.doors} />
        <MetricCard
          label="Homeowners"
          tip="Residents linked to doors and available for approvals."
          value={counts.homeowners}
        />
      </section>

      <section className="mb-4 rounded-2xl border border-brand-100 bg-brand-50/70 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-base font-bold">How to use estate dashboard</h2>
          <HelpTip text="Use this as your control center: configure estate structure, then manage residents and logs." />
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Start with create estate and add doors, then assign homeowners and monitor access logs daily.
        </p>
      </section>

      <section className="mb-4">
        <Link
          to="/dashboard/estate/create"
          className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
        >
          Create an Estate
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((item) => (
          <article
            key={item.title}
            className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900/70"
          >
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-lg font-bold">{item.title}</h2>
              <HelpTip text={item.description} />
            </div>
            <p className="mt-2 text-sm text-slate-500">{item.description}</p>
          </article>
        ))}
      </section>

      <section className="mt-4">
        <article className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-bold sm:text-xl">Billing & Subscription</h2>
              <p className="mt-1 text-sm text-slate-500">Manage estate plan limits and complete payments via Paystack.</p>
            </div>
            <Link
              to="/billing/paywall"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
            >
              Open Billing
            </Link>
          </div>
        </article>
      </section>
    </AppShell>
  );
}

function MetricCard({ label, tip, value }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <HelpTip text={tip} />
      </div>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </article>
  );
}

function Alert({ tone, message }) {
  const toneClass = tone === "danger" ? "border-danger/30 bg-danger/10 text-danger" : "border-brand-200 bg-brand-50 text-brand-700";
  return <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${toneClass}`}>{message}</div>;
}

function HelpTip({ text }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        className="grid h-5 w-5 place-items-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-100"
        aria-label="More information"
      >
        ?
      </button>
      <span className="pointer-events-none absolute left-1/2 top-7 z-10 hidden w-56 -translate-x-1/2 rounded-lg bg-slate-900 px-2 py-1 text-xs text-white shadow-lg group-hover:block group-focus-within:block">
        {text}
      </span>
    </span>
  );
}
