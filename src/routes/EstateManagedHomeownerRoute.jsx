import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getHomeownerContext } from "../services/homeownerService";
import { useAuth } from "../state/AuthContext";

function isEstateManaged({ user, context }) {
  if (Boolean(context?.managedByEstate)) return true;
  if (typeof user?.email === "string" && user.email.toLowerCase().endsWith("@estate.useqring.online")) return true;
  return false;
}

export default function EstateManagedHomeownerRoute() {
  const { user } = useAuth();
  const location = useLocation();
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    let active = true;
    async function run() {
      if (user?.role !== "homeowner") {
        if (active) setAllowed(false);
        return;
      }
      try {
        const context = await getHomeownerContext();
        if (!active) return;
        setAllowed(isEstateManaged({ user, context }));
      } catch {
        if (!active) return;
        setAllowed(false);
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [user]);

  if (allowed === null) return null;
  if (!allowed) {
    return <Navigate to="/dashboard/homeowner/overview" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

