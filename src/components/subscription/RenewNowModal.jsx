import { Link } from "react-router-dom";

export default function RenewNowModal({ open, subscription, onClose }) {
  if (!open || !subscription?.isBillPayer) return null;

  const isSuspended = subscription.status === "suspended";
  const isGracePeriod = subscription.status === "grace_period";

  return (
    <div className="fixed inset-0 z-[75] grid place-items-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qring-renew-title"
        className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">
          Subscription
        </p>
        <h2 id="qring-renew-title" className="mt-3 text-2xl font-black tracking-tight">
          {isSuspended ? "Restore QRing service" : isGracePeriod ? "Renew during grace period" : "Renew before expiry"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {isSuspended
            ? "Service is paused, but your visitor logs, residents, and settings are still preserved. Renew now to restore everything instantly."
            : isGracePeriod
              ? "Core visitor handling still works right now, but setup and growth features are already limited. Renew now to avoid a full pause."
              : "Renewing early keeps gate operations, homeowner responses, and realtime visitor handling uninterrupted."}
        </p>
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Current status</p>
          <p className="mt-1 capitalize">{String(subscription.status || "inactive").replaceAll("_", " ")}</p>
          {subscription.expiresAt ? (
            <p className="mt-1">Expiry: {new Date(subscription.expiresAt).toLocaleString()}</p>
          ) : null}
          {subscription.graceEndsAt ? (
            <p className="mt-1">Grace ends: {new Date(subscription.graceEndsAt).toLocaleString()}</p>
          ) : null}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Not now
          </button>
          <Link
            to="/billing/paywall"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Renew Now
          </Link>
        </div>
      </div>
    </div>
  );
}
