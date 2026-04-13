import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Crown, DoorClosed, Home, QrCode } from "lucide-react";
import AppShell from "../../layouts/AppShell";
import { getEstatePlanRestrictions, getEstatePlanRestrictionsSnapshot } from "../../services/estateService";
import PageSkeleton from "../../components/PageSkeleton";
import { showError } from "../../utils/flash";
import EstateManagerPageShell, {
  EstateBadge,
  EstateInfoTile,
  EstateManagerSection,
  EstateMetricStrip
} from "../../components/mobile/EstateManagerPageShell";

export default function EstatePlanPage() {
  const [plan, setPlan] = useState(() => getEstatePlanRestrictionsSnapshot());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(() => !getEstatePlanRestrictionsSnapshot());

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

  const estatePercent = plan?.maxEstates ? Math.min(Math.round((plan.usedEstates / plan.maxEstates) * 100), 100) : 0;
  const homePercent = plan?.maxHomes ? Math.min(Math.round((plan.usedHomes / plan.maxHomes) * 100), 100) : 0;
  const doorPercent = plan?.maxDoors ? Math.min(Math.round((plan.usedDoors / plan.maxDoors) * 100), 100) : 0;
  const qrPercent = plan?.maxQrCodes ? Math.min(Math.round((plan.usedQrCodes / plan.maxQrCodes) * 100), 100) : 0;
  const featureCount = useMemo(() => (plan?.features || []).length, [plan]);

  return (
    <AppShell title="Plan Restrictions">
      <EstateManagerPageShell
        eyebrow="Subscription"
        title="Plan Limits"
        description="Monitor plan capacity and stay ahead of usage limits."
        stats={[
          { label: "Estates", value: plan ? `${plan.usedEstates}/${plan.maxEstates || "∞"}` : "-", helper: "Portfolio usage" },
          { label: "Homes", value: plan ? `${plan.usedHomes}/${plan.maxHomes || "∞"}` : "-", helper: "Unit usage" },
          { label: "Doors", value: plan ? `${plan.usedDoors}/${plan.maxDoors}` : "-", helper: "Current usage" },
          { label: "QR Codes", value: plan ? `${plan.usedQrCodes}/${plan.maxQrCodes}` : "-", helper: "Current usage" }
        ]}
      >
        <EstateMetricStrip
          items={[
            { label: "Plan", value: plan?.planName || plan?.plan || "-", helper: "Current estate tier" },
            { label: "Estates", value: plan ? `${plan.usedEstates}/${plan.maxEstates || "∞"}` : "-", helper: `${estatePercent}% used` },
            { label: "Homes", value: plan ? `${plan.usedHomes}/${plan.maxHomes || "∞"}` : "-", helper: `${homePercent}% used` },
            { label: "Doors", value: plan ? `${plan.usedDoors}/${plan.maxDoors}` : "-", helper: `${doorPercent}% used` },
            { label: "QR", value: plan ? `${plan.usedQrCodes}/${plan.maxQrCodes}` : "-", helper: `${qrPercent}% used` }
          ]}
        />

        <EstateManagerSection title="Current plan" subtitle="An upgraded mobile-first plan card with clear capacity signals.">
          {loading ? (
            <PageSkeleton blocks={2} />
          ) : plan ? (
            <div className="space-y-4">
              <div className="rounded-[2rem] bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] p-5 text-white shadow-[0_18px_40px_rgba(0,52,111,0.2)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <EstateBadge tone="blue">Subscription</EstateBadge>
                    <p className="mt-3 font-heading text-2xl font-extrabold tracking-tight text-white">Plan: {plan.planName || plan.plan}</p>
                    <p className="text-xs text-blue-100">Status: {plan.status} · Payment: {plan.paymentStatus}</p>
                    {plan.expiresAt ? <p className="mt-1 text-xs text-blue-100">Expires: {new Date(plan.expiresAt).toLocaleString()}</p> : null}
                    {plan.trialDaysRemaining > 0 ? (
                      <p className="mt-2 text-xs font-medium text-amber-100">
                        Trial ends in {plan.trialDaysRemaining} day{plan.trialDaysRemaining === 1 ? "" : "s"}.
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right text-xs text-blue-100">
                    <p>Admins: {plan.maxAdmins || 1}</p>
                    <p>Estates left: {plan.remainingEstates}</p>
                    <p>Homes left: {plan.remainingHomes}</p>
                    <p>Doors left: {plan.remainingDoors}</p>
                    <p>QR left: {plan.remainingQrCodes}</p>
                  </div>
                </div>
              </div>

              <UsageBar label={`Estates ${plan.usedEstates}/${plan.maxEstates || "∞"}`} percent={estatePercent} />
              <UsageBar label={`Homes ${plan.usedHomes}/${plan.maxHomes || "∞"}`} percent={homePercent} />
              <UsageBar label={`Doors ${plan.usedDoors}/${plan.maxDoors}`} percent={doorPercent} />
              <UsageBar label={`QR Codes ${plan.usedQrCodes}/${plan.maxQrCodes}`} percent={qrPercent} />

              <div className="grid gap-3 sm:grid-cols-4">
                <EstateInfoTile icon={<Building2 className="h-5 w-5" />} label="Estate Usage" value={`${plan.usedEstates}`} detail={`Remaining ${plan.remainingEstates}`} />
                <EstateInfoTile icon={<Home className="h-5 w-5" />} label="Home Usage" value={`${plan.usedHomes}`} detail={`Remaining ${plan.remainingHomes}`} />
                <EstateInfoTile icon={<DoorClosed className="h-5 w-5" />} label="Door Usage" value={`${plan.usedDoors}`} detail={`Remaining ${plan.remainingDoors}`} />
                <EstateInfoTile icon={<QrCode className="h-5 w-5" />} label="QR Capacity" value={`${plan.usedQrCodes}`} detail={`Remaining ${plan.remainingQrCodes}`} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <EstateInfoTile icon={<Crown className="h-5 w-5" />} label="Admin Seats" value={`${plan.maxAdmins || 1}`} detail="Management access capacity" />
                <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Policy Snapshot</p>
                  <p className="mt-3 text-sm leading-relaxed text-amber-900">
                    Estate Starter now enforces one estate with up to three homes and three doors. Creation pages now follow the same backend rule.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Enabled Features</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(plan.features || []).map((feature) => (
                      <span key={feature} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
                        {formatFeatureLabel(feature)}
                      </span>
                    ))}
                  </div>
                </section>
                <section className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-rose-700">Restricted Features</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(plan.restrictions || []).map((feature) => (
                      <span key={feature} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-rose-700">
                        {formatFeatureLabel(feature)}
                      </span>
                    ))}
                  </div>
                </section>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Need more capacity or premium controls?</p>
                  <p className="text-xs text-slate-500">Upgrade to unlock scheduling, analytics, advanced audits, and more doors.</p>
                </div>
                <Link to="/billing/paywall" className="rounded-full bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(0,52,111,0.18)]">
                  Upgrade Plan
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Loading restrictions...</p>
          )}
        </EstateManagerSection>
      </EstateManagerPageShell>
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
      <div className="h-2 rounded-full bg-slate-200">
        <div className="h-2 rounded-full bg-[linear-gradient(135deg,#00346f_0%,#4f8cff_100%)]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
