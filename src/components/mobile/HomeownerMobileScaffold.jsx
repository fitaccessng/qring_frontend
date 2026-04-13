import { NavLink } from "react-router-dom";

export default function HomeownerMobileScaffold({
  topBar,
  children,
  navItems,
  floatingAction = null,
  maxWidthClassName = "max-w-xl",
  className = ""
}) {
  return (
    <div className={`relative min-h-[100dvh] overflow-x-hidden text-slate-900 ${className}`}>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_rgba(37,93,173,0.14),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(1,107,84,0.10),_transparent_28%)]" />
      <div className={`mx-auto w-full ${maxWidthClassName}`}>
        {topBar}
        <main className="px-4 pb-32 pt-4 sm:px-6">{children}</main>
      </div>

      {floatingAction ? <div className="fixed bottom-28 right-5 z-40 sm:right-8">{floatingAction}</div> : null}

      {Array.isArray(navItems) && navItems.length > 0 ? (
        <nav className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 lg:hidden">
          <div className="mx-auto flex w-full max-w-xl items-center justify-around rounded-t-[2rem] border border-white/40 bg-white/80 px-2 py-2 shadow-[0_-8px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end ?? true}
                  className={({ isActive }) =>
                    `flex min-w-[4.25rem] flex-col items-center justify-center rounded-[1.25rem] px-3 py-2 text-center transition ${
                      isActive
                        ? "bg-blue-50 text-[#00346f] shadow-sm"
                        : "text-slate-400 hover:text-[#00346f]"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`h-[1.1rem] w-[1.1rem] ${isActive ? "text-[#00346f]" : ""}`} strokeWidth={isActive ? 2.4 : 2} />
                      <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em]">{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
