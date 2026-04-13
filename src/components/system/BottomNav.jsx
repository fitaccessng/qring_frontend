import { NavLink } from "react-router-dom";

export default function BottomNav({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 lg:hidden">
      <div className="mx-auto flex w-full max-w-xl items-center justify-around rounded-[1.9rem] border border-white/60 bg-[#fffdf7]/88 px-2 py-2 shadow-[0_-8px_32px_rgba(15,23,42,0.10)] backdrop-blur-xl">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end ?? true}
              className={({ isActive }) =>
                `flex min-w-[4.25rem] flex-col items-center justify-center rounded-[1.3rem] px-3 py-2 transition ${
                  isActive ? "bg-[#0d4d86] text-white shadow-soft" : "text-slate-500"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-[1.1rem] w-[1.1rem]" strokeWidth={isActive ? 2.5 : 2.15} />
                  <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em]">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
