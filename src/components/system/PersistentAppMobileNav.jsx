import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../state/AuthContext";
import { getHomeownerContext } from "../../services/homeownerService";

const APP_ROUTE_PREFIXES = ["/dashboard", "/billing", "/onboarding"];

const homeownerNav = [
  { to: "/dashboard/homeowner/overview", label: "Home", icon: "overview" },
  { to: "/dashboard/homeowner/visits", label: "Visits", icon: "visits" },
  { to: "/dashboard/homeowner/appointments", label: "Appointments", icon: "appointments" },
  { to: "/dashboard/homeowner/messages", label: "Messages", icon: "messages" },
  { to: "/dashboard/homeowner/doors", label: "Doors", icon: "doors" }
];

const estateManagedHomeownerNav = [
  { to: "/dashboard/homeowner/overview", label: "Home", icon: "overview" },
  { to: "/dashboard/homeowner/estate-alerts", label: "Estate", icon: "broadcast" },
  { to: "/dashboard/homeowner/estate-dues", label: "Dues", icon: "dues" },
  { to: "/dashboard/homeowner/estate-messages", label: "Messages", icon: "messages" },
  { to: "/dashboard/homeowner/estate-panic", label: "Panic", icon: "shield" }
];

const estateNav = [
  { to: "/dashboard/estate", label: "Overview", icon: "estate" },
  { to: "/dashboard/estate/invites", label: "Owners", icon: "invite" },
  { to: "/dashboard/estate/homes", label: "Homes", icon: "homes" },
  { to: "/dashboard/estate/doors", label: "Doors", icon: "doors" },
  { to: "/dashboard/estate/assign", label: "Assign", icon: "assign" }
];

const securityNav = [
  { to: "/dashboard/security", label: "Gate", icon: "shield" },
  { to: "/dashboard/security/messages", label: "Messages", icon: "messages" },
  { to: "/dashboard/notifications", label: "Alerts", icon: "bell_ring" }
];

const adminNav = [
  { to: "/dashboard/admin", label: "System", icon: "system" },
  { to: "/dashboard/admin/users", label: "Users", icon: "user_admin" },
  { to: "/dashboard/admin/sessions", label: "Sessions", icon: "sessions" },
  { to: "/dashboard/admin/payments", label: "Payments", icon: "billing" }
];

