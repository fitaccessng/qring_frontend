import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SessionNetworkBadge from "../../components/SessionNetworkBadge";
import SessionModeNav from "../../components/SessionModeNav";
import VisitorIncomingCallModal from "../../components/VisitorIncomingCallModal";
import { useSessionRealtime } from "../../hooks/useSessionRealtime";

export default function SessionMessagePage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const messagesRef = useRef(null);
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
    acceptedCallMode,
    canStartCall,
    sendMessage,
    retryFailedMessage,
    acceptIncomingCall,
    rejectIncomingCall
  } = useSessionRealtime(sessionId);

  function onSubmit(event) {
    event.preventDefault();
    if (!sendMessage(text)) return;
    setText("");
  }

  async function handleAcceptIncomingCall() {
    const route = `/session/${sessionId}/${incomingCall.hasVideo ? "video" : "audio"}`;
    acceptIncomingCall();
    navigate(route);
  }

  function handleRejectIncomingCall() {
    rejectIncomingCall();
    navigate(`/session/${sessionId}/message`, { replace: true });
  }

  useEffect(() => {
    if (!acceptedCallMode) return;
    navigate(`/session/${sessionId}/${acceptedCallMode}`);
  }, [acceptedCallMode, navigate, sessionId]);

  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages]);

  function resolveServerCallState(value) {
    if (value === "ringing") return "ringing";
    if (value === "connected") return "active";
    if (value === "ended") return "ended";
    if (value === "failed") return "failed";
    return "pending";
  }

  const serverCallState = resolveServerCallState(callState);
  const callModeLabels =
    serverCallState === "ringing"
      ? { audio: "Audio (Ringing)", video: "Video (Ringing)" }
      : serverCallState === "active"
        ? { audio: "Audio (Active)", video: "Video (Active)" }
        : serverCallState === "ended"
          ? { audio: "Audio (Ended)", video: "Video (Ended)" }
          : serverCallState === "failed"
            ? { audio: "Audio (Failed)", video: "Video (Failed)" }
          : { audio: "Audio (Pending)", video: "Video (Pending)" };
  const disabledCallTooltip =
    serverCallState === "ringing"
      ? "Server call session state: ringing. Waiting for join confirmation."
      : serverCallState === "active"
        ? "Server call session state: active. Open audio or video to continue."
        : serverCallState === "ended"
          ? "Server call session state: ended. Ask homeowner to start a new call."
          : serverCallState === "failed"
            ? "Server call session state: failed. Check network/permissions and retry."
          : "Server call session state: pending. Audio and video unlock once homeowner starts a call.";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#f8fafc_0,_#eef2ff_42%,_#e0f2fe_78%,_#dbeafe_100%)] p-4 text-slate-900">
      <div className="mx-auto w-full max-w-7xl py-6">
        <header className="mb-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-soft backdrop-blur">
          <h1 className="font-heading text-2xl font-black md:text-3xl">Session Messages</h1>
          <p className="mt-1 text-xs text-slate-500">
            Session {sessionId} | {connected ? "Signaling Online" : "Connecting"} | {joined ? "Room Joined" : "Waiting Room"} | Server Call Session: {serverCallState}
          </p>
          <SessionNetworkBadge quality={networkQuality} detail={networkDetail} />
          {featureError ? <p className="mt-2 text-sm text-rose-700">{featureError}</p> : null}
          {status ? <p className="mt-2 text-sm text-amber-700">{status}</p> : null}
        </header>

        <div className="grid gap-4 lg:grid-cols-12">
          <SessionModeNav
            sessionId={sessionId}
            disableCallModes={!canStartCall && !incomingCall.pending && callState !== "connected"}
            disabledCallTooltip={disabledCallTooltip}
            modeLabels={callModeLabels}
          />

          <section className="lg:col-span-9">
            <article className="min-h-[74vh] overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100/70 shadow-sm">
              <header className="border-b border-slate-200 bg-white/85 px-4 py-3">
                <h2 className="text-lg font-black">Conversation</h2>
                <p className="text-xs text-slate-500">Live chat for this session.</p>
              </header>

              <div ref={messagesRef} className="h-[58vh] space-y-3 overflow-y-auto p-4 sm:h-[60vh]">
                {messages.map((message) => (
                  <div key={message.id || `${message.at}-${message.text}`} className={`flex ${message.mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[84%] rounded-2xl px-4 py-2.5 text-sm ${
                        message.mine
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      <p className={`text-[11px] font-semibold ${message.mine ? "text-slate-200" : "text-slate-500"}`}>{message.displayName}</p>
                      <p>{message.text}</p>
                      {message.mine && message.failed ? (
                        <div className="mt-1 flex items-center justify-between gap-2 text-[10px]">
                          <span className="rounded bg-amber-200/90 px-2 py-0.5 font-semibold text-amber-900">
                            Not saved
                          </span>
                          <button
                            type="button"
                            onClick={() => retryFailedMessage(message.id)}
                            className="rounded bg-white/20 px-2 py-0.5 font-semibold text-white hover:bg-white/30"
                          >
                            Retry
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
                {messages.length === 0 ? <p className="text-sm text-slate-500">No messages yet.</p> : null}
              </div>

              <form onSubmit={onSubmit} className="border-t border-slate-200 bg-white/90 p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                    placeholder="Type your message..."
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    Send
                  </button>
                </div>
              </form>
            </article>
          </section>
        </div>
      </div>

      <VisitorIncomingCallModal
        open={incomingCall.pending && !canStartCall}
        hasVideo={incomingCall.hasVideo}
        onAccept={handleAcceptIncomingCall}
        onReject={handleRejectIncomingCall}
      />
    </div>
  );
}
