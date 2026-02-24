import { useState } from "react";
import { useParams } from "react-router-dom";
import SessionNetworkBadge from "../../components/SessionNetworkBadge";
import SessionModeNav from "../../components/SessionModeNav";
import VisitorIncomingCallModal from "../../components/VisitorIncomingCallModal";
import { useSessionRealtime } from "../../hooks/useSessionRealtime";

export default function SessionMessagePage() {
  const { sessionId } = useParams();
  const [text, setText] = useState("");
  const {
    connected,
    joined,
    callState,
    messages,
    status,
    networkQuality,
    networkDetail,
    featureError,
    incomingCall,
    canStartCall,
    sendMessage,
    acceptIncomingCall,
    rejectIncomingCall
  } = useSessionRealtime(sessionId);

  function onSubmit(event) {
    event.preventDefault();
    if (!sendMessage(text)) return;
    setText("");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fef3c7_0,_#f8fafc_38%,_#e0f2fe_72%,_#dbeafe_100%)] p-4 text-slate-900">
      <div className="mx-auto w-full max-w-7xl py-6">
        <header className="mb-4 rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-soft backdrop-blur">
          <h1 className="font-heading text-2xl font-black md:text-3xl">Session Messages</h1>
          <p className="mt-1 text-xs text-slate-500">
            Session {sessionId} | {connected ? "Signaling Online" : "Connecting"} |{" "}
            {joined ? "Room Joined" : "Waiting Room"} | Call: {callState}
          </p>
          <SessionNetworkBadge quality={networkQuality} detail={networkDetail} />
          {featureError ? <p className="mt-2 text-sm text-rose-700">{featureError}</p> : null}
          {status ? <p className="mt-2 text-sm text-amber-700">{status}</p> : null}
        </header>

        <div className="grid gap-4 lg:grid-cols-12">
          <SessionModeNav
            sessionId={sessionId}
            disableCallModes={!canStartCall && !incomingCall.pending && callState !== "connected"}
          />
          <section className="space-y-4 lg:col-span-9">
            <article className="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-soft">
              <h2 className="font-heading text-lg font-bold">Conversation</h2>
              <div className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto rounded-2xl bg-slate-100/90 p-3">
                {messages.map((message) => (
                  <div
                    key={message.id || `${message.at}-${message.text}`}
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                      message.mine ? "ml-auto bg-cyan-600 text-white" : "bg-white text-slate-700"
                    }`}
                  >
                    <p className="text-[11px] font-semibold">{message.displayName}</p>
                    <p>{message.text}</p>
                  </div>
                ))}
                {messages.length === 0 ? <p className="text-xs text-slate-500">No messages yet.</p> : null}
              </div>
              <form onSubmit={onSubmit} className="mt-3 flex gap-2">
                <input
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm"
                  placeholder="Type a message"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                >
                  Send
                </button>
              </form>
            </article>
          </section>
        </div>
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
