export default function AppPreloader() {
  const letters = "QRING".split("");

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.16),transparent_42%),radial-gradient(circle_at_85%_85%,rgba(59,130,246,0.14),transparent_45%),linear-gradient(140deg,#f8fafc_0%,#eef2ff_52%,#e0f2fe_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_42%),radial-gradient(circle_at_85%_85%,rgba(59,130,246,0.2),transparent_45%),linear-gradient(140deg,#020617_0%,#0f172a_45%,#111827_100%)] dark:text-slate-100">
      <div className="flex flex-col items-center gap-5">
        <div className="relative flex items-center gap-1.5">
          {letters.map((letter, index) => (
            <span
              key={`${letter}-${index}`}
              className="font-heading text-4xl font-extrabold tracking-[0.16em] text-slate-950 opacity-0 sm:text-5xl dark:text-slate-100"
              style={{
                animation: "qring-letter-in 420ms cubic-bezier(0.2,0.9,0.25,1) forwards",
                animationDelay: `${index * 110}ms`
              }}
            >
              {letter}
            </span>
          ))}
          <span className="pointer-events-none absolute -inset-x-2 -bottom-2 h-[2px] animate-[qring-bonus-sweep_1.2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-brand-500 to-transparent" />
        </div>
        <div className="h-1.5 w-44 overflow-hidden rounded-full bg-slate-300 dark:bg-slate-700">
          <div className="h-full w-1/2 animate-[qring-loader_1.1s_ease-in-out_infinite] rounded-full bg-brand-500" />
        </div>
        <p className="animate-[qring-pulse-fade_1.2s_ease-in-out_infinite] text-xs font-semibold uppercase tracking-[0.22em] text-slate-600 dark:text-slate-300">
          Smart Access Control
        </p>
      </div>
    </div>
  );
}
