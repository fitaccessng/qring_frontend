import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Mic, PhoneOff, RefreshCw, Volume2 } from "lucide-react";
import VisitorIncomingCallModal from "../../components/VisitorIncomingCallModal";
import { useSessionRealtime } from "../../hooks/useSessionRealtime";

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function SessionAudioPage() {
  const { sessionId } = useParams();
  const exitRoute = getExitRoute(sessionId);
  const {
    callState,
    muted,
    speakerOn,
    status,
    networkQuality,
    featureError,
    localStreamRef,
    remoteMuted,
    remoteAudioRef,
    incomingCall,
    canStartCall,
    startAudioCall,
    toggleMute,
    toggleSpeaker,
    endCall,
    retryCallConnection,
    acceptIncomingCall,
    rejectIncomingCall
  } = useSessionRealtime(sessionId);

  const [connectedSeconds, setConnectedSeconds] = useState(0);
  const showReconnectBanner = networkQuality === "reconnecting" || networkQuality === "slow";

  useEffect(() => {
    if (callState !== "connected") {
      setConnectedSeconds(0);
      return;
    }
    const start = Date.now();
    const timer = setInterval(() => {
      setConnectedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [callState]);

  return (
    <div className="min-h-screen bg-[#0b1118] text-white">
      <section className="relative mx-auto min-h-screen w-full max-w-md overflow-hidden">
        <audio ref={remoteAudioRef} autoPlay playsInline />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.28),transparent_58%)]" />

        <header className="relative z-20 flex items-start justify-between px-5 pb-2 pt-[calc(1rem+env(safe-area-inset-top))]">
          <div>
            <p className="text-[22px] font-semibold leading-tight tracking-tight">Homeowner</p>
            <p className="mt-0.5 text-[13px] font-medium text-white/85">
              {callState === "connected" ? formatDuration(connectedSeconds) : callState}
            </p>
            <p className="mt-0.5 text-[12px] text-white/70">{formatNetworkLabel(networkQuality)}</p>
          </div>
          <Link to={exitRoute} className="rounded-full bg-white/20 px-3 py-1.5 text-[11px] font-semibold backdrop-blur">
            Back
          </Link>
        </header>

        {showReconnectBanner ? (
          <div className="relative z-20 mx-5 rounded-xl bg-amber-500/25 px-3 py-2 text-[12px] text-amber-100 backdrop-blur">
            {networkQuality === "reconnecting" ? "Reconnecting..." : "Connection unstable"} {status ? `| ${status}` : ""}
          </div>
        ) : null}

        <div className="relative z-10 mt-24 flex flex-col items-center justify-center px-5">
          <div className="relative h-44 w-44 rounded-full border border-white/25 bg-white/8">
            <div className="absolute inset-4 animate-pulse rounded-full border border-emerald-300/45" />
            <div className="absolute inset-9 animate-pulse rounded-full border border-emerald-300/25" />
            <div className="absolute inset-0 grid place-items-center">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-white/18">
                <Volume2 size={34} className={remoteMuted ? "text-white/35" : "text-white"} />
              </div>
            </div>
          </div>
          <p className="mt-5 text-[14px] font-medium text-white/80">{remoteMuted ? "Remote microphone muted" : "Audio stream active"}</p>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-30 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {featureError ? (
            <div className="mb-3 rounded-xl bg-rose-500/25 px-3 py-2 text-[12px] text-rose-100">{featureError}</div>
          ) : null}
          <div className="rounded-[28px] border border-white/20 bg-black/52 p-4 backdrop-blur-md">
            <div className="grid grid-cols-4 gap-2.5">
              <CallControl
                label={muted ? "Unmute" : "Mute"}
                onClick={toggleMute}
                disabled={!localStreamRef.current}
                icon={<Mic size={17} />}
              />
              <CallControl
                label={speakerOn ? "Speaker" : "Earpiece"}
                onClick={toggleSpeaker}
                disabled={callState !== "connected"}
                icon={<Volume2 size={17} />}
              />
              <CallControl label="Retry" onClick={retryCallConnection} disabled={!canStartCall} icon={<RefreshCw size={17} />} />
              <button
                type="button"
                onClick={endCall}
                className="grid h-14 place-items-center rounded-2xl bg-rose-500 text-white transition-all active:scale-95"
              >
                <PhoneOff size={18} />
              </button>
            </div>
            <button
              type="button"
              onClick={startAudioCall}
              disabled={Boolean(featureError) || !canStartCall}
              className="mt-3.5 h-12 w-full rounded-2xl bg-white/20 px-4 text-[14px] font-semibold disabled:opacity-45"
            >
              Start Audio Call
            </button>
          </div>
        </div>
      </section>

      <VisitorIncomingCallModal
        open={incomingCall.pending && !canStartCall}
        hasVideo={incomingCall.hasVideo}
        onAccept={acceptIncomingCall}
        onReject={rejectIncomingCall}
      />
    </div>
  );
}

function CallControl({ label, icon, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="grid h-14 place-items-center rounded-2xl bg-white/15 text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span className="flex flex-col items-center gap-0.5">
        {icon}
        <span className="text-[10px] font-medium leading-none">{label}</span>
      </span>
    </button>
  );
}

function getExitRoute(sessionId) {
  try {
    const user = JSON.parse(localStorage.getItem("qring_user") || "null");
    if (!user?.role || user.role === "visitor") return `/session/${sessionId}/message`;
    if (user.role === "admin") return "/dashboard/admin";
    if (user.role === "estate") return "/dashboard/estate";
    return "/dashboard/homeowner/visits";
  } catch {
    return `/session/${sessionId}/message`;
  }
}

function formatNetworkLabel(quality) {
  if (quality === "good") return "Connection stable";
  if (quality === "slow") return "Connection unstable";
  if (quality === "reconnecting") return "Reconnecting";
  return quality || "Reconnecting";
}
