export default function PageSkeleton({ blocks = 3, className = "" }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: blocks }).map((_, idx) => (
        <div
          key={`skeleton-${idx}`}
          className="rounded-3xl border border-slate-200/70 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90"
        >
          <div className="h-4 w-32 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
          <div className="mt-3 h-3 w-full animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
          <div className="mt-2 h-3 w-2/3 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
          <div className="mt-4 h-10 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
        </div>
      ))}
    </div>
  );
}

