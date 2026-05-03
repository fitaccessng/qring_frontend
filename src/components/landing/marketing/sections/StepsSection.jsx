const stepTone = {
  1: "from-brand-600/15 to-transparent",
  2: "from-emerald-500/15 to-transparent",
  3: "from-slate-950/10 to-transparent dark:from-white/10",
};

export default function StepsSection({ id, eyebrow, title, description, steps }) {
  return (
    <section id={id} className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">{eyebrow}</p>
        <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">{title}</h2>
        <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {steps.map((step, idx) => (
          <div
            key={step.title}
            className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-950"
          >
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${stepTone[idx + 1] ?? "from-brand-600/10 to-transparent"}`} />
            <div className="relative">
              <div className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  Step {idx + 1}
                </span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{step.badge}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

