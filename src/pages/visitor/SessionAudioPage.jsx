import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#10213f_0%,_#0a1428_46%,_#050b17_100%)] p-3 text-slate-100 sm:p-6">
      <div className="mx-auto w-full max-w-4xl py-2 sm:py-4">
        <header className="mb-4 flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-slate-900/55 p-4 shadow-soft backdrop-blur">
          <div>
            <h1 className="font-heading text-xl font-black tracking-tight sm:text-2xl">Audio Session</h1>
            <p className="mt-1 text-xs text-slate-300">{callState === "connected" ? "Connected" : "Ready to connect"}</p>
          </div>
          <Link to={dashboardRoute} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20">
            Dashboard
          </Link>
        </header>

        <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-4 shadow-soft backdrop-blur sm:p-6">
          <audio ref={remoteAudioRef} autoPlay playsInline />
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            <ParticipantCard
              label="Visitor"
              state={callState === "connected" && !remoteMuted ? "Speaking" : "Listening"}
              muted={remoteMuted}
            />
            <ParticipantCard
              label="You"
              state={muted ? "Microphone muted" : "Microphone active"}
              muted={muted}
            />
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 text-center text-white">
            <p className="text-sm font-semibold">{callState === "ringing" ? "Calling..." : "Voice channel"}</p>
            <p className="mt-1 text-xs text-slate-300">{localStreamRef.current ? "Microphone active" : "Tap Start to connect mic"}</p>
          </div>

          {featureError ? <p className="mt-3 text-sm text-rose-400">{featureError}</p> : null}
          <SessionNetworkBadge quality={networkQuality} detail={networkDetail} detailClassName="text-slate-300" />
          {status ? <p className="mt-2 text-sm text-amber-300">{status}</p> : null}
          {showingCallProgress ? (
            <section className="mt-3 rounded-2xl border border-[#00a884]/35 bg-[#0f2428] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#00a884]">
                Call Setup In Progress
              </p>
              <p className="mt-1 text-sm text-slate-100">
                {callState === "ringing"
                  ? "Call request sent. Waiting for visitor to accept."
                  : "Preparing call and connecting signaling services."}
              </p>
              <p className="mt-1 text-xs text-slate-300">Elapsed: {elapsedSeconds}s</p>
              {elapsedSeconds >= 8 ? (
                <p className="mt-2 rounded-xl bg-amber-500/20 px-3 py-2 text-xs text-amber-200">
                  Network looks slow. Keep this page open while we continue trying.
                </p>
              ) : null}
            </section>
          ) : null}

          <div className="mt-3 rounded-2xl border border-white/10 bg-slate-900/30 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">
                  Low Bandwidth Mode
                </p>
                <p className="mt-1 text-[11px] text-slate-300">
                  Keeps calls stable on weak internet and limits media usage.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLowBandwidthMode(!lowBandwidthMode)}
                className={`relative h-7 w-12 rounded-full transition ${
                  lowBandwidthMode ? "bg-brand-500" : "bg-slate-600"
                }`}
                aria-pressed={lowBandwidthMode}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                    lowBandwidthMode ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
            {autoLowBandwidthActive ? (
              <p className="mt-2 text-[11px] font-semibold text-brand-300">
                Bandwidth saver active.
              </p>
            ) : null}
            {isMobileWebView ? (
              <p className="mt-2 text-[11px] text-slate-300">
                Mobile WebView mode: relay/audio fallback is used automatically when network degrades.
              </p>
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-slate-950/55 p-3 sm:grid-cols-4">
            <button
              type="button"
              onClick={startAudioCall}
              disabled={Boolean(featureError) || !canStartCall || startButtonBusy}
              className="rounded-xl bg-brand-500 px-3 py-3 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              {startButtonBusy ? "Starting..." : "Start"}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              disabled={!localStreamRef.current}
              className="rounded-xl bg-slate-600 px-3 py-3 text-xs font-semibold text-white transition hover:bg-slate-500 disabled:opacity-50"
            >
              {muted ? "Unmute" : "Mute"}
            </button>
            <button
              type="button"
              onClick={endCall}
              className="rounded-xl bg-rose-600 px-3 py-3 text-xs font-semibold text-white transition hover:bg-rose-500"
            >
              End
            </button>
            <button
              type="button"
              onClick={retryCallConnection}
              disabled={!canStartCall}
              className="rounded-xl bg-cyan-600 px-3 py-3 text-xs font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50"
            >
              Retry
            </button>
          </div>
          <details className="mt-3 rounded-2xl border border-white/10 bg-slate-950/45 p-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
              Connection Details
            </summary>
            <p className="mt-2 text-[11px] text-slate-400">
              {connected ? "Signaling online" : "Connecting"} | {joined ? "Room joined" : "Waiting room"} | Call: {callState}
            </p>
            <SessionDiagnosticsPanel diagnostics={callDiagnostics} networkQuality={networkQuality} />
          </details>
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
    <article className="rounded-2xl border border-white/10 bg-slate-900/45 p-5 text-center">
      <div className="mx-auto h-24 w-24 rounded-full bg-brand-500/20 p-2 sm:h-28 sm:w-28">
        <div
          className={`grid h-full place-items-center rounded-full text-sm font-bold text-white sm:text-lg ${
            muted ? "bg-slate-600" : "bg-brand-500 animate-pulse"
          }`}
        >
          {label === "You" ? "YOU" : "VIS"}
        </div>
      </div>
      <p className="mt-4 text-base font-semibold">{label}</p>
      <p className="mt-1 text-xs text-slate-300">{state}</p>
    </article>
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
