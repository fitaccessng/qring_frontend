export default function CardSurface({
  as: Component = "section",
  children,
  className = "",
  accent = "from-slate-100/80 via-white/10 to-transparent",
  glow = "bg-slate-300/40"
}) {
  return (
    <Component
      className={`relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 ${className}`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-60`} />
      <div className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full ${glow} blur-2xl opacity-60`} />
      <div className="relative">{children}</div>
    </Component>
  );
}
