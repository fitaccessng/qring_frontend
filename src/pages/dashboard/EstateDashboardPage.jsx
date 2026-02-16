import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell";
import { getEstateOverview } from "../../services/estateService";

const modules = [
  "Create Estate",
  "Add Doors",
  "Assign Doors To Homeowners",
  "Invite Homeowners",
  "Manage Door Mappings",
  "View Access Logs",
  "Plan Restrictions",
  "Multi-Home Support"
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
        <MetricCard label="Estates" value={counts.estates} />
        <MetricCard label="Homes" value={counts.homes} />
        <MetricCard label="Doors" value={counts.doors} />
        <MetricCard label="Homeowners" value={counts.homeowners} />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((item) => (
          <article
            key={item}
            className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900/70"
          >
            <h2 className="font-heading text-lg font-bold">{item}</h2>
            <p className="mt-2 text-sm text-slate-500">
              Built for multi-home estates with central control and audit-ready workflows.
            </p>
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

function MetricCard({ label, value }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </article>
  );
}

function Alert({ tone, message }) {
  const toneClass = tone === "danger" ? "border-danger/30 bg-danger/10 text-danger" : "border-brand-200 bg-brand-50 text-brand-700";
  return <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${toneClass}`}>{message}</div>;
}