export default function PersistentAppMobileNav() {
  const location = useLocation();
  const { user, isAuthenticated, ready } = useAuth();
  const [homeownerContext, setHomeownerContext] = useState(null);
  const pathname = location.pathname || "/";

  const routeRole = useMemo(() => {
    if (pathname.startsWith("/dashboard/estate") || pathname.startsWith("/billing")) return user?.role === "estate" ? "estate" : user?.role;
    if (pathname.startsWith("/dashboard/homeowner") || pathname === "/onboarding") return user?.role === "homeowner" ? "homeowner" : user?.role;
    if (pathname.startsWith("/dashboard/security")) return "security";
    if (pathname.startsWith("/dashboard/admin")) return "admin";
    if (pathname.startsWith("/dashboard/notifications")) return user?.role ?? null;
    return user?.role ?? null;
  }, [pathname, user?.role]);

  useEffect(() => {
    let active = true;

    async function loadHomeownerContext() {
      if (routeRole !== "homeowner") {
        setHomeownerContext(null);
        return;
      }
      try {
        const data = await getHomeownerContext();
        if (!active) return;
        setHomeownerContext(data);
      } catch {
        if (!active) return;
        setHomeownerContext(null);
      }
    }

    void loadHomeownerContext();
    return () => {
      active = false;
    };
  }, [routeRole]);

  const isManagedHomeowner = Boolean(homeownerContext?.managedByEstate);
  const items = useMemo(() => {
    if (routeRole === "homeowner") {
      return isManagedHomeowner ? estateManagedHomeownerNav : homeownerNav;
    }
    if (routeRole === "estate") return estateNav;
    if (routeRole === "security") return securityNav;
    if (routeRole === "admin") return adminNav;
    return [];
  }, [isManagedHomeowner, routeRole]);

  const shouldShow = ready && isAuthenticated && items.length > 0 && APP_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!shouldShow) return null;

  return (
    <>
      <div className="h-24 lg:hidden" aria-hidden="true" />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[9998] h-[calc(6.8rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-slate-100/95 via-slate-100/75 to-transparent backdrop-blur-md dark:from-slate-950/95 dark:via-slate-950/75 lg:hidden"
      />
      <nav className="fixed inset-x-0 bottom-0 z-[9999] px-3 pb-[max(0.2rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="relative mx-auto max-w-md rounded-[1.35rem] border border-slate-200/60 bg-[#ebe8f8]/95 px-3 py-2 shadow-[0_12px_32px_rgba(76,29,149,0.16)] backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/90">
          <div className="flex h-12 items-stretch gap-1 sm:h-12">
            {items.map((item) => (
              <NavLink
                key={`persistent-mobile-${item.to}`}
                to={item.to}
                end={item.to === "/dashboard/homeowner/overview" || item.to === "/dashboard/estate" || item.to === "/dashboard/admin"}
                className={({ isActive }) =>
                  `flex min-w-0 flex-1 items-center justify-center rounded-xl px-1 py-1 text-[10px] font-semibold transition-all duration-200 active:scale-95 sm:text-[11px] ${
                    isActive ? "text-white" : "text-violet-700 dark:text-slate-300"
                  }`
                }
              >
                {({ isActive }) => (
                  <div className="group relative flex items-center justify-center">
                    <span
                      className={`grid place-items-center rounded-full transition-all duration-200 ${
                        isActive
                          ? "h-10 w-10 bg-violet-600 text-white shadow-[0_10px_24px_rgba(124,58,237,0.45)]"
                          : "h-8 w-8 text-violet-700 opacity-90 dark:text-slate-300"
                      }`}
                    >
                      <NavIcon name={item.icon} />
                    </span>
                    <span
                      className={`pointer-events-none absolute -top-7 whitespace-nowrap rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white transition-all ${
                        isActive ? "opacity-100" : "opacity-0"
                      } group-hover:opacity-100`}
                    >
                      {item.label}
                    </span>
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
}

function NavIcon({ name }) {
  const paths = {
    overview: <path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" />,
    appointments: <path d="M7 2v3M17 2v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1zM9 12h6M9 16h4" />,
    visits: <path d="M4 5h16M4 12h16M4 19h10" />,
    messages: <path d="M4 5h16v10H7l-3 3z" />,
    doors: <path d="M7 3h10v18H7zM10 12h.01" />,
    billing: <path d="M3 7h18v10H3zM3 11h18" />,
    estate: <path d="M3 21h18M5 21V9l7-5 7 5v12" />,
    homes: <path d="M3 11l9-7 9 7M5 10v11h14V10" />,
    invite: <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M16 3h5v5M21 3l-7 7" />,
    assign: <path d="M4 12h10M10 6l6 6-6 6M19 5v14" />,
    system: <path d="M12 1v4M12 19v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M1 12h4M19 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />,
    shield: <path d="M12 3l7 3v6c0 4.5-2.8 7.9-7 9-4.2-1.1-7-4.5-7-9V6l7-3zm-2.5 9 1.8 1.8L15 10.2" />,
    bell_ring: <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5M9 17a3 3 0 0 0 6 0M18 3l2 2M6 3L4 5" />,
    user_admin: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm10 0v-2m0 0V7m0 2h-2m2 0h2" />,
    sessions: <path d="M8 7h13M8 12h13M8 17h13M3 7h.01M3 12h.01M3 17h.01" />,
    broadcast: <path d="M4 12h16M4 7h10M4 17h10M18 7v10" />,
    dues: <path d="M3 7h18v10H3zM3 11h18M7 15h2" />
  };

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] ?? <circle cx="12" cy="12" r="9" />}
    </svg>
  );
}
