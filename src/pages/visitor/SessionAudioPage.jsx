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
    incomingCall,
    canStartCall,
    toggleMute,
    endCall,
    startAudioCall,
    acceptIncomingCall,
    rejectIncomingCall
  } = useSessionRealtime(sessionId);

  return (
    <div className="min-h-screen bg-[#0c1317] p-4 text-slate-100 sm:p-6">
      <div className="mx-auto w-full max-w-5xl py-3">
        <header className="mb-4 flex items-center justify-between rounded-3xl border border-white/10 bg-[#1f2c34] p-4 shadow-soft">
          <div>
            <h1 className="font-heading text-2xl font-black">Audio Call</h1>
            <p className="text-xs text-slate-400">Session {sessionId}</p>
          </div>
          <Link to="/dashboard" className="rounded-xl bg-[#00a884] px-4 py-2 text-xs font-semibold text-white">
            Go Back Home
          </Link>
        </header>

        <section className="rounded-3xl border border-white/10 bg-[#111b21] p-6 shadow-soft">
          <audio ref={remoteAudioRef} autoPlay playsInline />
          <div className="grid gap-4 md:grid-cols-2">
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
          <div className="mt-4 rounded-2xl bg-[#1f2c34] p-4 text-center text-white">
            <p className="text-sm font-semibold">{callState === "ringing" ? "Calling..." : "In audio room"}</p>
            <p className="mt-1 text-xs text-slate-300">
              {localStreamRef.current ? "Audio stream connected" : "Start call to connect microphone"}
            </p>
            <p className="mt-1 text-xs text-slate-300">
              {connected ? "Signaling Online" : "Connecting"} | {joined ? "Room Joined" : "Waiting Room"} | Call:{" "}
              {callState}
            </p>
          </div>

          {featureError ? <p className="mt-3 text-sm text-rose-400">{featureError}</p> : null}
          {status ? <p className="mt-2 text-sm text-amber-300">{status}</p> : null}

          <div className="mt-5 grid grid-cols-3 gap-3">
            {incomingCall.pending ? (
              <>
                <button
                  type="button"
                  onClick={acceptIncomingCall}
                  className="rounded-xl bg-[#00a884] px-3 py-3 text-xs font-semibold text-white"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={rejectIncomingCall}
                  className="rounded-xl bg-[#e53935] px-3 py-3 text-xs font-semibold text-white"
                >
                  Reject
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={startAudioCall}
                disabled={Boolean(featureError) || !canStartCall}
                className="rounded-xl bg-[#00a884] px-3 py-3 text-xs font-semibold text-white disabled:opacity-50"
              >
                Start
              </button>
            )}
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
    </div>
  );
}

function ParticipantCard({ label, state, muted }) {
  return (
    <article className="rounded-2xl bg-[#1f2c34] p-6 text-center">
      <div className="mx-auto h-28 w-28 rounded-full bg-[#00a884]/20 p-2">
        <div
          className={`grid h-full place-items-center rounded-full text-lg font-bold text-white ${
            muted ? "bg-[#8696a0]" : "bg-[#00a884] animate-pulse"
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
