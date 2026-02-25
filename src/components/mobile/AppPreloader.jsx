export default function AppPreloader() {
  const letters = "QRING".split("");

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-white text-slate-950">
      <div className="flex flex-col items-center gap-5">
        <div className="relative flex items-center gap-1.5">
          {letters.map((letter, index) => (
            <span
              key={`${letter}-${index}`}
              className="font-heading text-4xl font-extrabold tracking-[0.16em] text-slate-950 opacity-0 sm:text-5xl"
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
        <div className="h-1.5 w-44 overflow-hidden rounded-full bg-slate-300">
          <div className="h-full w-1/2 animate-[qring-loader_1.1s_ease-in-out_infinite] rounded-full bg-brand-500" />
        </div>
        <p className="animate-[qring-pulse-fade_1.2s_ease-in-out_infinite] text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
          Smart Access Control
        </p>
      </div>
    </div>
  );
}
