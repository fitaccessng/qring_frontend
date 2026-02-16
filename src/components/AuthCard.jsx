import BrandMark from "./BrandMark";

export default function AuthCard({ title, subtitle, children }) {
  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/90 p-7 shadow-soft backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 dark:bg-white">
          <BrandMark tone="light" className="h-6 w-6 dark:invert-0" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Qring</p>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Secure Access</p>
        </div>
      </div>
      <h1 className="font-heading text-3xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}
