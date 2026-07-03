export default function OfficeStatCard({ icon: Icon, label, value, description }) {
  return (
    <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p>
          {description ? <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{description}</p> : null}
        </div>
        {Icon ? (
          <div className="rounded-2xl bg-brand-500/10 p-3 text-brand-500">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
