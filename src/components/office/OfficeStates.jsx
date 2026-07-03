export function OfficeLoadingState({ label = "Loading office data..." }) {
  return (
    <div className="grid min-h-[32vh] place-items-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}

export function OfficeEmptyState({ title, description, action }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-5 text-center dark:border-slate-800 dark:bg-slate-950/40">
      <p className="font-black text-slate-900 dark:text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function OfficeErrorBanner({ message, onRetry }) {
  return (
    <div className="rounded-[1.8rem] border border-rose-200 bg-rose-50 p-5 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em]">Office page failed</p>
          <p className="mt-2 text-sm">{message}</p>
        </div>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-700"
          >
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}
