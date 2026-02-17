import { Link, useParams } from "react-router-dom";
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
    featureError,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    toggleMute,
    endCall,
    startVideoCall
  } = useSessionRealtime(sessionId);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe_0,_#f8fafc_42%,_#e2e8f0_100%)] p-4 text-slate-900">
      <div className="mx-auto w-full max-w-6xl py-6">
        <header className="mb-4 flex items-center justify-between rounded-3xl border border-slate-200/80 bg-white/85 p-4 shadow-soft">
          <div>
            <h1 className="font-heading text-2xl font-black">Video Call</h1>
            <p className="text-xs text-slate-500">Session {sessionId}</p>
          </div>
          <Link to="/dashboard" className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
            Go Back Home
          </Link>
        </header>

        <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-3 shadow-soft">
          <audio ref={remoteAudioRef} autoPlay playsInline />
          <article className="relative overflow-hidden rounded-2xl bg-black">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-[480px] w-full rounded-2xl bg-slate-950 object-cover"
            />
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              className="absolute bottom-4 right-4 h-32 w-48 rounded-xl border-2 border-white/70 bg-slate-900 object-cover shadow-lg"
            />
          </article>

          <div className="mt-3 rounded-2xl bg-slate-900 px-4 py-3 text-xs text-slate-200">
            {connected ? "Signaling Online" : "Connecting"} | {joined ? "Room Joined" : "Waiting Room"} | Call:{" "}
            {callState} | {localStreamRef.current ? "Media ready" : "Media not started"} | Remote mic:{" "}
            {remoteMuted ? "Muted" : "Active"}
          </div>

          {featureError ? <p className="mt-2 text-sm text-rose-700">{featureError}</p> : null}
          {status ? <p className="mt-2 text-sm text-amber-700">{status}</p> : null}

          <div className="mt-4 grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={startVideoCall}
              disabled={Boolean(featureError)}
              className="rounded-xl bg-cyan-600 px-3 py-3 text-xs font-semibold text-white disabled:opacity-50"
            >
              Start Video
            </button>
            <button
              type="button"
              onClick={toggleMute}
              disabled={!localStreamRef.current}
              className="rounded-xl bg-amber-500 px-3 py-3 text-xs font-semibold text-white disabled:opacity-50"
            >
              {muted ? "Unmute" : "Mute"}
            </button>
            <button
              type="button"
              onClick={endCall}
              className="rounded-xl bg-rose-600 px-3 py-3 text-xs font-semibold text-white"
            >
              End
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
