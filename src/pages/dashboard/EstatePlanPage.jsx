import { useEffect, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { getEstatePlanRestrictions } from "../../services/estateService";

export default function EstatePlanPage() {
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await getEstatePlanRestrictions();
        if (!mounted) return;
        setPlan(data);
      } catch (requestError) {
        if (!mounted) return;
        setError(requestError.message ?? "Failed to load plan restrictions");
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
      {error ? <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
      <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80 sm:p-5">
        <h2 className="font-heading text-lg font-bold sm:text-xl">Plan Restrictions</h2>
        <p className="mt-1 text-sm text-slate-500">Built for multi-home estates with central control and audit-ready workflows.</p>
        {plan ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-sm font-semibold">Plan: {plan.plan}</p>
              <p className="text-xs text-slate-500">Status: {plan.status}</p>
            </div>
            <UsageBar label={`Doors ${plan.usedDoors}/${plan.maxDoors}`} percent={doorPercent} />
            <UsageBar label={`QR Codes ${plan.usedQrCodes}/${plan.maxQrCodes}`} percent={qrPercent} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Loading restrictions...</p>
        )}
      </section>
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
        <div className="h-2 rounded-full bg-slate-900 dark:bg-slate-100" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
