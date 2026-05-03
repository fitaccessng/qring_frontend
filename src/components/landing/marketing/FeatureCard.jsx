export default function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 transition group-hover:bg-white dark:bg-slate-900 dark:text-brand-100 dark:ring-slate-800 dark:group-hover:bg-slate-900">
          {Icon ? <Icon className="h-6 w-6" aria-hidden="true" /> : null}
        </span>
        <div>
          <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(circle_at_center,rgba(36,86,245,0.22),transparent_65%)]" />
        <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_center,rgba(31,157,98,0.16),transparent_65%)]" />
      </div>
    </div>
  );
}

