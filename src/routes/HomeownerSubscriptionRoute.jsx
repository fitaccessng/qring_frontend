import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getMySubscription } from "../services/paymentService";

export default function HomeownerSubscriptionRoute() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let active = true;
    async function checkSubscription() {
      setLoading(true);
      try {
        const subscription = await getMySubscription();
        if (!active) return;
        setAllowed(subscription?.status === "active");
      } catch {
        if (!active) return;
        setAllowed(false);
      } finally {
        if (active) setLoading(false);
      }
    }
    checkSubscription();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 p-6 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        Checking subscription...
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/billing/paywall" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
