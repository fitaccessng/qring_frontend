export const estateFieldClassName =
  "w-full rounded-[1.15rem] border border-slate-200/80 bg-white/92 px-4 py-3 text-sm text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition focus:border-[#9db7e6] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#d7e2ff] dark:border-slate-700 dark:bg-slate-800/80 dark:text-white";

export const estateTextareaClassName =
  "w-full resize-none rounded-[1.15rem] border border-slate-200/80 bg-white/92 px-4 py-3 text-sm text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition focus:border-[#9db7e6] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#d7e2ff] dark:border-slate-700 dark:bg-slate-800/80 dark:text-white";

export const estateSurfaceClassName =
  "rounded-[1.9rem] border border-white/70 bg-white/90 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.08)] ring-1 ring-slate-100/80 backdrop-blur-sm sm:p-6";

export const estatePrimaryButtonClassName =
  "inline-flex items-center justify-center rounded-[1.15rem] bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(0,52,111,0.2)] transition hover:shadow-[0_20px_40px_rgba(0,52,111,0.26)] active:scale-95 disabled:opacity-50";

export const estateSecondaryButtonClassName =
  "inline-flex items-center justify-center rounded-[1.15rem] border border-slate-200/80 bg-white/92 px-4 py-3 text-sm font-semibold text-[#00346f] shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition hover:border-[#9db7e6] hover:bg-white active:scale-95 disabled:opacity-50";

export const estateCardClassName =
  "rounded-[1.6rem] border border-white/70 bg-white/92 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)] ring-1 ring-slate-100/70 backdrop-blur-sm";

export function EstateBadge({ children, tone = "blue" }) {
  const tones = {
    blue: "bg-[#d7e2ff] text-[#00346f]",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
    slate: "bg-slate-100 text-slate-700"
  };

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${tones[tone] || tones.blue}`}>
      {children}
    </span>
  );
}

export function EstateInfoTile({ icon, label, value, detail, className = "" }) {
  return (
    <div className={`${estateCardClassName} ${className}`.trim()}>
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-[1.2rem] bg-blue-50 text-[#00346f] shadow-sm">
          {icon}
        </div>
        {label ? <EstateBadge tone="slate">{label}</EstateBadge> : null}
      </div>
      {value ? <p className="mt-5 font-heading text-2xl font-extrabold tracking-tight text-slate-900">{value}</p> : null}
      {detail ? <p className="mt-1 text-sm leading-relaxed text-slate-500">{detail}</p> : null}
    </div>
  );
}

export function EstateMetricStrip({ items = [] }) {
  if (!items.length) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-[1.3rem] border border-white/70 bg-white/88 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-100/70">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
          <p className="mt-2 font-heading text-2xl font-extrabold tracking-tight text-[#00346f]">{item.value}</p>
          {item.helper ? <p className="mt-1 text-[11px] text-slate-500">{item.helper}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function EstateEmptyState({ icon, title, description, action = null, aside = null }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-dashed border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(243,244,245,0.92))] p-6 text-center shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
      <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#9db7e6] to-transparent" />
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-[1.6rem] bg-blue-50 text-[#00346f] shadow-sm">
        {icon}
      </div>
      <h3 className="mt-5 font-heading text-2xl font-extrabold tracking-tight text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
      {aside ? <div className="mt-4">{aside}</div> : null}
    </div>
  );
}

export function EstateManagerSection({ title, subtitle, right, children, className = "" }) {
  return (
    <section className={`${estateSurfaceClassName} ${className}`.trim()}>
      {(title || subtitle || right) ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title ? <h3 className="font-heading text-lg font-extrabold tracking-tight text-[#00346f] dark:text-white">{title}</h3> : null}
            {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{subtitle}</p> : null}
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
    <div className="relative mx-auto w-full max-w-xl space-y-6 px-1 py-2 text-slate-900 sm:max-w-5xl sm:px-2 sm:py-3">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[18rem] rounded-[2.4rem] bg-[radial-gradient(circle_at_top_right,_rgba(37,93,173,0.14),_transparent_38%),radial-gradient(circle_at_bottom_left,_rgba(1,107,84,0.10),_transparent_30%)]" />
      <section className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] p-5 text-white shadow-[0_18px_50px_rgba(0,52,111,0.22)] sm:p-6">
        <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 left-8 h-36 w-36 rounded-full bg-cyan-200/10 blur-3xl" />
        <div className="absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow ? <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-blue-100">{eyebrow}</p> : null}
            <h1 style={{ color: "white" }} className="mt-2 font-heading text-3xl font-extrabold tracking-tight">{title}</h1>
            {description ? <p className="mt-2 max-w-xl text-sm leading-relaxed text-blue-100">{description}</p> : null}
          </div>
          {icon ? (
            <div className="grid h-14 w-14 place-items-center rounded-[1.2rem] border border-white/10 bg-white/10 text-white backdrop-blur">
              <div className={`grid h-11 w-11 place-items-center rounded-[1rem] bg-gradient-to-br ${accent} text-white shadow-lg shadow-slate-900/10`}>
                {icon}
              </div>
            </div>
          ) : null}
        </div>
        {stats.length ? (
          <div className="mt-6 grid grid-cols-2 gap-3">
            {stats.map((item) => (
              <div key={item.label} className="rounded-[1.2rem] border border-white/10 bg-white/10 px-3 py-3 backdrop-blur">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">{item.label}</p>
                <p className="mt-2 text-lg font-black text-white">{item.value}</p>
                {item.helper ? <p className="mt-1 text-[11px] text-blue-100">{item.helper}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>
      {children}
    </div>
  );
}
