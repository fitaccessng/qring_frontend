import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell";
import MobileBottomSheet from "../../components/mobile/MobileBottomSheet";
import { useAuth } from "../../state/AuthContext";
import {
  getBillingPlans,
  getMySubscription,
  initializePaystackPayment,
  listPaymentPurposes,
  requestSubscription
} from "../../services/paymentService";
import { getHomeownerContext } from "../../services/homeownerService";
import { showError, showSuccess } from "../../utils/flash";

const PLAN_FEATURES = {
  estate_starter: [
    "Up to 3 doors",
    "Trial only - 30 days"
  ],
  estate_basic: [
    "Realtime alerts",
    "Visitor logs",
    "Resident management",
    "Mobile dashboard"
  ],
  estate_growth: [
    "Chat + call access",
    "Multi-admin roles",
    "Visitor scheduling",
    "Access windows",
    "Analytics"
  ],
  estate_pro: [
    "Advanced analytics",
    "Security audit logs",
    "Multi-location control",
    "Role permissions",
    "Priority support"
  ],
  estate_enterprise: [
    "Unlimited doors",
    "SLA + API access",
    "Custom annual contract"
  ],
  free: [
    "1 door",
    "Basic notifications",
    "Limited logs"
  ],
  home_pro: [
    "Chat + call verification",
    "Visitor history",
    "Visitor scheduling",
    "Advanced notifications"
  ],
  home_premium: [
    "Multiple doors",
    "Access time windows",
    "Priority support",
    "Advanced privacy controls"
  ]
};

const PLAN_ORDER = [
  "estate_starter",
  "estate_basic",
  "estate_growth",
  "estate_pro",
  "estate_enterprise",
  "free",
  "home_pro",
  "home_premium"
];

export default function HomeownerPaywallPage() {
  const { user } = useAuth();
  const [purposes, setPurposes] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [submitting, setSubmitting] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [error, setError] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [confirmCheckoutOpen, setConfirmCheckoutOpen] = useState(false);
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
  
  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  const activePlanName = useMemo(() => {
    if (!subscription?.plan) return "Free";
    const plan = plans.find((item) => item.id === subscription.plan);
    return plan?.name ?? subscription.plan;
  }, [plans, subscription]);

  const visiblePlans = useMemo(() => {
    const audience = user?.role === "estate" ? "estate" : "homeowner";
    return plans
      .filter((plan) => !plan.hidden)
      .filter((plan) => (plan.audience || "homeowner") === audience)
      .sort((a, b) => PLAN_ORDER.indexOf(a.id) - PLAN_ORDER.indexOf(b.id));
  }, [plans, user?.role]);

  const backPath = user?.role === "estate" ? "/dashboard/estate" : "/dashboard/homeowner/overview";
  const dashboardLabel = user?.role === "estate" ? "Estate Dashboard" : "Homeowner Dashboard";

  async function handleSelectPlan(plan) {
    setSubmitting(plan.id);
    setError("");

    try {
      if (!plan.selfServe) {
        navigate("/contact");
        return;
      }
      if (plan.amount === 0) {
        await requestSubscription(plan.id);
        const refreshed = await getMySubscription();
        setSubscription(refreshed);
        showSuccess(
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
        setCheckoutUrl(initialized.authorization_url);
        setConfirmCheckoutOpen(true);
      }
    } catch (requestError) {
      setError(requestError.message ?? "Failed to process plan request");
    } finally {
      setSubmitting("");
    }
  }

  function confirmCheckoutRedirect() {
    if (!checkoutUrl) return;
    const target = checkoutUrl;
    setCheckoutUrl("");
    setConfirmCheckoutOpen(false);
    window.location.href = target;
  }

  return (
    <AppShell >

      <section className="rounded-3xl border border-slate-200 bg-white/95 p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl font-bold">Current Plan</h2>
            <p className="mt-1 text-sm text-slate-500">{subscription?.planName || activePlanName}</p>
            {subscription?.limits ? (
            <p className="mt-1 text-xs text-slate-500">
              Limit: {subscription.limits.maxDoors} door(s), {subscription.limits.maxQrCodes} QR code(s), {subscription.limits.maxAdmins ?? 1} admin(s)
            </p>
            ) : null}
            {subscription?.expiresAt ? <p className="mt-1 text-xs text-slate-500">Expires: {new Date(subscription.expiresAt).toLocaleString()}</p> : null}
            {subscription?.trialDaysRemaining > 0 ? (
              <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-300">
                Trial ends in {subscription.trialDaysRemaining} day{subscription.trialDaysRemaining === 1 ? "" : "s"}.
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
        {visiblePlans.map((plan) => (
          <article
            key={plan.id}
            className="rounded-3xl border border-slate-200 bg-white/95 p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{plan.name}</p>
            <p className="mt-2 text-2xl font-bold">
              {!plan.selfServe
                ? "Custom"
                : formatMoney(resolvePlanAmount(plan, billingCycle), plan.currency)}
              <span className="ml-1 text-sm font-medium text-slate-500">
                {!plan.selfServe ? "annual contract" : `/${billingCycle === "yearly" ? "year" : "month"}`}
              </span>
            </p>
            <p className="text-xs text-slate-500">{(plan.currency || "NGN").toUpperCase()}</p>
            <p className="mt-2 text-sm text-slate-500">Up to {plan.maxDoors} doors</p>
            <p className="text-sm text-slate-500">Up to {plan.maxQrCodes} QR codes</p>
            {plan.trialDays ? (
              <p className="mt-1 text-xs font-medium text-brand-700 dark:text-brand-300">Trial only - {plan.trialDays} days</p>
            ) : null}
            {plan.description ? <p className="mt-1 text-xs text-slate-500">{plan.description}</p> : null}
            {Array.isArray(PLAN_FEATURES[plan.id]) ? (
              <ul className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                {PLAN_FEATURES[plan.id].map((feature) => (
                  <li key={feature}>- {feature}</li>
                ))}
              </ul>
            ) : null}
            {Array.isArray(plan?.restrictions) && plan.restrictions.length > 0 ? (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/30 dark:bg-rose-900/20 dark:text-rose-300">
                Restricted: {plan.restrictions.map(formatFeatureLabel).join(", ")}
              </div>
            ) : null}

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
                  : !plan.selfServe
                    ? "Contact sales"
                    : plan.amount === 0
                    ? "Activate free"
                    : `Pay with Paystack (${billingCycle === "yearly" ? "Yearly" : "Monthly"})`}
            </button>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
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

      <ConfirmLeaveModal
        open={confirmCheckoutOpen}
        title="Continue to Paystack?"
        message="You are about to leave Qring and continue payment in an external checkout page."
        onClose={() => setConfirmCheckoutOpen(false)}
        onConfirm={confirmCheckoutRedirect}
      />
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

function ConfirmLeaveModal({ open, title, message, onClose, onConfirm }) {
  if (!open) return null;
  return (
    <MobileBottomSheet open={open} title={title} onClose={onClose} width="560px" height="46dvh">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
        <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-700"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
          >
            Continue
          </button>
        </div>
      </div>
    </MobileBottomSheet>
  );
}
