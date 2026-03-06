import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Camera, Mic, PhoneOff, RefreshCw, Signal, Video } from "lucide-react";
import SessionNetworkBadge from "../../components/SessionNetworkBadge";
import SessionDiagnosticsPanel from "../../components/SessionDiagnosticsPanel";
import VisitorIncomingCallModal from "../../components/VisitorIncomingCallModal";
import { useSessionRealtime } from "../../hooks/useSessionRealtime";

export default function SessionVideoPage() {
  const { sessionId } = useParams();
  const exitRoute = getExitRoute(sessionId);
  const {
    connected,
    joined,
    callState,
    muted,
    cameraOn,
    remoteMuted,
    localStreamRef,
    status,
    networkQuality,
    networkDetail,
    callDiagnostics,
    featureError,
    callLaunchStage,
    callLaunchStartedAt,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    incomingCall,
    canStartCall,
    remoteVideoActive,
    lowBandwidthMode,
    autoLowBandwidthActive,
    isMobileWebView,
    setLowBandwidthMode,
    toggleMute,
    endCall,
    startVideoCall,
    retryCallConnection,
    acceptIncomingCall,
    rejectIncomingCall
  } = useSessionRealtime(sessionId);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const showingCallProgress = canStartCall && (callLaunchStage !== "idle" || callState === "ringing");
  const startButtonBusy = showingCallProgress || callState === "connected";
  const showRemoteAsPrimary = callState === "connected" && remoteVideoActive;

  useEffect(() => {
    if (!showingCallProgress || !callLaunchStartedAt) {
      setElapsedSeconds(0);
      return;
    }
    const tick = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - callLaunchStartedAt) / 1000)));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [callLaunchStartedAt, showingCallProgress]);

  return (
    <div className="min-h-screen bg-[#b7ccdf] p-3 text-white sm:p-5">
      <div className="mx-auto w-full max-w-md">
        <section className="relative min-h-[86vh] overflow-hidden rounded-[2.2rem] border border-white/30 bg-black shadow-[0_30px_60px_rgba(15,23,42,0.45)]">
          <audio ref={remoteAudioRef} autoPlay playsInline />

          <video
            ref={showRemoteAsPrimary ? remoteVideoRef : localVideoRef}
            autoPlay
            playsInline
            muted={!showRemoteAsPrimary}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/5 to-black/55" />

          <header className="relative z-10 flex items-center justify-between px-4 pb-2 pt-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-rose-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                Live
              </span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                {callState}
              </span>
            </div>
            <Link
              to={exitRoute}
              className="rounded-full bg-white/20 px-3 py-1.5 text-[11px] font-semibold backdrop-blur transition-all hover:bg-white/30 active:scale-95"
            >
              Exit
            </Link>
          </header>

          <div className="relative z-10 px-4">
            <p className="text-xs font-semibold text-white/85">
              {showRemoteAsPrimary ? "Visitor" : "You"}
            </p>
            <SessionNetworkBadge quality={networkQuality} detail={networkDetail} detailClassName="text-white/80" />
            {status ? <p className="mt-1 text-[11px] text-amber-200">{status}</p> : null}
            {featureError ? <p className="mt-1 text-[11px] text-rose-200">{featureError}</p> : null}
          </div>

          <article className="absolute right-4 top-20 z-20 w-24 overflow-hidden rounded-2xl border border-white/45 bg-black/35 shadow-xl backdrop-blur sm:w-28">
            <video
              ref={showRemoteAsPrimary ? localVideoRef : remoteVideoRef}
              autoPlay
              playsInline
              muted={showRemoteAsPrimary}
              className="h-32 w-full object-cover sm:h-36"
            />
            <p className="bg-black/45 px-2 py-1 text-[10px] font-semibold text-white/90">
              {showRemoteAsPrimary ? "You" : "Visitor"}
            </p>
          </article>

          <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-3 pt-14">
            {showingCallProgress ? (
              <div className="mb-3 rounded-2xl border border-emerald-300/35 bg-emerald-950/35 px-3 py-2 text-xs backdrop-blur">
                {callState === "ringing"
                  ? "Calling participant..."
                  : "Preparing camera and connection..."}{" "}
                <span className="font-semibold">{elapsedSeconds}s</span>
              </div>
            ) : null}

            <div className="mb-3 rounded-2xl border border-white/25 bg-white/15 px-3 py-2 text-[11px] backdrop-blur">
              <button
                type="button"
                onClick={() => setLowBandwidthMode(!lowBandwidthMode)}
                className="flex w-full items-center justify-between gap-3 text-left transition-all active:scale-[0.99]"
              >
                <span>
                  <span className="block font-semibold">Low Bandwidth</span>
                  <span className="text-white/80">
                    {autoLowBandwidthActive ? "Active" : "Off"} {isMobileWebView ? "| Mobile mode" : ""}
                  </span>
                </span>
                <span className={`h-2.5 w-2.5 rounded-full ${lowBandwidthMode ? "bg-emerald-300" : "bg-white/55"}`} />
              </button>
            </div>

            <div className="rounded-2xl border border-white/25 bg-[#42a5ff]/90 p-2.5 shadow-[0_16px_30px_rgba(2,6,23,0.35)] backdrop-blur">
              <div className="grid grid-cols-2 gap-2">
                <ControlIconButton
                  label={startButtonBusy ? "Starting" : lowBandwidthMode ? "Audio" : "Video"}
                  onClick={startVideoCall}
                  disabled={Boolean(featureError) || !canStartCall || startButtonBusy}
                  icon={<Video size={16} />}
                />
                <ControlIconButton
                  label={muted ? "Unmute" : "Mute"}
                  onClick={toggleMute}
                  disabled={!localStreamRef.current}
                  icon={<Mic size={16} />}
                />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <ControlIconButton
                  label="Retry"
                  onClick={retryCallConnection}
                  disabled={!canStartCall}
                  icon={<RefreshCw size={16} />}
                />
                <ControlIconButton
                  label={cameraOn ? "Camera On" : "Camera"}
                  onClick={() => {}}
                  disabled
                  icon={<Camera size={16} />}
                />
              </div>
              <div className="mt-2">
                <ControlIconButton
                  label="End Call"
                  onClick={endCall}
                  variant="danger"
                  icon={<PhoneOff size={18} />}
                  large
                />
              </div>
            </div>

            <details className="mt-3 rounded-2xl border border-white/20 bg-black/35 p-3 backdrop-blur">
              <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-white/85">
                Connection Details
              </summary>
              <p className="mt-2 text-[11px] text-white/75">
                {connected ? "Signaling online" : "Connecting"} | {joined ? "Room joined" : "Waiting room"} | Remote mic:{" "}
                {remoteMuted ? "Muted" : "Active"}
              </p>
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[10px]">
                <Signal size={12} />
                {networkQuality}
              </div>
              <SessionDiagnosticsPanel diagnostics={callDiagnostics} networkQuality={networkQuality} />
            </details>
          </div>
        </section>
      </div>

      <VisitorIncomingCallModal
        open={incomingCall.pending && !canStartCall}
        hasVideo={incomingCall.hasVideo}
        onAccept={acceptIncomingCall}
        onReject={rejectIncomingCall}
      />
    </div>
  );
}

function ControlIconButton({ label, icon, onClick, disabled = false, variant = "default", large = false }) {
  const base =
    "grid place-items-center rounded-xl text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-45";
  const tone = variant === "danger" ? "bg-rose-500 hover:bg-rose-400" : "bg-white/25 hover:bg-white/35";
  const sizeClass = large ? "h-12 w-full rounded-2xl" : "h-11";
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${tone} ${sizeClass}`}>
      <span className="flex flex-col items-center gap-0.5">
        {icon}
        <span className={`${large ? "text-[10px]" : "text-[9px]"} font-semibold`}>{label}</span>
      </span>
    </button>
  );
}

function getExitRoute(sessionId) {
  try {
    const user = JSON.parse(localStorage.getItem("qring_user") || "null");
    if (user?.role === "visitor") return `/session/${sessionId}/message`;
    if (user?.role === "admin") return "/dashboard/admin";
    if (user?.role === "estate") return "/dashboard/estate";
    return "/dashboard/homeowner/overview";
  } catch {
    return `/session/${sessionId}/message`;
  }
}
