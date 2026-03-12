import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../state/AuthContext";

const paletteByType = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-rose-200 bg-rose-50 text-rose-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-sky-200 bg-sky-50 text-sky-900"
};

const allowedRoles = new Set(["homeowner", "estate"]);

export default function NotificationModal() {
  const { user } = useAuth();
  const [flash, setFlash] = useState(null);
  const timerRef = useRef(null);
  const canShow = allowedRoles.has(String(user?.role || "").toLowerCase());

  useEffect(() => {
    if (!canShow) return () => {};
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
      const kind = String(detail.kind ?? "").trim();

      setFlash({ message, type, title, kind });
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setFlash(null), Math.max(1400, duration));
    };

    window.addEventListener("qring:toast", showFlash);
    window.addEventListener("qring:flash", showFlash);
    return () => {
      window.removeEventListener("qring:toast", showFlash);
      window.removeEventListener("qring:flash", showFlash);
      window.clearTimeout(timerRef.current);
    };
  }, [canShow]);

  const palette = useMemo(() => paletteByType[flash?.type] ?? paletteByType.info, [flash?.type]);

  if (!flash || !canShow) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-live="polite"
        aria-labelledby="qring-notification-title"
        className={`w-full max-w-md rounded-3xl border p-5 shadow-2xl ${palette}`}
      >
        <p id="qring-notification-title" className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
          {flash.title}
        </p>
        <p className="mt-3 text-base font-semibold">{flash.message}</p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => {
              try {
                window.dispatchEvent(
                  new CustomEvent("qring:flash_dismissed", {
                    detail: {
                      kind: flash.kind || "",
                      title: flash.title,
                      message: flash.message
                    }
                  })
                );
              } catch {
                // Ignore event dispatch failures.
              }
              window.clearTimeout(timerRef.current);
              setFlash(null);
            }}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Ok, got it
          </button>
        </div>
      </div>
    </div>
  );
}
