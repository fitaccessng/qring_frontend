import { Phone, PhoneOff, Video } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getNotificationAudioContextState, unlockNotificationAudio } from "../utils/notificationSound";

export default function VisitorIncomingCallModal({ open, hasVideo, onAccept, onReject }) {
  if (!open) return null;

  const [audioState, setAudioState] = useState(() => getNotificationAudioContextState());
  const showSoundUnlock = audioState !== "running";

  useEffect(() => {
    if (!open) return;
    setAudioState(getNotificationAudioContextState());
  }, [open]);

  const handleUnlockSound = useCallback(async () => {
    await unlockNotificationAudio();
    setAudioState(getNotificationAudioContextState());
  }, []);

  const handleAccept = useCallback(async () => {
    await unlockNotificationAudio();
    onAccept?.();
  }, [onAccept]);

  const handleReject = useCallback(async () => {
    await unlockNotificationAudio();
    onReject?.();
  }, [onReject]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/82 px-5 py-6 backdrop-blur-md">
      <section className="w-full max-w-sm rounded-[28px] border border-white/15 bg-[#0f1720] p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Incoming call</p>
        <h2 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight">
          {hasVideo ? "Homeowner Video Call" : "Homeowner Audio Call"}
        </h2>
        <p className="mt-1.5 text-[13px] text-white/70">Tap to answer quickly or decline to stay in chat.</p>

        {showSoundUnlock ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white/80">
            <span>Ringtone may be muted until a tap enables sound.</span>
            <button
              type="button"
              onClick={handleUnlockSound}
              className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-white/20"
            >
              Enable sound
            </button>
          </div>
        ) : null}

        <div className="mt-5 grid place-items-center">
          <div className="grid h-24 w-24 place-items-center rounded-full bg-white/12">
            {hasVideo ? <Video size={34} className="text-emerald-300" /> : <Phone size={34} className="text-emerald-300" />}
          </div>
        </div>

        <div className="mt-7 space-y-3.5">
          <button
            type="button"
            onClick={handleAccept}
            className="flex h-14 w-full items-center justify-between rounded-2xl bg-emerald-500 px-4 text-left text-white transition-all hover:bg-emerald-400 active:scale-[0.99]"
          >
            <span>
              <span className="block text-[14px] font-semibold">Accept</span>
              <span className="text-[11px] text-emerald-50/90">Swipe/tap to join now</span>
            </span>
            <Phone size={18} />
          </button>
          <button
            type="button"
            onClick={handleReject}
            className="flex h-14 w-full items-center justify-between rounded-2xl bg-rose-500 px-4 text-left text-white transition-all hover:bg-rose-400 active:scale-[0.99]"
          >
            <span>
              <span className="block text-[14px] font-semibold">Decline</span>
              <span className="text-[11px] text-rose-50/90">Stay in chat</span>
            </span>
            <PhoneOff size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}
