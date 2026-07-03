import { NavLink } from "react-router-dom";

export default function OfficePageHeader({ eyebrow = "Qring Office", title, subtitle, tabs = [], actions = null }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-brand-500">{eyebrow}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{title}</h1>
          {subtitle ? <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {tabs.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "rounded-full border px-4 py-2 text-xs font-bold transition",
                  isActive
                    ? "border-brand-500 bg-brand-500 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-brand-500/30 hover:text-brand-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      ) : null}
    </div>
  );
}
