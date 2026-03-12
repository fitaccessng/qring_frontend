import { useEffect, useRef, useState } from "react";

export default function ReconnectBanner() {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const handle = (event) => {
      const detail = event?.detail ?? {};
      const status = detail.status || "show";
      if (status === "hide") {
        window.clearTimeout(timerRef.current);
        setVisible(false);
        return;
      }
      setVisible(true);
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setVisible(false), 5000);
    };
    window.addEventListener("qring:reconnect", handle);
    return () => {
      window.removeEventListener("qring:reconnect", handle);
      window.clearTimeout(timerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center px-3 pt-[calc(0.55rem+env(safe-area-inset-top))] sm:px-4 sm:pt-4">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 shadow-md">
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
        Reconnecting… the server may still be waking up.
      </div>
    </div>
  );
}
