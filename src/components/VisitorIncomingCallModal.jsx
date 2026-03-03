export default function VisitorIncomingCallModal({ open, hasVideo, onAccept, onReject }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-slate-950/65 px-4 pt-[calc(0.7rem+env(safe-area-inset-top))] backdrop-blur-sm sm:pt-6">
      <section className="w-full max-w-md rounded-3xl border border-white/15 bg-[#111b21] p-4 text-white shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#00a884]">Incoming Call</p>
          <button
            type="button"
            onClick={onReject}
            className="rounded-full px-2 py-1 text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white active:scale-95"
            aria-label="Dismiss incoming call"
            title="Dismiss"
          >
            x
          </button>
        </div>
        <h2 className="mt-1 font-heading text-xl font-black leading-tight sm:text-2xl">
          {hasVideo ? "Homeowner calling (Video)" : "Homeowner calling (Audio)"}
        </h2>
        <p className="mt-2 text-sm text-slate-300">Join now or decline and stay in chat.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onAccept}
            className="rounded-xl bg-[#00a884] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#019575]"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={onReject}
            className="rounded-xl bg-[#e53935] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#cd2f2b]"
          >
            Reject
          </button>
        </div>
      </section>
    </div>
  );
}
