import { ArrowLeft } from "lucide-react";

export function EstateMobilePage({ title, subtitle, icon: Icon, iconClassName = "text-slate-900 dark:text-white", onBack, children, action }) {
  return (
    <div className="min-h-screen bg-slate-100 pb-28 text-slate-950 antialiased dark:bg-slate-950 dark:text-white">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 transition active:scale-95 dark:bg-slate-900 dark:text-slate-200"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          {Icon ? (
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 dark:bg-slate-900">
              <Icon className={`h-5 w-5 ${iconClassName}`} />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-black tracking-tight">{title}</h1>
            {subtitle ? <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 py-4">{children}</main>
    </div>
  );
}

export function EstateSectionHeader({ label, count }) {
  return (
    <div className="mb-2 flex items-center justify-between px-1">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{label}</p>
      {count !== undefined ? (
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800">
          {count}
        </span>
      ) : null}
    </div>
  );
}

export function EstateList({ children }) {
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">{children}</div>;
}

export function EstateListItem({ children, onClick, className = "" }) {
  const Component = onClick ? "button" : "article";
  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`block w-full border-b border-slate-100 p-4 text-left last:border-b-0 transition active:bg-slate-50 dark:border-slate-800 dark:active:bg-slate-800/70 ${className}`}
    >
      {children}
    </Component>
  );
}

export function EstateStatusPill({ children, tone = "slate" }) {
  const classes = {
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
    cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
  };
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${classes[tone] || classes.slate}`}>{children}</span>;
}

export function EstateEmptyState({ icon: Icon, title, message }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-800 dark:bg-slate-900">
      {Icon ? (
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          <Icon className="h-6 w-6" />
        </div>
      ) : null}
      <p className="mt-3 text-sm font-black text-slate-800 dark:text-white">{title}</p>
      {message ? <p className="mx-auto mt-1 max-w-xs text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">{message}</p> : null}
    </div>
  );
}

export function EstateLoadingState({ label = "Loading" }) {
  return (
    <div className="space-y-2">
      <p className="px-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <EstateList>
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-20 animate-pulse border-b border-slate-100 bg-white last:border-b-0 dark:border-slate-800 dark:bg-slate-900" />
        ))}
      </EstateList>
    </div>
  );
}

export const estatePrimaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-slate-950";

export const estateSecondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition active:scale-[0.98] disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200";
