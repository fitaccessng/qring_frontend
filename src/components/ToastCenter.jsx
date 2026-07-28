import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

const paletteByType = {
  success: "border-emerald-200 bg-white text-slate-950 shadow-emerald-950/10 dark:border-emerald-900/50 dark:bg-slate-900 dark:text-white",
  error: "border-rose-200 bg-white text-slate-950 shadow-rose-950/10 dark:border-rose-900/50 dark:bg-slate-900 dark:text-white",
  warning: "border-amber-200 bg-white text-slate-950 shadow-amber-950/10 dark:border-amber-900/50 dark:bg-slate-900 dark:text-white",
  info: "border-cyan-200 bg-white text-slate-950 shadow-cyan-950/10 dark:border-cyan-900/50 dark:bg-slate-900 dark:text-white"
};

const iconByType = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info
};

const accentByType = {
  success: "bg-emerald-500 text-emerald-600",
  error: "bg-rose-500 text-rose-600",
  warning: "bg-amber-500 text-amber-600",
  info: "bg-cyan-500 text-cyan-600"
};

function normalizeToast(detail) {
  const message = String(detail?.message ?? "").trim();
  if (!message) return null;

  const type = String(detail?.type ?? "info").trim() || "info";
  const title =
    detail?.title ??
    (type === "success"
      ? "Success"
      : type === "error"
        ? "Something went wrong"
        : type === "warning"
          ? "Attention"
          : "Notice");
  const duration = Number.isFinite(Number(detail?.duration)) ? Number(detail.duration) : 3600;
  const kind = String(detail?.kind ?? "").trim();
  const route = typeof detail?.route === "string" ? detail.route : "";
  const actionLabel = typeof detail?.actionLabel === "string" ? detail.actionLabel : "";
  const dedupeKeyRaw = String(detail?.dedupeKey ?? "").trim();
  const dedupeKey = dedupeKeyRaw || `${kind}|${type}|${message}|${route}`;

  return {
    id: dedupeKey || `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    title: String(title || "").trim() || "Notice",
    message,
    duration: Math.max(1400, duration),
    kind,
    route,
    actionLabel,
    dedupeKey,
    createdAt: Date.now()
  };
}

export default function ToastCenter() {
  const navigate = useNavigate();
  const [toasts, setToasts] = useState([]);
  const timerByIdRef = useRef(new Map());
  const lastByDedupeKeyRef = useRef(new Map());
  const lastAnyToastAtRef = useRef(0);

  const removeToast = useCallback((toastId, toast) => {
    const timer = timerByIdRef.current.get(toastId);
    if (timer) window.clearTimeout(timer);
    timerByIdRef.current.delete(toastId);
    setToasts((prev) => prev.filter((item) => item.id !== toastId));

    try {
      window.dispatchEvent(
        new CustomEvent("qring:flash_dismissed", {
          detail: {
            kind: toast?.kind || "",
            title: toast?.title || "",
            message: toast?.message || ""
          }
        })
      );
    } catch {
      // Ignore event dispatch failures.
    }
  }, []);

  useEffect(() => {
    const show = (event) => {
      const toast = normalizeToast(event?.detail ?? {});
      if (!toast) return;

      const now = Date.now();
      const lastAnyAt = lastAnyToastAtRef.current || 0;
      if (now - lastAnyAt < 250) return;
      lastAnyToastAtRef.current = now;

      const lastAt = lastByDedupeKeyRef.current.get(toast.dedupeKey) || 0;
      if (now - lastAt < 4500) return;
      lastByDedupeKeyRef.current.set(toast.dedupeKey, now);

      setToasts((prev) => {
        const existingIndex = prev.findIndex((item) => item.dedupeKey === toast.dedupeKey);
        if (existingIndex >= 0) {
          const existing = prev[existingIndex];
          const merged = { ...existing, ...toast, id: existing.id };
          const next = [...prev];
          next[existingIndex] = merged;
          return next;
        }
        return [toast, ...prev].slice(0, 3);
      });

      const existingTimer = timerByIdRef.current.get(toast.id);
      if (existingTimer) window.clearTimeout(existingTimer);
      timerByIdRef.current.set(
        toast.id,
        window.setTimeout(() => removeToast(toast.id, toast), toast.duration)
      );
    };

    window.addEventListener("qring:toast", show);
    window.addEventListener("qring:flash", show);
    return () => {
      window.removeEventListener("qring:toast", show);
      window.removeEventListener("qring:flash", show);
      for (const timer of timerByIdRef.current.values()) {
        window.clearTimeout(timer);
      }
      timerByIdRef.current.clear();
    };
  }, [removeToast]);

  const containerClass = useMemo(() => {
    return "fixed inset-x-0 top-0 z-[70] flex justify-center px-3 pt-[calc(0.65rem+env(safe-area-inset-top))] sm:justify-end sm:px-4 sm:pt-5";
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className={containerClass} aria-live="polite" aria-relevant="additions removals">
      <div className="flex w-full max-w-md flex-col gap-2 sm:max-w-sm">
        {toasts.map((toast) => {
          const palette = paletteByType[toast.type] ?? paletteByType.info;
          const Icon = iconByType[toast.type] ?? iconByType.info;
          const accent = accentByType[toast.type] ?? accentByType.info;
          const canNavigate = Boolean(toast.route && toast.route.startsWith("/"));
          const actionLabel = toast.actionLabel || (canNavigate ? "Open" : "");

          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto w-full overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-sm transition-all ${palette}`}
            >
              <div className={`h-1 w-full ${accent.split(" ")[0]}`} />
              <div className="flex items-start gap-3 p-3">
                <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 ${accent.split(" ")[1]} ring-1 ring-black/5 dark:bg-slate-800`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{toast.title}</p>
                  <p className="mt-1 break-words text-sm font-bold leading-5 text-slate-900 dark:text-white">{toast.message}</p>
                  {actionLabel ? (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (canNavigate) {
                            navigate(toast.route);
                          }
                          removeToast(toast.id, toast);
                        }}
                        className="rounded-lg bg-slate-950 px-3 py-1.5 text-[12px] font-black text-white ring-1 ring-black/5 transition hover:bg-slate-800 active:scale-[0.99] dark:bg-white dark:text-slate-950"
                      >
                        {actionLabel}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeToast(toast.id, toast)}
                        className="rounded-lg px-2 py-1.5 text-[12px] font-bold text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      >
                        Dismiss
                      </button>
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id, toast)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label="Close alert"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mx-3 mb-3 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full ${accent.split(" ")[0]}`}
                  style={{
                    animation: `qring_toast_progress ${toast.duration}ms linear forwards`
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes qring_toast_progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
