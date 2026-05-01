import { NavLink } from "react-router-dom";

export default function BottomNav({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth", // Gives a smooth scrolling experience
    });
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[100] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 lg:hidden">
      <div className="mx-auto flex w-full max-w-xl items-center justify-around rounded-[2rem] border border-slate-200/50 bg-white/90 px-3 py-2 shadow-[0_-8px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-950/90">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end ?? true}
              onClick={handleScrollToTop}
              className={({ isActive }) =>
                `flex min-w-[4rem] flex-col items-center justify-center rounded-[1.2rem] px-2 py-2 transition-all duration-300 ${
                  isActive
                    ? "bg-[#0d4d86] text-white shadow-lg shadow-[#0d4d86]/30 scale-105"
                    : "text-slate-500 hover:bg-slate-100/60 dark:text-slate-400 dark:hover:bg-slate-800/50 active:scale-95"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon 
                    className="h-[1.25rem] w-[1.25rem]" 
                    strokeWidth={isActive ? 2.5 : 2} 
                  />
                  <span className="mt-1 text-[9px] font-bold uppercase tracking-wider">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}