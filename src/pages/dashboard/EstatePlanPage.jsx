import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell";
import { getEstatePlanRestrictions } from "../../services/estateService";
import PageSkeleton from "../../components/PageSkeleton";
import { showError } from "../../utils/flash";

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
  
  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  const doorPercent = plan?.maxDoors ? Math.min(Math.round((plan.usedDoors / plan.maxDoors) * 100), 100) : 0;
  const qrPercent = plan?.maxQrCodes ? Math.min(Math.round((plan.usedQrCodes / plan.maxQrCodes) * 100), 100) : 0;

  return (
    <AppShell title="Plan Restrictions">
      <div className="mx-auto max-w-7xl space-y-6">

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
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Plan: {plan.planName || plan.plan}</p>
                    <p className="text-xs text-slate-500">Status: {plan.status} · Payment: {plan.paymentStatus}</p>
                    {plan.expiresAt ? <p className="mt-1 text-xs text-slate-500">Expires: {new Date(plan.expiresAt).toLocaleString()}</p> : null}
                    {plan.trialDaysRemaining > 0 ? (
                      <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-300">
                        Trial ends in {plan.trialDaysRemaining} day{plan.trialDaysRemaining === 1 ? "" : "s"}.
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>Admins: {plan.maxAdmins || 1}</p>
                    <p>Doors left: {plan.remainingDoors}</p>
                    <p>QR left: {plan.remainingQrCodes}</p>
                  </div>
                </div>
              </div>
              <UsageBar label={`Doors ${plan.usedDoors}/${plan.maxDoors}`} percent={doorPercent} />
              <UsageBar label={`QR Codes ${plan.usedQrCodes}/${plan.maxQrCodes}`} percent={qrPercent} />
              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Enabled Features</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(plan.features || []).map((feature) => (
                      <span key={feature} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-slate-900 dark:text-emerald-300">
                        {formatFeatureLabel(feature)}
                      </span>
                    ))}
                  </div>
                </section>
                <section className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-900/30 dark:bg-rose-950/20">
                  <p className="text-xs font-bold uppercase tracking-wide text-rose-700 dark:text-rose-300">Restricted Features</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(plan.restrictions || []).map((feature) => (
                      <span key={feature} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-slate-900 dark:text-rose-300">
                        {formatFeatureLabel(feature)}
                      </span>
                    ))}
                  </div>
                </section>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Need more capacity or premium controls?</p>
                  <p className="text-xs text-slate-500">Upgrade to unlock scheduling, analytics, advanced audits, and more doors.</p>
                </div>
                <Link to="/billing/paywall" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">
                  Upgrade Plan
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Loading restrictions...</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function formatFeatureLabel(value) {
  return String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
