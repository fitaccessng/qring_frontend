import { useEffect, useMemo } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import useSubscription from "../hooks/useSubscription";
import { openPlanLockedModal } from "../utils/blocking";
import { isSubscriptionEntitled } from "../utils/subscription";

export default function HomeownerSubscriptionRoute({ requiredAction = "", requiredFeature = "" }) {
  const { subscription, loading } = useSubscription();
  const location = useLocation();

  const allowed = useMemo(() => {
    if (!subscription) return false;
    return isSubscriptionEntitled(subscription, { requiredAction, requiredFeature });
  }, [subscription, requiredAction, requiredFeature]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 p-6 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        Checking subscription...
      </div>
    );
  }

  if (!allowed) {
    return <BlockedSubscriptionRedirect subscription={subscription} location={location} requiredFeature={requiredFeature} requiredAction={requiredAction} />;
  }

  return <Outlet />;
}

function BlockedSubscriptionRedirect({ subscription, location, requiredFeature = "", requiredAction = "" }) {
  useEffect(() => {
    const label = toFeatureLabel(requiredFeature || requiredAction);
    openPlanLockedModal({
      managedByEstate: Boolean(subscription?.managedByEstate),
      estateName: subscription?.estateName || "",
      featureLabel: label,
    });
  }, [location.pathname, requiredAction, requiredFeature, subscription?.estateName, subscription?.managedByEstate]);

  if (subscription?.managedByEstate) {
    return <Navigate to="/dashboard/homeowner/overview" replace state={{ from: location }} />;
  }

  return <Navigate to="/billing/paywall" replace state={{ from: location }} />;
}

function toFeatureLabel(value) {
  const text = String(value || "").trim();
  if (!text) return "This feature";
  return text
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
