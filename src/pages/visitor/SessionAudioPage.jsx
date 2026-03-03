import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Mic, Phone, PhoneOff, RefreshCw, Signal, Volume2 } from "lucide-react";
import SessionNetworkBadge from "../../components/SessionNetworkBadge";
import SessionDiagnosticsPanel from "../../components/SessionDiagnosticsPanel";
import VisitorIncomingCallModal from "../../components/VisitorIncomingCallModal";
import { useSessionRealtime } from "../../hooks/useSessionRealtime";

export default function SessionAudioPage() {
  const { sessionId } = useParams();
  const dashboardRoute = getDashboardRoute();
  const {
    connected,
    joined,
    callState,
    muted,
    remoteMuted,
    localStreamRef,
    remoteAudioRef,
    status,
    networkQuality,
    networkDetail,
    callDiagnostics,
    featureError,
    callLaunchStage,
    callLaunchStartedAt,
    incomingCall,
    canStartCall,
    lowBandwidthMode,
    autoLowBandwidthActive,
    isMobileWebView,
    setLowBandwidthMode,
    toggleMute,
    endCall,
    startAudioCall,
    retryCallConnection,
    acceptIncomingCall,
    rejectIncomingCall
  } = useSessionRealtime(sessionId);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const showingCallProgress = canStartCall && (callLaunchStage !== "idle" || callState === "ringing");
  const startButtonBusy = showingCallProgress || callState === "connected";

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
        <section className="relative min-h-[86vh] overflow-hidden rounded-[2.2rem] border border-white/30 bg-[radial-gradient(circle_at_top,_#22416f_0,_#10213f_46%,_#050b17_100%)] shadow-[0_30px_60px_rgba(15,23,42,0.45)]">
          <audio ref={remoteAudioRef} autoPlay playsInline />

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
              to={dashboardRoute}
              className="rounded-full bg-white/20 px-3 py-1.5 text-[11px] font-semibold backdrop-blur transition-all hover:bg-white/30 active:scale-95"
            >
              Exit
            </Link>
          </header>

          <div className="relative z-10 mt-3 px-4 text-center">
            <h1 className="text-lg font-black">Audio Session</h1>
            <p className="mt-1 text-xs text-white/80">
              {callState === "connected" ? "Voice channel connected" : "Preparing voice call"}
            </p>
          </div>

          <div className="relative z-10 mt-8 grid gap-4 px-4">
            <ParticipantCard
              label="Visitor"
              state={callState === "connected" && !remoteMuted ? "Speaking" : "Listening"}
              muted={remoteMuted}
            />
            <ParticipantCard
              label="You"
              state={muted ? "Mic muted" : "Mic active"}
              muted={muted}
            />
          </div>

          <div className="relative z-10 mt-4 px-4">
            <SessionNetworkBadge quality={networkQuality} detail={networkDetail} detailClassName="text-white/80" />
            {status ? <p className="mt-1 text-[11px] text-amber-200">{status}</p> : null}
            {featureError ? <p className="mt-1 text-[11px] text-rose-200">{featureError}</p> : null}
          </div>

          <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-3 pt-12">
            {showingCallProgress ? (
              <div className="mb-3 rounded-2xl border border-emerald-300/35 bg-emerald-950/35 px-3 py-2 text-xs backdrop-blur">
                {callState === "ringing"
                  ? "Calling participant..."
                  : "Preparing mic and connection..."}{" "}
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
                  label={startButtonBusy ? "Starting" : "Start"}
                  onClick={startAudioCall}
                  disabled={Boolean(featureError) || !canStartCall || startButtonBusy}
                  icon={<Phone size={16} />}
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
                  label={remoteMuted ? "Silent" : "Volume"}
                  onClick={() => {}}
                  disabled
                  icon={<Volume2 size={16} />}
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
                {connected ? "Signaling online" : "Connecting"} | {joined ? "Room joined" : "Waiting room"}
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

function ParticipantCard({ label, state, muted }) {
  return (
    <article className="rounded-3xl border border-white/20 bg-white/10 p-5 text-center shadow-lg backdrop-blur">
      <div className="mx-auto h-24 w-24 rounded-full bg-white/15 p-2 sm:h-28 sm:w-28">
        <div
          className={`grid h-full place-items-center rounded-full text-sm font-bold text-white sm:text-lg ${
            muted ? "bg-slate-500/80" : "bg-emerald-500/90 animate-pulse"
          }`}
        >
          {label === "You" ? "YOU" : "VIS"}
        </div>
      </div>
      <p className="mt-4 text-base font-semibold text-white">{label}</p>
      <p className="mt-1 text-xs text-white/75">{state}</p>
    </article>
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

function getDashboardRoute() {
  try {
    const user = JSON.parse(localStorage.getItem("qring_user") || "null");
    if (user?.role === "admin") return "/dashboard/admin";
    if (user?.role === "estate") return "/dashboard/estate";
    return "/dashboard/homeowner/overview";
  } catch {
    return "/dashboard/homeowner/overview";
  }
}
