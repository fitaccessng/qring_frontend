import { AlertTriangle, ArrowRight, Flag, Phone, ShieldCheck, UserCheck, X } from "lucide-react";

export default function PanicAlertModal({
  alert,
  busy = false,
  canAcknowledge = true,
  canRespond = false,
  onAcknowledge,
  onRespond,
  onIgnore,
  onReportFalse,
  onOpenDetails,
  onDismiss
}) {
  if (!alert) return null;

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/88 p-4">
      <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_top,#ef444466_0%,transparent_42%)]" />
      <div className="relative mx-auto flex min-h-full max-w-lg items-center">
        <div className="w-full rounded-[2rem] border border-rose-500/60 bg-[#120304] p-6 text-white shadow-[0_30px_90px_rgba(239,68,68,0.24)]">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-600 text-white">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-rose-200">Emergency Alert</p>
              <h2 className="mt-1 text-3xl font-black tracking-tight">EMERGENCY ALERT</h2>
            </div>
          </div>

          <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
            <p className="text-2xl font-bold">{alert.userName || "Resident"}</p>
            <p className="mt-2 text-sm text-white/80">
              {alert.location?.blurredAddress || alert.location?.doorName || alert.unitLabel || "Location unavailable"}
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.28em] text-rose-200">
              {alert.acknowledged ? "Acknowledged" : "Awaiting acknowledgement"}
            </p>
            <p className="mt-2 text-sm text-white/70">
              Triggered {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : "just now"}
            </p>
            {alert.responderCount ? (
              <p className="mt-2 text-sm text-emerald-300">{alert.responderCount} responder{alert.responderCount === 1 ? "" : "s"} already in motion.</p>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {canAcknowledge ? (
              <button
                type="button"
                disabled={busy || !canAcknowledge || alert.acknowledged}
                onClick={onAcknowledge}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-black disabled:opacity-60"
              >
                <ShieldCheck className="h-4 w-4" />
                {busy ? "Acknowledging..." : alert.acknowledged ? "Acknowledged" : "Acknowledge"}
              </button>
            ) : canRespond ? (
              <button
                type="button"
                disabled={busy}
                onClick={onRespond}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                <UserCheck className="h-4 w-4" />
                {busy ? "Updating..." : "I'm Responding"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onOpenDetails}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-semibold text-white"
            >
              Open Details
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {canRespond ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <a
                href={alert.userPhone ? `tel:${alert.userPhone}` : undefined}
                className={`inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-3 text-sm font-semibold ${alert.userPhone ? "bg-white/5 text-white" : "bg-white/5 text-white/40 pointer-events-none"}`}
              >
                <Phone className="h-4 w-4" />
                Call User
              </a>
              <button
                type="button"
                disabled={busy}
                onClick={onIgnore}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-transparent px-4 py-3 text-sm font-semibold text-white/80 disabled:opacity-60"
              >
                <X className="h-4 w-4" />
                Ignore
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onReportFalse}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100 disabled:opacity-60"
              >
                <Flag className="h-4 w-4" />
                Report False
              </button>
            </div>
          ) : null}

          {alert.acknowledged ? (
            <button
              type="button"
              onClick={onDismiss}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-transparent px-5 py-3 text-sm font-semibold text-white/80"
            >
              <X className="h-4 w-4" />
              Dismiss Alert
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
