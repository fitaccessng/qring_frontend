import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import SessionNetworkBadge from "../../components/SessionNetworkBadge";
import SessionModeNav from "../../components/SessionModeNav";
import VisitorIncomingCallModal from "../../components/VisitorIncomingCallModal";
import { useSessionRealtime } from "../../hooks/useSessionRealtime";

export default function SessionMessagePage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [acceptingCall, setAcceptingCall] = useState(false);
  const isHomeowner = getStoredUserRole() === "homeowner";
  if (isHomeowner) {
    return <Navigate to={`/dashboard/homeowner/messages?sessionId=${encodeURIComponent(sessionId || "")}`} replace />;
  }
  if (!sessionId) {
    return <div className="min-h-screen grid place-items-center bg-slate-50 text-sm font-semibold text-slate-500">Session link is incomplete.</div>;
  }
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
    typingState,
    mediaPermission,
    canStartCall,
    sendMessage,
    sendTypingState,
    retryFailedMessage,
    requestMediaPermissions,
    acceptIncomingCall,
    rejectIncomingCall
  } = useSessionRealtime(sessionId);

  function onSubmit(event) {
    event.preventDefault();
    if (!sendMessage(text)) return;
    setText("");
  }

  async function handleAcceptIncomingCall() {
    if (!incomingCall?.callSessionId || acceptingCall) return;
    setAcceptingCall(true);
    const snapshot = {
      sessionId,
      hasVideo: Boolean(incomingCall.hasVideo),
      callSessionId: incomingCall.callSessionId,
      visitorId: incomingCall.visitorId
    };
    try {
      window.sessionStorage.setItem(
        "qring_call_accept_intent",
        JSON.stringify(snapshot)
      );
      // eslint-disable-next-line no-console
      console.info("qring.visitor.call.accept_clicked", {
        sessionId,
        callSessionId: incomingCall.callSessionId,
        hasVideo: incomingCall.hasVideo
      });
      await acceptIncomingCall({
        ...snapshot,
        phase: "incoming",
        eventId: incomingCall.eventId || incomingCall.callSessionId
      });
    } catch {
      navigate(`/session/${sessionId}/${incomingCall.hasVideo ? "video" : "audio"}`, { replace: true });
    } finally {
      window.setTimeout(() => setAcceptingCall(false), 1200);
    }
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

  useEffect(() => {
    if (!sessionId) return;
    void requestMediaPermissions({ video: false }).catch(() => {
      // Permission state is reflected through the hook.
    });
  }, [requestMediaPermissions, sessionId]);

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
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  <PermissionPill permission={mediaPermission} />
                  {typingState?.isTyping ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">
                      {typingState.displayName || "Participant"} is typing...
                    </span>
                  ) : null}
                </div>
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
                      {renderSessionMessage(message)}
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

              <form onSubmit={onSubmit} className="mb-20 border-t border-slate-200 bg-white/90 p-3 lg:mb-0">
                <div className="flex items-center gap-2">
                  <input
                    value={text}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setText(nextValue);
                      sendTypingState(Boolean(nextValue.trim()));
                    }}
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
                {mediaPermission.state === "denied" || mediaPermission.state === "unavailable" ? (
                  <button
                    type="button"
                    onClick={() => {
                      void requestMediaPermissions({ video: false }).catch(() => {
                        // The hook keeps the latest error state.
                      });
                    }}
                    className="mt-3 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    Retry camera and microphone permission
                  </button>
                ) : null}
              </form>
            </article>
          </section>
        </div>
      </div>

      <VisitorIncomingCallModal
        open={incomingCall.phase === "incoming" && !canStartCall && !acceptingCall}
        hasVideo={incomingCall.hasVideo}
        busy={acceptingCall}
        onAccept={handleAcceptIncomingCall}
        onReject={handleRejectIncomingCall}
      />
    </div>
  );
}

function getStoredUserRole() {
  try {
    const raw = window.sessionStorage.getItem("qring_user") || window.localStorage.getItem("qring_user") || "null";
    return (JSON.parse(raw)?.role || "").toLowerCase();
  } catch {
    return "";
  }
}

function renderMessageBody(text) {
  if (typeof text !== "string") return <p>{String(text || "")}</p>;
  return <p>{text}</p>;
}

function renderSessionMessage(message) {
  if (String(message?.messageType || "text") === "visitor_snapshot") {
    return (
      <div className="space-y-2">
        {message?.snapshotUrl ? (
          <img src={message.snapshotUrl} alt="Visitor snapshot" className="max-h-56 w-full rounded-xl object-cover" />
        ) : (
          <div className="grid h-40 w-full place-items-center rounded-xl bg-slate-200 text-xs font-semibold text-slate-500">
            Snapshot unavailable
          </div>
        )}
        <div className="space-y-1 text-xs">
          {message?.visitorName ? <p>Name: {message.visitorName}</p> : null}
          {message?.visitorPhone ? <p>Phone: {message.visitorPhone}</p> : null}
          {message?.purpose ? <p>Purpose: {message.purpose}</p> : null}
        </div>
      </div>
    );
  }
  return renderMessageBody(message?.text);
}

function PermissionPill({ permission }) {
  const state = String(permission?.state || "idle");
  const label =
    state === "granted"
      ? "Camera and mic ready"
      : state === "requesting"
        ? "Requesting camera and mic"
        : state === "denied"
          ? "Camera or mic denied"
          : state === "unavailable"
            ? "Camera or mic unavailable"
            : "Waiting for media permission";
  const className =
    state === "granted"
      ? "bg-emerald-100 text-emerald-800"
      : state === "requesting"
        ? "bg-sky-100 text-sky-800"
        : "bg-rose-100 text-rose-800";

  return <span className={`rounded-full px-2.5 py-1 font-semibold ${className}`}>{label}</span>;
}
