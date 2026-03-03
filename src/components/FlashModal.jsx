import { useEffect, useMemo, useRef, useState } from "react";

const paletteByType = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-rose-200 bg-rose-50 text-rose-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-sky-200 bg-sky-50 text-sky-900"
};

export default function FlashModal() {
  const [flash, setFlash] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const showFlash = (event) => {
      const detail = event?.detail ?? {};
      const message = String(detail.message ?? "").trim();
      if (!message) return;

      const type = detail.type ?? "info";
      const title =
        detail.title ??
        (type === "success"
          ? "Success"
          : type === "error"
            ? "Something went wrong"
            : type === "warning"
              ? "Attention"
              : "Notice");
      const duration = Number.isFinite(Number(detail.duration)) ? Number(detail.duration) : 3600;

      setFlash({ message, type, title });
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setFlash(null), Math.max(1200, duration));
    };

    window.addEventListener("qring:toast", showFlash);
    window.addEventListener("qring:flash", showFlash);
    return () => {
      window.removeEventListener("qring:toast", showFlash);
      window.removeEventListener("qring:flash", showFlash);
      window.clearTimeout(timerRef.current);
    };
  }, []);

  const palette = useMemo(() => paletteByType[flash?.type] ?? paletteByType.info, [flash?.type]);

  if (!flash) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-[calc(0.65rem+env(safe-area-inset-top))] sm:px-4 sm:pt-5">
      <div
        className={`pointer-events-auto w-full max-w-md rounded-2xl border p-3 shadow-2xl backdrop-blur-sm transition-all duration-300 ${palette}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{flash.title}</p>
            <p className="mt-1 text-sm font-medium">{flash.message}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              window.clearTimeout(timerRef.current);
              setFlash(null);
            }}
            className="rounded-full p-1 text-xs font-bold opacity-70 transition hover:opacity-100 active:scale-95"
            aria-label="Close alert"
            title="Close"
          >
            x
          </button>
        </div>
      </div>
    </div>
  );
}
