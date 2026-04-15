import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  BrainCircuit,
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  History,
  LayoutGrid,
  User,
  XCircle,
  Zap,
  CalendarDays,
  MessageSquare
} from "lucide-react";
import { initializePaystackPayment, getBillingPlans, getMySubscription, getReferralSummary, requestSubscription } from "../../services/paymentService";
import { getResidentContext } from "../../services/residentService";
import { useAuth } from "../../state/AuthContext";
import { useNotifications } from "../../state/NotificationsContext";
import { env } from "../../config/env";
import { showError, showSuccess } from "../../utils/flash";
import { openPlanLockedModal } from "../../utils/blocking";

export default function ResidentSubscriptionCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [busyPlanId, setBusyPlanId] = useState("");
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [referral, setReferral] = useState(null);
  const [managedContext, setManagedContext] = useState({ managedByEstate: false, estateName: "" });

  const firstName = user?.fullName?.split(" ")[0] || user?.email || "User";
  const isFetching = loading;
  const audience = String(user?.role || "resident").toLowerCase() === "estate" ? "estate" : "resident";
  const isEstateAudience = audience === "estate";

  useEffect(() => {
    let active = true;
    async function loadContext() {
      if (user?.role !== "resident") return;
      try {
        const data = await getResidentContext();
        if (!active) return;
        setManagedContext(data ?? { managedByEstate: false, estateName: "" });
      } catch {
        if (!active) return;
        setManagedContext({ managedByEstate: false, estateName: "" });
      }
    }
    loadContext();
    return () => {
      active = false;
    };
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== "homeowner") return;
    if (!managedContext?.managedByEstate) return;
    openPlanLockedModal({
      managedByEstate: true,
      estateName: managedContext?.estateName || "",
      featureLabel: "Billing"
    });
    navigate("/dashboard/homeowner/overview", { replace: true });
  }, [managedContext?.estateName, managedContext?.managedByEstate, navigate, user?.role]);

  useEffect(() => {
    let active = true;

    async function loadBillingData() {
      setLoading(true);
      try {
        const [subscriptionData, planRows, referralData] = await Promise.all([
          getMySubscription(),
          getBillingPlans(),
          getReferralSummary()
        ]);
        if (!active) return;
        setSubscription(subscriptionData || null);
        setPlans((Array.isArray(planRows) ? planRows : []).filter((plan) => String(plan.audience || "").toLowerCase() === audience));
        setReferral(referralData || null);
      } catch (error) {
        if (!active) return;
        showError(error?.message || "Failed to load subscription data.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadBillingData();
    return () => {
      active = false;
    };
  }, [audience]);

  const currentPlanId = String(subscription?.plan || "free");
  const currentPlan = useMemo(
    () => plans.find((plan) => String(plan.id) === currentPlanId) || null,
    [currentPlanId, plans]
  );
  
  const availablePlans = useMemo(() => {
    const rows = plans.length ? plans : fallbackFreePlan(subscription, audience);
    return rows.map((plan, index) => ({
      ...plan,
      current: String(plan.id) === currentPlanId,
      recommended: String(plan.id) === (isEstateAudience ? "estate_growth" : "home_pro"),
      primary: String(plan.id) === (isEstateAudience ? "estate_growth" : "home_pro"),
      ctaLabel: getPlanCtaLabel(plan.id)
    }));
  }, [currentPlanId, isEstateAudience, plans, subscription]);

  async function handleSelectPlan(plan) {
    if (!plan?.id || busyPlanId) return;
    if (String(plan.id) === currentPlanId) {
      showSuccess("You are already on this plan.");
      return;
    }

    setBusyPlanId(String(plan.id));
    try {
      if (Number(plan.amount || 0) <= 0) {
        await requestSubscription(plan.id);
        showSuccess(`${plan.name} activated.`);
        const latestSubscription = await getMySubscription();
        setSubscription(latestSubscription || null);
        return;
      }

      const callbackUrl = `${env.publicAppUrl.replace(/\/+$/, "")}/billing/callback`;
      const payment = await initializePaystackPayment(plan.id, callbackUrl, billingCycle);
      const authorizationUrl = payment?.authorizationUrl || payment?.authorization_url;
      if (!authorizationUrl) {
        throw new Error("Payment link was not returned.");
      }
      window.location.assign(authorizationUrl);
    } catch (error) {
      showError(error?.message || "Unable to continue with this plan.");
    } finally {
      setBusyPlanId("");
    }
  }

  if (user?.role === "homeowner" && managedContext?.managedByEstate) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans text-slate-900 antialiased flex flex-col">
      {/* HEADER WITH BACK BUTTON AND BILLING TITLE */}
      <header className="fixed top-0 w-full z-[100] bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center">
        <div className="max-w-5xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2.5 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
             
              <div>
                <h1 className="font-bold text-lg text-slate-900 leading-none">Billing</h1>
               
              </div>
            </div>
          </div>
          <Link to="/dashboard/notifications" className="relative p-2.5 bg-slate-50 text-slate-600 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-all">
            <Bell size={18} />
            {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
            )}
          </Link>
        </div>
      </header>

      <main className="flex-grow pt-28 pb-32 px-6 max-w-5xl mx-auto w-full">
        <div className="mb-12">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Manage Your Plan</h2>
          <p className="text-slate-500 font-medium">
            {isEstateAudience
              ? "View your live estate subscription, capacity, and upgrade options."
              : "View your live homeowner subscription, real plan limits, and upgrade options."}
          </p>
        </div>

        {/* Status Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="md:col-span-2 bg-indigo-600 rounded-[2rem] p-8 relative overflow-hidden text-white shadow-xl shadow-indigo-200">
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] font-black opacity-80">Current Subscription</span>
                <div className="flex items-baseline gap-3 mt-3">
                  <h3 className="text-5xl font-black tracking-tighter">{loading ? "..." : currentPlan?.name || subscription?.plan || "Free"}</h3>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase">{subscription?.status || "active"}</span>
                </div>
                <p className="mt-4 text-indigo-100 max-w-sm font-medium leading-relaxed">
                  {loading
                    ? "Loading your plan details..."
                    : isEstateAudience
                      ? `This plan supports up to ${subscription?.limits?.maxDoors ?? subscription?.maxDoors ?? 0} houses / doors and ${subscription?.limits?.maxQrCodes ?? subscription?.maxQrCodes ?? 0} QR code(s).`
                      : `This plan supports up to ${subscription?.limits?.maxDoors ?? subscription?.maxDoors ?? 0} door(s) and ${subscription?.limits?.maxQrCodes ?? subscription?.maxQrCodes ?? 0} QR code(s).`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const firstPaidPlan = availablePlans.find((plan) => !plan.current && Number(plan.amount || 0) > 0);
                  if (firstPaidPlan) handleSelectPlan(firstPaidPlan);
                }}
                className="mt-8 bg-white text-indigo-600 w-fit px-8 py-3.5 rounded-2xl font-bold text-sm active:scale-95 transition-all shadow-lg"
              >
                Upgrade Now
              </button>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
          </div>

          <div className="bg-white border border-slate-100 rounded-[2rem] p-8 flex flex-col justify-between shadow-sm">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400">Referrals</span>
              <h3 className="text-xl font-bold mt-2 text-slate-900">{loading ? "Loading..." : `${Number(referral?.totalReferrals || 0)} referral(s)`}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed font-medium">
                {loading ? "Fetching referral rewards..." : `Reward balance: ${formatCurrency(referral?.totalRewards || 0)}`}
              </p>
            </div>
            <button type="button" onClick={() => navigate("/dashboard/homeowner/settings")} className="flex items-center gap-2 text-indigo-600 font-black text-sm hover:translate-x-1 transition-transform mt-6">
              View Account <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <section className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-2xl font-black tracking-tight">Available Plans</h3>
            <div className="bg-slate-100 p-1.5 rounded-2xl flex w-fit self-start md:self-auto">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`${billingCycle === "monthly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"} px-5 py-2 rounded-xl text-xs font-black transition-all`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`${billingCycle === "yearly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"} px-5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2`}
              >
                Yearly
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {availablePlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-[2.5rem] p-8 border transition-all duration-300 ${
                  plan.primary ? "bg-white border-indigo-600 shadow-2xl shadow-indigo-100 scale-105 z-10" : "bg-white border-slate-100 hover:shadow-lg"
                }`}
              >
                {plan.recommended ? (
                  <span className="absolute top-6 right-8 bg-indigo-600 text-white text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-widest">
                    {isEstateAudience ? "Popular" : "Best Value"}
                  </span>
                ) : null}
                <div className="mb-8">
                  <h4 className="font-black text-xl mb-1">{plan.name}</h4>
                  {plan.description ? <p className="text-sm font-medium text-slate-500 mb-4 min-h-[2.5rem]">{plan.description}</p> : null}
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black tracking-tighter">{formatPlanAmount(plan, billingCycle)}</span>
                    <span className="text-slate-400 font-bold text-sm">/{billingCycle === "yearly" ? "year" : (plan.billingLabel || "month")}</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-10">
                  {buildPlanFeatures(plan, audience).map((feature) => (
                    <li key={`${plan.id}-${feature.text}`} className="flex items-center gap-3 text-sm font-medium text-slate-600">
                      {feature.included ? <CheckCircle2 size={20} className="text-indigo-500" /> : <XCircle size={20} className="text-slate-300" />}
                      {feature.text}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled={plan.current || busyPlanId === String(plan.id)}
                  onClick={() => handleSelectPlan(plan)}
                  className={`w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95 ${
                    plan.current
                      ? "bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-100"
                      : plan.primary
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  {plan.current ? "Current Plan" : busyPlanId === String(plan.id) ? "Please wait..." : plan.ctaLabel}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white flex flex-col justify-center">
            <h4 className="text-3xl font-black tracking-tighter mb-4">Why upgrade?</h4>
            <p className="text-slate-400 font-medium leading-relaxed mb-8">
              Your available features now come directly from the live plan catalog and subscription policy in the backend.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                <Zap className="text-indigo-400 mb-3" size={24} />
                <h5 className="font-bold text-xs uppercase tracking-widest">Live Limits</h5>
              </div>
              <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                <BrainCircuit className="text-indigo-400 mb-3" size={24} />
                <h5 className="font-bold text-xs uppercase tracking-widest">Real Features</h5>
              </div>
            </div>
          </div>
          <div className="rounded-[2.5rem] overflow-hidden min-h-[350px] shadow-xl">
            <img
              src={isEstateAudience
                ? "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800"
                : "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&q=80&w=800"}
              className="w-full h-full object-cover"
              alt={isEstateAudience ? "Secure Estate" : "Secure Home"}
            />
          </div>
        </section>
      </main>

      {isEstateAudience ? (
        <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-8 pt-4 bg-white border-t border-slate-100 z-[9999] shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
          <NavItem to="/dashboard/estate" icon={<LayoutGrid size={22} />} label="Home" />
          <NavItem to="/dashboard/estate/logs" icon={<History size={22} />} label="Logs" />
          <NavItem to="/dashboard/estate/meetings" icon={<CalendarDays size={22} />} label="Meetings" />
          <NavItem to="/dashboard/estate/broadcasts" icon={<MessageSquare size={22} />} label="Inbox" />
          <NavItem to="/dashboard/estate/settings" icon={<User size={22} />} label="Profile" active />
        </nav>
      ) : (
        <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-8 pt-4 bg-white border-t border-slate-100 z-[9999] shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
          <NavItem to="/dashboard/homeowner/overview" icon={<LayoutGrid size={22} />} label="Home" />
          <NavItem to="/dashboard/homeowner/visits" icon={<History size={22} />} label="Activity" />
          <NavItem to="/dashboard/homeowner/appointments" icon={<CalendarDays size={22} />} label="Schedule" />
          <NavItem to="/dashboard/homeowner/messages" icon={<MessageSquare size={22} />} label="Inbox" />
          <NavItem to="/dashboard/homeowner/settings" icon={<User size={22} />} label="Profile" active />
        </nav>
      )}
    </div>
  );
}

function buildPlanFeatures(plan, audience = "homeowner") {
  const planId = String(plan?.id || "");
  const estateFeatures = {
    estate_starter: [
      "Up to 3 houses",
      "Full system access (limited scale)",
      "Trial only - 30 days"
    ],
    estate_basic: [
      "Up to 10 houses",
      "Realtime alerts",
      "Visitor logs",
      "Resident management",
      "Mobile dashboard"
    ],
    estate_plus: [
      "Everything in Basic",
      "Visitor scheduling",
      "Access time windows",
      "Chat + call verification"
    ],
    estate_growth: [
      "Everything in Plus",
      "Multi-admin roles",
      "Analytics dashboard",
      "Activity tracking"
    ],
    estate_pro: [
      "Everything in Growth",
      "Advanced analytics",
      "Security audit logs",
      "Role permissions",
      "Priority support"
    ]
  };
  const homeownerFeatures = {
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
  const mapped = audience === "estate" ? estateFeatures[planId] : homeownerFeatures[planId];
  if (mapped?.length) {
    return mapped.map((text) => ({ text, included: true }));
  }
  const enabled = (Array.isArray(plan.enabledFeatures) ? plan.enabledFeatures : []).slice(0, 5).map((feature) => ({
    text: prettifyFeature(feature),
    included: true
  }));
  return enabled;
}

function prettifyFeature(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatPlanAmount(plan, billingCycle) {
  const amount = Number(
    billingCycle === "yearly"
      ? (plan?.billingCycles?.yearly?.amount ?? plan?.yearlyAmount ?? (Number(plan.amount || 0) * 12))
      : (plan?.billingCycles?.monthly?.amount ?? plan?.monthlyAmount ?? Number(plan.amount || 0))
  );
  if (amount <= 0) return "Free";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: String(plan.currency || "NGN"),
    maximumFractionDigits: 0
  }).format(amount);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function fallbackFreePlan(subscription, audience = "homeowner") {
  const fallbackId = audience === "estate" ? "estate_starter" : "free";
  return [
    {
      id: String(subscription?.plan || fallbackId),
      name: String(subscription?.plan || fallbackId).replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase()),
      amount: 0,
      currency: "NGN",
      billingLabel: "month",
      maxDoors: subscription?.limits?.maxDoors ?? 0,
      maxQrCodes: subscription?.limits?.maxQrCodes ?? 0,
      maxAdmins: 1,
      monthlyAmount: 0,
      yearlyAmount: 0,
      description: "",
      enabledFeatures: [],
      restrictions: []
    }
  ];
}

function getPlanCtaLabel(planId) {
  const labels = {
    estate_starter: "Start Free Trial",
    estate_basic: "Start Basic",
    estate_plus: "Choose Plus",
    estate_growth: "Choose Growth",
    estate_pro: "Start Pro",
    free: "Get Started Free",
    home_pro: "Choose Home Pro",
    home_premium: "Choose Home Premium",
  };
  return labels[String(planId || "")] || "Choose Plan";
}

function NavItem({ to, icon, label, active = false }) {
  return (
    <Link to={to} className={`flex flex-col items-center gap-1 transition-all ${active ? "text-indigo-600" : "text-slate-400 hover:text-slate-500"}`}>
      <div className={`${active ? "bg-indigo-50 p-2 rounded-xl" : "p-2"}`}>{icon}</div>
      <span className="text-[9px] font-black uppercase mt-0.5 tracking-tight">{label}</span>
    </Link>
  );
}
