import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Mic, MicOff, PhoneOff, Video, VideoOff, RotateCw } from "lucide-react";
import VisitorIncomingCallModal from "../../components/VisitorIncomingCallModal";
import { useSessionRealtime } from "../../hooks/useSessionRealtime";

export default function SessionVideoPage() {
  const { sessionId } = useParams();
  const exitRoute = getExitRoute(sessionId);
  const {
    callState,
    muted,
    cameraOn,
    localStreamRef,
    callLaunchStartedAt,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    incomingCall,
    canStartCall,
    remoteVideoActive,
    toggleMute,
    endCall,
    startVideoCall,
    acceptIncomingCall,
    rejectIncomingCall,
  } = useSessionRealtime(sessionId);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const showRemoteAsPrimary = callState === "connected" && remoteVideoActive;

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
      {/* Google Font + keyframes */}
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
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .fade-up { animation: fade-up .45s ease both; }
      `}</style>

      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* ── PRIMARY VIDEO SURFACE ── */}
      <div className="relative flex-1 overflow-hidden bg-[#0c0e11]">

        {/* Primary Feed */}
        <video
          ref={showRemoteAsPrimary ? remoteVideoRef : localVideoRef}
          autoPlay
          playsInline
          muted={!showRemoteAsPrimary}
          className="h-full w-full object-cover"
        />

        {/* Top vignette */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-black/70 via-black/20 to-transparent" />

        {/* Bottom vignette */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/60 to-transparent" />

        {/* ── TOP IDENTITY BAR ── */}
        <div className="absolute inset-x-0 top-0 flex flex-col items-center pt-14 fade-up">
          <h2 className="font-syne text-[22px] font-semibold tracking-[0.22em] text-white/95 uppercase">
            {showRemoteAsPrimary ? "Visitor" : "Connecting"}
          </h2>

          <div className="font-dm mt-2 flex items-center gap-2 text-[11px] font-medium tracking-[0.18em] uppercase text-white/45">
            {isConnected && (
              <span className="live-dot inline-block h-[6px] w-[6px] rounded-full bg-emerald-400" />
            )}
            <span>
              {isConnected ? formatTime(elapsedSeconds) : "Video Call"}
            </span>
          </div>
        </div>

        {/* ── MINI PREVIEW ── */}
        <div className="absolute top-[88px] right-4 w-[104px] h-[148px] rounded-[18px] overflow-hidden border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.65)] bg-[#12151a]">
          <video
            ref={showRemoteAsPrimary ? localVideoRef : remoteVideoRef}
            autoPlay
            playsInline
            muted={showRemoteAsPrimary}
            className="h-full w-full object-cover"
          />
          {!cameraOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#1a1d24]">
              <VideoOff size={18} className="text-white/30" />
            </div>
          )}
        </div>

      </div>

      {/* ── CONTROL BAR ── */}
      <div className="relative z-10 bg-[#0d1014]/95 backdrop-blur-2xl border-t border-white/[0.06] px-8 pt-7 pb-10">

        {/* Ambient bloom */}
        <div className="pointer-events-none absolute inset-x-0 -top-10 flex justify-center">
          <div className="h-20 w-56 rounded-full bg-sky-500/[0.06] blur-3xl" />
        </div>

        <div className="relative mx-auto flex max-w-[300px] items-end justify-between">

          {/* Flip */}
          <ControlButton icon={<RotateCw size={21} />} label="Flip" onClick={() => {}} />

          {/* Camera */}
          <ControlButton
            icon={cameraOn ? <Video size={21} /> : <VideoOff size={21} />}
            label="Camera"
            active={!cameraOn}
            onClick={() => {}}
          />

          {/* Mute */}
          <ControlButton
            icon={muted ? <MicOff size={21} /> : <Mic size={21} />}
            label="Mute"
            active={muted}
            onClick={toggleMute}
          />

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
    if (user?.role === "visitor") return `/session/${sessionId}/message`;
    return "/dashboard/homeowner/overview";
  } catch {
    return `/session/${sessionId}/message`;
  }
}