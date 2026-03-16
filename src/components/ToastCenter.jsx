import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const paletteByType = {
  success: "border-emerald-200/70 bg-emerald-50 text-emerald-950",
  error: "border-rose-200/70 bg-rose-50 text-rose-950",
  warning: "border-amber-200/70 bg-amber-50 text-amber-950",
  info: "border-sky-200/70 bg-sky-50 text-sky-950"
};

const iconByType = {
  success: "✓",
  error: "!",
  warning: "!",
  info: "i"
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
  const id = String(detail?.id ?? "").trim();

  const dedupeKeyRaw = String(detail?.dedupeKey ?? "").trim();
  const dedupeKey = dedupeKeyRaw || `${kind}|${type}|${title}|${message}|${route}`;

  return {
    id: id || `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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
      const lastAt = lastByDedupeKeyRef.current.get(toast.dedupeKey) || 0;
      if (now - lastAt < 900) return;
      lastByDedupeKeyRef.current.set(toast.dedupeKey, now);

      setToasts((prev) => {
        const next = [toast, ...prev].slice(0, 4);
        return next;
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
          const icon = iconByType[toast.type] ?? iconByType.info;
          const canNavigate = Boolean(toast.route && toast.route.startsWith("/"));
          const actionLabel = toast.actionLabel || (canNavigate ? "Open" : "");

          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto w-full overflow-hidden rounded-2xl border p-3 shadow-2xl backdrop-blur-sm transition-all ${palette}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black/5 text-xs font-black">
                  {icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{toast.title}</p>
                  <p className="mt-1 break-words text-sm font-medium">{toast.message}</p>
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
                        className="rounded-full bg-black/10 px-3 py-1 text-[12px] font-semibold transition hover:bg-black/15 active:scale-[0.99]"
                      >
                        {actionLabel}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeToast(toast.id, toast)}
                        className="rounded-full px-2 py-1 text-[12px] font-semibold opacity-70 transition hover:opacity-100"
                      >
                        Dismiss
                      </button>
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id, toast)}
                  className="rounded-full p-1 text-xs font-bold opacity-70 transition hover:opacity-100 active:scale-95"
                  aria-label="Close alert"
                  title="Close"
                >
                  ×
                </button>
              </div>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-black/5">
                <div
                  className="h-full bg-black/20"
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

