import { useEffect, useState } from "react";

export default function BlockingModal() {
  const [modal, setModal] = useState(null);

  useEffect(() => {
    const handleOpen = (event) => {
      const detail = event?.detail ?? {};
      const message = String(detail.message ?? "").trim();
      if (!message) return;
      const title = String(detail.title ?? "Notice").trim() || "Notice";
      setModal({ title, message });
    };

    window.addEventListener("qring:blocking", handleOpen);
    return () => window.removeEventListener("qring:blocking", handleOpen);
  }, []);

  if (!modal) return null;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qring-blocking-title"
        className="w-full max-w-md rounded-3xl border border-amber-200/50 bg-white p-5 text-slate-900 shadow-2xl"
      >
        <p id="qring-blocking-title" className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
          {modal.title}
        </p>
        <p className="mt-3 text-base font-semibold text-slate-900">{modal.message}</p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => setModal(null)}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Ok, understood
          </button>
        </div>
      </div>
    </div>
  );
}
