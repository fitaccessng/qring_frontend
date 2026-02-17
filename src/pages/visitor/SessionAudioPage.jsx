import { Link, useParams } from "react-router-dom";
import { useSessionRealtime } from "../../hooks/useSessionRealtime";

export default function SessionAudioPage() {
  const { sessionId } = useParams();
  const {
    connected,
    joined,
    callState,
    muted,
    remoteMuted,
    localStreamRef,
    remoteAudioRef,
    status,
    featureError,
    toggleMute,
    endCall,
    startAudioCall
  } = useSessionRealtime(sessionId);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dcfce7_0,_#f8fafc_48%,_#e2e8f0_100%)] p-4 text-slate-900">
      <div className="mx-auto w-full max-w-4xl py-6">
        <header className="mb-4 flex items-center justify-between rounded-3xl border border-slate-200/80 bg-white/85 p-4 shadow-soft">
          <div>
            <h1 className="font-heading text-2xl font-black">Audio Call</h1>
            <p className="text-xs text-slate-500">Session {sessionId}</p>
          </div>
          <Link to="/dashboard" className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
            Go Back Home
          </Link>
        </header>

        <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-soft">
          <audio ref={remoteAudioRef} autoPlay playsInline />
          <div className="rounded-2xl bg-slate-900 p-8 text-center text-white">
            <div className="mx-auto h-32 w-32 rounded-full bg-emerald-500/20 p-2">
              <div className="grid h-full place-items-center rounded-full bg-emerald-500 text-lg font-bold">
                AUDIO
              </div>
            </div>
            <p className="mt-4 text-sm font-semibold">{muted ? "Microphone Muted" : "Microphone Active"}</p>
            <p className="mt-1 text-xs text-slate-300">
              {connected ? "Signaling Online" : "Connecting"} | {joined ? "Room Joined" : "Waiting Room"} | Call:{" "}
              {callState}
            </p>
            <p className="mt-1 text-xs text-slate-300">
              {localStreamRef.current ? "Audio stream connected" : "Start call to connect microphone"}
            </p>
            <p className="mt-1 text-xs text-slate-300">
              Remote mic: {remoteMuted ? "Muted" : "Active"}
            </p>
          </div>

          {featureError ? <p className="mt-3 text-sm text-rose-700">{featureError}</p> : null}
          {status ? <p className="mt-2 text-sm text-amber-700">{status}</p> : null}

          <div className="mt-5 grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={startAudioCall}
              disabled={Boolean(featureError)}
              className="rounded-xl bg-emerald-600 px-3 py-3 text-xs font-semibold text-white disabled:opacity-50"
            >
              Start
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
