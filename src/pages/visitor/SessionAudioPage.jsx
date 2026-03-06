import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Mic, MicOff, PhoneOff, Volume2, User, ChevronDown, Lock } from "lucide-react";
import VisitorIncomingCallModal from "../../components/VisitorIncomingCallModal";
import { useSessionRealtime } from "../../hooks/useSessionRealtime";

export default function SessionAudioPage() {
  const { sessionId } = useParams();
  const exitRoute = getExitRoute(sessionId);
  const {
    callState,
    muted,
    remoteMuted,
    remoteAudioRef,
    callLaunchStartedAt,
    incomingCall,
    canStartCall,
    toggleMute,
    endCall,
    acceptIncomingCall,
    rejectIncomingCall,
  } = useSessionRealtime(sessionId);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (callState !== "connected" || !callLaunchStartedAt) {
      setElapsedSeconds(0);
      return;
    }
    const tick = () =>
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - callLaunchStartedAt) / 1000)));
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [callLaunchStartedAt, callState]);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isConnected = callState === "connected";

  return (
    <div className="fixed inset-0 flex flex-col bg-[#07090b] text-white overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700&family=DM+Sans:wght@300;400;500&display=swap');
        .font-syne { font-family: 'Syne', sans-serif; }
        .font-dm   { font-family: 'DM Sans', sans-serif; }
        @keyframes live-pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:.35; transform:scale(.65); }
        }
        .live-dot { animation: live-pulse 2s ease-in-out infinite; }
        @keyframes fade-up {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .fade-up { animation: fade-up .5s ease both; }
        @keyframes ring-pulse {
          0%   { transform:scale(1);   opacity:.18; }
          70%  { transform:scale(1.55); opacity:0; }
          100% { transform:scale(1.55); opacity:0; }
        }
        .ring-1 { animation: ring-pulse 2.4s ease-out infinite; }
        .ring-2 { animation: ring-pulse 2.4s ease-out .8s infinite; }
        .ring-3 { animation: ring-pulse 2.4s ease-out 1.6s infinite; }
      `}</style>

      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* ── BACKGROUND ── */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0a0d10] via-[#07090b] to-[#07090b]" />
      {/* Warm ambient bloom behind avatar */}
      <div className="pointer-events-none absolute top-[18%] left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-teal-500/[0.07] blur-3xl" />

      {/* ── HEADER ── */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-12 pb-4 fade-up">
        <Link
          to={exitRoute}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.07] border border-white/[0.08] transition-all hover:bg-white/[0.12] active:scale-90"
        >
          <ChevronDown size={20} className="text-white/70" />
        </Link>

        <div className="flex items-center gap-1.5 font-dm text-[10px] font-medium uppercase tracking-[0.18em] text-white/30">
          <Lock size={9} />
          <span>End-to-end encrypted</span>
        </div>

        <div className="w-9" />
      </header>

      {/* ── MAIN CALL INFO ── */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center fade-up">

        {/* Ripple rings — visible only when ringing */}
        {!isConnected && (
          <div className="absolute flex items-center justify-center">
            <span className="ring-1 absolute inline-block h-36 w-36 rounded-full bg-teal-400" />
            <span className="ring-2 absolute inline-block h-36 w-36 rounded-full bg-teal-400" />
            <span className="ring-3 absolute inline-block h-36 w-36 rounded-full bg-teal-400" />
          </div>
        )}

        {/* Avatar */}
        <div className="relative mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-400 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_16px_48px_rgba(0,0,0,0.5)]">
          <User size={58} className="text-white/90" fill="currentColor" />
          {/* Live indicator dot — only when connected */}
          {isConnected && (
            <span className="live-dot absolute bottom-1 right-1 h-4 w-4 rounded-full bg-emerald-400 ring-2 ring-[#07090b]" />
          )}
        </div>

        {/* Identity */}
        <h1 className="font-syne text-[24px] font-semibold tracking-[0.18em] uppercase text-white/95 mb-3">
          Visitor
        </h1>

        {/* Status / timer */}
        <div className="font-dm flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.16em] text-white/40">
          {isConnected && <span className="live-dot inline-block h-[6px] w-[6px] rounded-full bg-emerald-400" />}
          <span>{isConnected ? formatTime(elapsedSeconds) : "Ringing…"}</span>
        </div>

        {/* Remote muted badge */}
        {remoteMuted && (
          <div className="mt-7 flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.05] px-4 py-1.5 font-dm text-[11px] tracking-[0.10em] uppercase text-white/40">
            <MicOff size={11} className="text-white/30" />
            Visitor is muted
          </div>
        )}
      </main>

      {/* ── CONTROL BAR ── */}
      <div className="relative z-10 bg-[#0d1014]/95 backdrop-blur-2xl border-t border-white/[0.06] px-8 pt-7 pb-10">

        {/* Ambient bloom */}
        <div className="pointer-events-none absolute inset-x-0 -top-10 flex justify-center">
          <div className="h-20 w-56 rounded-full bg-teal-500/[0.05] blur-3xl" />
        </div>

        <div className="relative mx-auto flex max-w-[300px] items-end justify-between">

          {/* Speaker */}
          <ControlButton icon={<Volume2 size={21} />} label="Speaker" onClick={() => {}} />

          {/* Mute */}
          <ControlButton
            icon={muted ? <MicOff size={21} /> : <Mic size={21} />}
            label="Mute"
            active={muted}
            onClick={toggleMute}
          />

          {/* Contacts / Add */}
          <ControlButton icon={<User size={21} />} label="Add" onClick={() => {}} />

          {/* End Call */}
          <div className="flex flex-col items-center gap-[10px]">
            <button
              onClick={endCall}
              className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 shadow-[0_6px_28px_rgba(244,63,94,0.45)] transition-all duration-150 active:scale-90 hover:shadow-[0_8px_36px_rgba(244,63,94,0.55)] focus:outline-none"
            >
              <PhoneOff size={24} className="text-white" />
            </button>
            <span className="font-dm text-[10px] font-medium uppercase tracking-[0.14em] text-white/30">
              End
            </span>
          </div>

        </div>

        {/* Handle pill */}
        <div className="mt-5 flex justify-center">
          <div className="h-[5px] w-10 rounded-full bg-white/10" />
        </div>
      </div>

      {/* ── MODALS ── */}
      <VisitorIncomingCallModal
        open={incomingCall.pending && !canStartCall}
        hasVideo={incomingCall.hasVideo}
        onAccept={acceptIncomingCall}
        onReject={rejectIncomingCall}
      />
    </div>
  );
}

/* ── Reusable Control Button ── */
function ControlButton({ icon, label, onClick, active = false }) {
  return (
    <div className="flex flex-col items-center gap-[10px]">
      <button
        onClick={onClick}
        className={`flex h-[52px] w-[52px] items-center justify-center rounded-full border transition-all duration-150 focus:outline-none active:scale-90 ${
          active
            ? "border-white/20 bg-white text-[#07090b] shadow-[0_4px_20px_rgba(255,255,255,0.15)]"
            : "border-white/[0.08] bg-white/[0.07] text-white hover:bg-white/[0.13] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        }`}
      >
        {icon}
      </button>
      <span className="font-dm text-[10px] font-medium uppercase tracking-[0.14em] text-white/30">
        {label}
      </span>
    </div>
  );
}

/* ── Helpers ── */
function getExitRoute(sessionId) {
  try {
    const user = JSON.parse(localStorage.getItem("qring_user") || "null");
    return user?.role === "visitor"
      ? `/session/${sessionId}/message`
      : "/dashboard/homeowner/overview";
  } catch {
    return `/session/${sessionId}/message`;
  }
}
