import { useEffect, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { getEstatePlanRestrictions } from "../../services/estateService";
import PageSkeleton from "../../components/PageSkeleton";

export default function EstatePlanPage() {
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getEstatePlanRestrictions();
        if (!mounted) return;
        setPlan(data);
      } catch (requestError) {
        if (!mounted) return;
        setError(requestError.message ?? "Failed to load plan restrictions");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const doorPercent = plan?.maxDoors ? Math.min(Math.round((plan.usedDoors / plan.maxDoors) * 100), 100) : 0;
  const qrPercent = plan?.maxQrCodes ? Math.min(Math.round((plan.usedQrCodes / plan.maxQrCodes) * 100), 100) : 0;

  return (
    <AppShell title="Plan Restrictions">
      <div className="mx-auto max-w-7xl space-y-6">
        {error ? <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/20 dark:bg-red-900/10 dark:text-red-400">{error}</div> : null}

        <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 text-white dark:bg-indigo-600">
          <div className="relative z-10">
            <h2 style={{color: "white"}} className="text-2xl font-bold tracking-tight">Plan Restrictions</h2>
            <p className="mt-2 text-sm text-slate-200 dark:text-indigo-100">Monitor plan capacity and stay ahead of usage limits.</p>
          </div>
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        </section>

        <section className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/90 sm:p-6">
          {loading ? (
            <PageSkeleton blocks={2} />
          ) : plan ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                <p className="text-sm font-semibold">Plan: {plan.plan}</p>
                <p className="text-xs text-slate-500">Status: {plan.status}</p>
              </div>
              <UsageBar label={`Doors ${plan.usedDoors}/${plan.maxDoors}`} percent={doorPercent} />
              <UsageBar label={`QR Codes ${plan.usedQrCodes}/${plan.maxQrCodes}`} percent={qrPercent} />
            </div>
          ) : (
            <p className="text-sm text-slate-500">Loading restrictions...</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function UsageBar({ label, percent }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700">
        <div className="h-2 rounded-full bg-indigo-600 dark:bg-indigo-300" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
