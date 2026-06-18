import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Mic, MicOff, PhoneOff, RotateCcw, User, Video, Volume2 } from "lucide-react";
import SecureSnapshotImage from "../../components/SecureSnapshotImage";
import SessionNetworkBadge from "../../components/SessionNetworkBadge";
import SessionModeNav from "../../components/SessionModeNav";
import VisitorIncomingCallModal from "../../components/VisitorIncomingCallModal";
import { useSessionRealtime } from "../../hooks/useSessionRealtime";

export default function SessionMessagePage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
    cameraFacing,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    muted,
    speakerOn,
    remoteVideoActive,
    sendMessage,
    sendTypingState,
    retryFailedMessage,
    requestMediaPermissions,
    acceptIncomingCall,
    startAudioCall,
    startVideoCall,
    toggleMute,
    toggleSpeaker,
    switchCamera,
    retryCallConnection,
    endCall,
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
      // Stay on the unified session page; the hook will surface the call state here.
    } finally {
      window.setTimeout(() => setAcceptingCall(false), 1200);
    }
  }

  function handleRejectIncomingCall() {
    rejectIncomingCall();
    navigate(`/session/${sessionId}/message`, { replace: true });
  }

  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!sessionId) return;
    void requestMediaPermissions({ video: false, silent: true }).catch(() => {
      // Permission state is reflected through the hook.
    });
  }, [requestMediaPermissions, sessionId]);

  function resolveServerCallState(value) {
    if (value === "ringing") return "ringing";
    if (value === "accepted") return "active";
    if (value === "reconnecting") return "active";
    if (value === "connected") return "active";
    if (value === "ended") return "ended";
    if (value === "failed") return "failed";
    return "pending";
  }

  const serverCallState = resolveServerCallState(callState);
  const requestedCallMode = String(searchParams.get("mode") || "").trim().toLowerCase();
  const activeCallMode = acceptedCallMode || (requestedCallMode === "video" || requestedCallMode === "audio" ? requestedCallMode : "");
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
            onModeSelect={(mode) => {
              if (mode === "video") {
                void startVideoCall();
                return;
              }
              void startAudioCall();
            }}
          />

          <section className="lg:col-span-9">
            {activeCallMode || callState !== "idle" || incomingCall.pending ? (
              <article className="mb-4 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                {renderCallSurface({
                  activeCallMode,
                  callState,
                  cameraFacing,
                  localVideoRef,
                  remoteVideoRef,
                  remoteAudioRef,
                  remoteVideoActive,
                  muted,
                  speakerOn,
                  requestMediaPermissions,
                  retryCallConnection,
                  toggleMute,
                  toggleSpeaker,
                  switchCamera,
                  endCall,
                  sessionId,
                  activeLabel: callModeLabels[activeCallMode] || "Call",
                  networkQuality,
                  networkDetail,
                  status
                })}
              </article>
            ) : null}

            <article className="min-h-[74vh] overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100/70 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
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

function renderCallSurface({
  activeCallMode,
  callState,
  cameraFacing,
  localVideoRef,
  remoteVideoRef,
  remoteAudioRef,
  remoteVideoActive,
  muted,
  speakerOn,
  requestMediaPermissions,
  retryCallConnection,
  toggleMute,
  toggleSpeaker,
  switchCamera,
  endCall,
  sessionId,
  activeLabel,
  networkQuality,
  networkDetail,
  status
}) {
  const isVideo = activeCallMode === "video";
  const isConnected = callState === "connected";
  const isConnecting = callState === "connecting" || callState === "ringing";
  const callHeadline = isVideo ? "Video call in progress" : "Audio call in progress";
  return (
    <div className="relative overflow-hidden bg-slate-950 text-white">
      {!isVideo ? <audio ref={remoteAudioRef} autoPlay playsInline /> : null}
      {isVideo ? (
        <div className="relative aspect-[16/10] bg-black">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover transition-opacity duration-300 ${isConnected && remoteVideoActive ? "opacity-100" : "opacity-30"}`}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/60" />
          <div className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
            {callHeadline}
          </div>
          <div className="absolute bottom-4 right-4 h-28 w-20 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
            <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 px-4 py-6 sm:grid-cols-[auto,1fr] sm:items-center">
          <div className="grid h-24 w-24 place-items-center rounded-full bg-white/10">
            <User size={36} className="text-white/60" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">{activeLabel}</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">{callHeadline}</h2>
            <p className="mt-2 text-sm text-white/70">{isConnecting ? "Connecting securely..." : isConnected ? "You are live now." : "Waiting to connect."}</p>
            {networkDetail ? <p className="mt-2 text-xs text-white/45">{networkDetail}</p> : null}
            {status ? <p className="mt-2 text-xs text-amber-200">{status}</p> : null}
          </div>
        </div>
      )}

      <div className="space-y-4 border-t border-white/10 px-4 py-4">
        <div className="flex flex-wrap gap-2 text-[11px] text-white/60">
          {networkQuality ? <span className="rounded-full bg-white/10 px-2.5 py-1 font-semibold">{networkQuality}</span> : null}
          {cameraFacing ? <span className="rounded-full bg-white/10 px-2.5 py-1 font-semibold">Camera: {cameraFacing}</span> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={toggleSpeaker} className={`rounded-xl px-3 py-2 text-xs font-semibold ${speakerOn ? "bg-white text-slate-950" : "bg-white/10 text-white"}`}>
            <span className="inline-flex items-center gap-1.5">
              <Volume2 size={14} />
              {speakerOn ? "Speaker on" : "Speaker off"}
            </span>
          </button>
          <button type="button" onClick={toggleMute} className={`rounded-xl px-3 py-2 text-xs font-semibold ${muted ? "bg-white text-slate-950" : "bg-white/10 text-white"}`}>
            <span className="inline-flex items-center gap-1.5">
              {muted ? <MicOff size={14} /> : <Mic size={14} />}
              {muted ? "Muted" : "Mic on"}
            </span>
          </button>
          {isVideo ? (
            <button type="button" onClick={switchCamera} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white">
              <span className="inline-flex items-center gap-1.5">
                <Video size={14} />
                Switch camera
              </span>
            </button>
          ) : null}
          <button type="button" onClick={retryCallConnection} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white">
            <span className="inline-flex items-center gap-1.5">
              <RotateCcw size={14} />
              Retry
            </span>
          </button>
          <button type="button" onClick={() => void endCall()} className="rounded-xl bg-rose-500 px-3 py-2 text-xs font-semibold text-white">
            <span className="inline-flex items-center gap-1.5">
              <PhoneOff size={14} />
              End call
            </span>
          </button>
          {!isConnected ? (
            <button type="button" onClick={() => void requestMediaPermissions({ video: isVideo })} className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white">
              Grant media
            </button>
          ) : null}
        </div>
      </div>
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
          <SecureSnapshotImage
            src={message.snapshotUrl}
            alt="Visitor snapshot"
            visitorSessionId={message?.sessionId || ""}
            className="max-h-56 w-full rounded-xl object-cover"
            fallback={
              <div className="grid h-40 w-full place-items-center rounded-xl bg-slate-200 text-xs font-semibold text-slate-500">
                Snapshot unavailable
              </div>
            }
          />
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
