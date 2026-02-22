import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell";
import { useAuth } from "../../state/AuthContext";
import {
  getBillingPlans,
  getMySubscription,
  initializePaystackPayment,
  listPaymentPurposes,
  requestSubscription
} from "../../services/paymentService";
import { getHomeownerContext } from "../../services/homeownerService";

export default function HomeownerPaywallPage() {
  const { user } = useAuth();
  const [purposes, setPurposes] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [submitting, setSubmitting] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [subscriptionData, purposeData, planData, context] = await Promise.all([
          getMySubscription(),
          listPaymentPurposes(),
          getBillingPlans(),
          user?.role === "homeowner" ? getHomeownerContext() : Promise.resolve(null)
        ]);
        if (!active) return;
        if (user?.role === "homeowner" && context?.managedByEstate) {
          navigate("/dashboard/homeowner/overview", { replace: true });
          return;
        }
        setSubscription(subscriptionData);
        setPurposes(purposeData);
        setPlans(planData);
      } catch (requestError) {
        if (!active) return;
        setError(requestError.message ?? "Failed to load billing data");
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [navigate, user?.role]);

  const activePlanName = useMemo(() => {
    if (!subscription?.plan) return "Free";
    const plan = plans.find((item) => item.id === subscription.plan);
    return plan?.name ?? subscription.plan;
  }, [plans, subscription]);

  const backPath = user?.role === "estate" ? "/dashboard/estate" : "/dashboard/homeowner/overview";
  const dashboardLabel = user?.role === "estate" ? "Estate Dashboard" : "Homeowner Dashboard";

  async function handleSelectPlan(plan) {
    setSubmitting(plan.id);
    setError("");
    setNotice("");

    try {
      if (plan.amount === 0) {
        const result = await requestSubscription(plan.id);
        setSubscription((prev) => ({
          ...(prev ?? {}),
          ...result,
          limits: {
            maxDoors: plan.maxDoors,
            maxQrCodes: plan.maxQrCodes
          }
        }));
        setNotice(
          `Free plan activated. You can manage up to ${plan.maxDoors} door${plan.maxDoors === 1 ? "" : "s"} and ${plan.maxQrCodes} QR code${plan.maxQrCodes === 1 ? "" : "s"}.`
        );
      } else {
        const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
        const callbackUrl = !isLocalHost && window.location.protocol === "https:"
          ? `${window.location.origin}/billing/callback`
          : undefined;
        const initialized = await initializePaystackPayment(plan.id, callbackUrl, billingCycle);
        if (!initialized?.authorization_url) {
          throw new Error("Unable to start Paystack checkout");
        }
        window.location.href = initialized.authorization_url;
      }
    } catch (requestError) {
      setError(requestError.message ?? "Failed to process plan request");
    } finally {
      setSubmitting("");
    }
  }

  return (
    <AppShell title="Billing & Subscription">
      {error ? (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="mb-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {notice}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 sm:p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl font-bold">Current Plan</h2>
            <p className="mt-1 text-sm text-slate-500">{activePlanName}</p>
            {subscription?.limits ? (
            <p className="mt-1 text-xs text-slate-500">
              Limit: {subscription.limits.maxDoors} door(s), {subscription.limits.maxQrCodes} QR code(s)
            </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Back to {dashboardLabel}
          </button>
        </div>
        <div className="mt-4 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              billingCycle === "monthly" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-600 dark:text-slate-300"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              billingCycle === "yearly" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-600 dark:text-slate-300"
            }`}
          >
            Yearly
          </button>
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className="rounded-2xl border border-slate-200 bg-white/90 p-4 sm:p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900/80"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{plan.name}</p>
            <p className="mt-2 text-2xl font-bold">
              {formatMoney(resolvePlanAmount(plan, billingCycle), plan.currency)}
              <span className="ml-1 text-sm font-medium text-slate-500">/{billingCycle === "yearly" ? "year" : "month"}</span>
            </p>
            <p className="text-xs text-slate-500">{(plan.currency || "NGN").toUpperCase()}</p>
            <p className="mt-2 text-sm text-slate-500">Up to {plan.maxDoors} doors</p>
            <p className="text-sm text-slate-500">Up to {plan.maxQrCodes} QR codes</p>

            <button
              type="button"
              disabled={submitting === plan.id || subscription?.plan === plan.id}
              onClick={() => handleSelectPlan(plan)}
              className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              {subscription?.plan === plan.id
                ? "Current plan"
                : submitting === plan.id
                  ? "Processing..."
                  : plan.amount === 0
                    ? "Activate free"
                    : `Pay with Paystack (${billingCycle === "yearly" ? "Yearly" : "Monthly"})`}
            </button>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900/80">
        <h3 className="font-heading text-lg font-bold">Manual Payment Instructions</h3>
        {purposes.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No manual payment account configured.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {purposes.map((purpose) => (
              <div
                key={purpose.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
              >
                <p className="text-sm font-semibold">{purpose.name}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{purpose.description}</p>
                <p className="mt-2 text-xs font-medium text-slate-500">{purpose.accountInfo}</p>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs text-slate-500">
          Need help? <Link to="/contact" className="font-semibold text-brand-600 dark:text-brand-300">Contact support</Link>.
        </p>
      </section>
    </AppShell>
  );
}

function formatMoney(amount, currency = "NGN") {
  const safeAmount = Number(amount || 0);
  const safeCurrency = String(currency || "NGN").toUpperCase();
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: 0,
    }).format(safeAmount);
  } catch {
    return `${safeCurrency} ${safeAmount.toLocaleString("en-US")}`;
  }
}

function resolvePlanAmount(plan, cycle) {
  const base = Number(plan?.amount || 0);
  return cycle === "yearly" ? base * 12 : base;
}

