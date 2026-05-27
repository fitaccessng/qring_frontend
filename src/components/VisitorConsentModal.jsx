import { useEffect, useRef } from "react";

export default function VisitorConsentModal({ open, onAccept }) {
  const acceptButtonRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => {
      acceptButtonRef.current?.focus();
    });

    const handleKeyDown = (event) => {
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      );
      const focusables = Array.from(focusable || []).filter((item) => !item.hasAttribute("disabled"));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 px-4 py-6 backdrop-blur-sm" role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="visitor-consent-title"
        aria-describedby="visitor-consent-description"
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-950 p-6 text-white shadow-2xl"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/50">Privacy notice</p>
        <h2 id="visitor-consent-title" className="mt-2 text-xl font-black tracking-tight">
          Visitor Data Consent
        </h2>
        <p id="visitor-consent-description" className="mt-3 text-sm leading-6 text-white/70">
          We keep your selfie and request details for visitor management and homeowner approval.
          Consent is required before camera access, QR resolution, or request submission.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-white/75">
          <li>Data is retained for a limited period.</li>
          <li>Consent expires when the browser session ends or after the configured timeout.</li>
          <li>You can continue only after accepting this notice.</li>
        </ul>
        <button
          ref={acceptButtonRef}
          type="button"
          onClick={onAccept}
          className="mt-6 w-full rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          I Consent & Continue
        </button>
      </div>
    </div>
  );
}
