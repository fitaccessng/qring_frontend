export default function ListItem({
  title,
  subtitle = "",
  meta = "",
  leading = null,
  trailing = null,
  className = ""
}) {
  return (
    <article className={`flex items-start gap-3 rounded-[1.35rem] border border-slate-200/70 bg-white/85 p-4 ${className}`}>
      {leading ? <div className="mt-0.5 shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate text-sm font-bold text-slate-900">{title}</h3>
          {meta ? <span className="shrink-0 text-[11px] font-semibold text-slate-500">{meta}</span> : null}
        </div>
        {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </article>
  );
}
