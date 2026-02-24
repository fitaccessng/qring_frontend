import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SessionNetworkBadge from "../../components/SessionNetworkBadge";
import VisitorIncomingCallModal from "../../components/VisitorIncomingCallModal";
import { useSessionRealtime } from "../../hooks/useSessionRealtime";

export default function SessionVideoPage() {
  const { sessionId } = useParams();
  const {
    connected,
    joined,
    callState,
    muted,
    remoteMuted,
    localStreamRef,
    status,
    networkQuality,
    networkDetail,
    featureError,
    callLaunchStage,
    callLaunchStartedAt,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    incomingCall,
    canStartCall,
    toggleMute,
    endCall,
    startVideoCall,
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
    <div className="min-h-screen bg-[#0c1317] p-4 text-slate-100 sm:p-6">
      <div className="mx-auto w-full max-w-6xl py-3">
        <header className="mb-4 flex items-center justify-between rounded-3xl border border-white/10 bg-[#1f2c34] p-4 shadow-soft">
          <div>
            <h1 className="font-heading text-2xl font-black">Video Call</h1>
            <p className="text-xs text-slate-400">Session {sessionId}</p>
          </div>
          <Link to="/dashboard" className="rounded-xl bg-[#00a884] px-4 py-2 text-xs font-semibold text-white">
            Go Back Home
          </Link>
        </header>

        <section className="rounded-3xl border border-white/10 bg-[#111b21] p-3 shadow-soft">
          <audio ref={remoteAudioRef} autoPlay playsInline />
          <div className="grid gap-3 md:grid-cols-2">
            <article className="relative overflow-hidden rounded-2xl bg-black">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="h-[300px] w-full rounded-2xl bg-slate-950 object-cover sm:h-[420px]"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8">
                <p className="text-xs font-semibold text-white">Visitor</p>
              </div>
            </article>
            <article className="relative overflow-hidden rounded-2xl bg-black">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                className="h-[300px] w-full rounded-2xl bg-slate-900 object-cover sm:h-[420px]"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8">
                <p className="text-xs font-semibold text-white">You</p>
              </div>
            </article>
          </div>

          <div className="mt-3 rounded-2xl bg-[#1f2c34] px-4 py-3 text-xs text-slate-200">
            {connected ? "Signaling Online" : "Connecting"} | {joined ? "Room Joined" : "Waiting Room"} | Call:{" "}
            {callState} | {localStreamRef.current ? "Media ready" : "Media not started"} | Remote mic:{" "}
            {remoteMuted ? "Muted" : "Active"}
          </div>
          <SessionNetworkBadge
            quality={networkQuality}
            detail={networkDetail}
            detailClassName="text-slate-300"
          />

          {featureError ? <p className="mt-2 text-sm text-rose-700">{featureError}</p> : null}
          {status ? <p className="mt-2 text-sm text-amber-700">{status}</p> : null}
          {showingCallProgress ? (
            <section className="mt-3 rounded-2xl border border-[#00a884]/35 bg-[#0f2428] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#00a884]">
                Call Setup In Progress
              </p>
              <p className="mt-1 text-sm text-slate-100">
                {callState === "ringing"
                  ? "Call request sent. Waiting for visitor to accept."
                  : "Preparing camera/microphone and signaling connection."}
              </p>
              <p className="mt-1 text-xs text-slate-300">Elapsed: {elapsedSeconds}s</p>
              {elapsedSeconds >= 8 ? (
                <p className="mt-2 rounded-xl bg-amber-500/20 px-3 py-2 text-xs text-amber-200">
                  Network looks slow. Keep this page open while the call request continues.
                </p>
              ) : null}
            </section>
          ) : null}

          <div className="mt-4 grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={startVideoCall}
              disabled={Boolean(featureError) || !canStartCall || startButtonBusy}
              className="rounded-xl bg-[#00a884] px-3 py-3 text-xs font-semibold text-white disabled:opacity-50"
            >
              {startButtonBusy ? "Starting..." : "Start Video"}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              disabled={!localStreamRef.current}
              className="rounded-xl bg-[#8696a0] px-3 py-3 text-xs font-semibold text-white disabled:opacity-50"
            >
              {muted ? "Unmute" : "Mute"}
            </button>
            <button
              type="button"
              onClick={endCall}
              className="rounded-xl bg-[#e53935] px-3 py-3 text-xs font-semibold text-white"
            >
              End
            </button>
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
