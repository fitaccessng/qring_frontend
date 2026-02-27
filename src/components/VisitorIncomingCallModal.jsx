export default function VisitorIncomingCallModal({ open, hasVideo, onAccept, onReject }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <section className="w-full max-w-sm rounded-3xl border border-white/15 bg-[#111b21] p-5 text-white shadow-soft max-h-[88vh] overflow-y-auto">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#00a884]">Incoming Call</p>
        <h2 className="mt-2 font-heading text-xl font-black leading-tight sm:text-2xl">
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
