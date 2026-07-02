import { NavLink, useLocation } from "react-router-dom";
import { useMemo } from "react";
import { useAuth } from "../../state/AuthContext";

const homeownerNav = [
  { to: "/dashboard/homeowner/overview", label: "Dashboard", icon: "overview" },
  { to: "/dashboard/homeowner/visits", label: "Visits", icon: "visits" },
  { to: "/dashboard/homeowner/messages", label: "Messages", icon: "messages" },
  { to: "/dashboard/homeowner/doors", label: "Doors", icon: "doors" },
  { to: "/dashboard/homeowner/settings", label: "Settings", icon: "settings" }
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
  const pathname = location.pathname || "/";

  const routeRole = useMemo(() => {
    if (pathname.startsWith("/dashboard/estate") || pathname.startsWith("/billing")) return user?.role === "estate" ? "estate" : user?.role;
    if (pathname.startsWith("/dashboard/homeowner") || pathname === "/onboarding") return user?.role === "homeowner" ? "homeowner" : user?.role;
    if (pathname.startsWith("/dashboard/security")) return "security";
    if (pathname.startsWith("/dashboard/admin")) return "admin";
    if (pathname.startsWith("/dashboard/notifications")) return user?.role ?? null;
    return user?.role ?? null;
  }, [pathname, user?.role]);

  const items = useMemo(() => {
    if (routeRole === "homeowner") return homeownerNav;
    if (routeRole === "estate") return estateNav;
    if (routeRole === "security") return securityNav;
    if (routeRole === "admin") return adminNav;
    return [];
  }, [routeRole]);

  const shouldShow = ready && isAuthenticated && routeRole === "homeowner" && pathname.startsWith("/dashboard/homeowner") && items.length > 0;
  if (!shouldShow) return null;

  return (
    <>
      {/* Content spacer area avoiding fixed overlap */}
      <div className="h-[68px] lg:hidden" aria-hidden="true" />
      
      {/* Premium Static Bottom Nav Block */}
      <nav className="fixed inset-x-0 bottom-0 z-[10000] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 lg:hidden pointer-events-auto">
        <div className="mx-auto flex w-full max-w-md items-center justify-between rounded-[24px] border border-neutral-200/50 bg-white/80 px-2 py-[5px] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.12)] backdrop-blur-md dark:border-neutral-800/60 dark:bg-neutral-950/80">
          {items.map((item) => (
            <NavLink
              key={`persistent-mobile-${item.to}`}
              to={item.to}
              end={item.to === "/dashboard/homeowner/overview" || item.to === "/dashboard/estate" || item.to === "/dashboard/admin"}
              className="relative flex flex-1 flex-col items-center justify-center py-1 select-none"
            >
              {({ isActive }) => (
                <div className="flex flex-col items-center justify-center">
                  {/* Icon Wrapper */}
                  <div
                    className={`flex items-center justify-center transition-colors duration-200 ${
                      isActive
                        ? "text-neutral-950 dark:text-white"
                        : "text-neutral-400 dark:text-neutral-500"
                    }`}
                  >
                    <NavIcon name={item.icon} isActive={isActive} />
                  </div>
                  
                  {/* Clear Clean Modern Text Labels */}
                  <span 
                    className={`mt-0.5 text-[10px] font-medium tracking-normal transition-colors duration-200 ${
                      isActive 
                        ? "text-neutral-950 font-semibold dark:text-white" 
                        : "text-neutral-400 dark:text-neutral-500"
                    }`}
                  >
                    {item.label}
                  </span>

                  {/* Elegant static dot accent replacing huge block boxes */}
                  {isActive && (
                    <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-neutral-950 dark:bg-white" />
                  )}
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}

function NavIcon({ name, isActive }) {
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
    dues: <path d="M3 7h18v10H3zM3 11h18M7 15h2" />,
    settings: <path d="M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7zm7.4 6.5a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1.2 1.2a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2a1 1 0 0 0-.6.9v.2a1 1 0 0 1-1 1h-1.7a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9a1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0L4.3 18.4a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1a1 1 0 0 0-.9-.6h-.2a1 1 0 0 1-1-1v-1.7a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6a1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4L5.5 4.8a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2a1 1 0 0 0 .6-.9V4a1 1 0 0 1 1-1h1.7a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9a1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1.2 1.2a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1a1 1 0 0 0 .9.6h.2a1 1 0 0 1 1 1v1.7a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6z" />
  };

  return (
    <svg 
      viewBox="0 0 24 24" 
      className="h-[18px] w-[18px] transition-all duration-200" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth={isActive ? 2.5 : 2} 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      {paths[name] ?? <circle cx="12" cy="12" r="9" />}
    </svg>
  );
}
