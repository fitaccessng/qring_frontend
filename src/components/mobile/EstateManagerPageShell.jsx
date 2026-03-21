export const estateFieldClassName =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 shadow-sm transition focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/15 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white";

export const estateTextareaClassName =
  "w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 shadow-sm transition focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/15 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white";

export function EstateManagerSection({ title, subtitle, right, children, className = "" }) {
  return (
    <section className={`rounded-[1.8rem] border border-slate-200/80 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-5 ${className}`.trim()}>
      {(title || subtitle || right) ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title ? <h3 className="text-base font-black text-slate-900 dark:text-white">{title}</h3> : null}
            {subtitle ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{subtitle}</p> : null}
          </div>
          {right}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export default function EstateManagerPageShell({
  eyebrow,
  title,
  description,
  icon,
  accent = "from-sky-600 to-cyan-600",
  stats = [],
  children
}) {
  return (
    <div className="mx-auto w-full max-w-lg space-y-5 px-2 py-3 sm:max-w-4xl sm:px-3 sm:py-4">
      <section className="sticky top-0 z-20 rounded-[1.7rem] border border-slate-200/70 bg-white/90 p-3 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow ? <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p> : null}
            <h1 className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-white">{title}</h1>
            {description ? <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-300">{description}</p> : null}
          </div>
          {icon ? (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white ring-1 ring-slate-200 shadow-sm dark:bg-slate-900 dark:ring-slate-700">
              <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${accent} text-white shadow-lg shadow-slate-300/20`}>
                {icon}
              </div>
            </div>
          ) : null}
        </div>
        {stats.length ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {stats.map((item) => (
              <div key={item.label} className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-slate-800/70">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">{item.label}</p>
                <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">{item.value}</p>
                {item.helper ? <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">{item.helper}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>
      {children}
    </div>
  );
}
