import BrandMark from "./BrandMark";

export default function AuthCard({ title, subtitle, children }) {
  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-soft backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:p-7">
      <div className="mb-4 flex items-center gap-3 sm:mb-5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 dark:bg-white sm:h-10 sm:w-10">
          <BrandMark tone="light" className="h-6 w-6 dark:invert-0" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Qring</p>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Secure Access</p>
        </div>
      </div>
      <h1 className="font-heading text-2xl font-bold sm:text-3xl">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
      <div className="mt-5 sm:mt-6">{children}</div>
    </div>
  );
}
