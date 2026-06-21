import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import SecureSnapshotImage from "../../components/SecureSnapshotImage";
import SessionNetworkBadge from "../../components/SessionNetworkBadge";
import VisitorIncomingCallModal from "../../components/VisitorIncomingCallModal";
import { useSessionRealtime } from "../../hooks/useSessionRealtime";

export default function SessionMessagePage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [acceptingCall, setAcceptingCall] = useState(false);
  const isHomeowner = getStoredUserRole() === "homeowner";
  const requestedCallMode = resolveRequestedCallMode(location.pathname, searchParams);
  const backButtonLabel =
    isHomeowner
      ? "Back to Inbox"
      : requestedCallMode === "audio" || requestedCallMode === "video"
        ? "Back to Chat"
        : "Back to Scan";
  const handleGoBack = () => {
    const backPath = getSessionBackPath({
      sessionId,
      isHomeowner,
      callRouteMode: requestedCallMode
    });
    navigate(backPath, { replace: true });
  };
  if (isHomeowner && !requestedCallMode) {
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
      navigate(`/session/${sessionId}/${snapshot.hasVideo ? "video" : "audio"}`, { replace: true });
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
  const activeCallMode = acceptedCallMode || (requestedCallMode === "video" || requestedCallMode === "audio" ? requestedCallMode : "");
  const callRouteMode = activeCallMode || requestedCallMode;
  const callRouteLabel =
    callRouteMode === "video"
      ? "Video Call"
      : callRouteMode === "audio"
        ? "Audio Call"
        : "Session Messages";
  const callRouteDescription =
    callRouteMode === "video"
      ? "This route keeps the video experience front and center for both sides."
      : callRouteMode === "audio"
        ? "This route is tuned for a direct two-way voice session."
        : "Chat stays available while the call connects.";
  const routeTheme = {
    audio: {
      pageBg: "bg-[radial-gradient(circle_at_top_left,_#f8fafc_0,_#ecfeff_40%,_#cffafe_78%,_#bae6fd_100%)]",
      headerLine: "bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-300",
      routeChip: "bg-sky-100 text-sky-900 border-sky-200",
      routeBadge: "bg-sky-50 text-sky-700 border-sky-200"
    },
    video: {
      pageBg: "bg-[radial-gradient(circle_at_top_left,_#f8fafc_0,_#f0fdf4_38%,_#dcfce7_76%,_#bbf7d0_100%)]",
      headerLine: "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400",
      routeChip: "bg-emerald-100 text-emerald-900 border-emerald-200",
      routeBadge: "bg-emerald-50 text-emerald-700 border-emerald-200"
    },
    session: {
      pageBg: "bg-[radial-gradient(circle_at_top_left,_#f8fafc_0,_#eef2ff_42%,_#e0f2fe_78%,_#dbeafe_100%)]",
      headerLine: "bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400",
      routeChip: "bg-slate-100 text-slate-700 border-slate-200",
      routeBadge: "bg-white text-slate-500 border-slate-200"
    }
  }[callRouteMode === "video" ? "video" : callRouteMode === "audio" ? "audio" : "session"];
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

  useEffect(() => {
    if (typeof document === "undefined") return () => {};
    const previousTitle = document.title;
    document.title =
      callRouteMode === "video"
        ? `Video Call | Qring`
        : callRouteMode === "audio"
          ? `Audio Call | Qring`
          : `Session Messages | Qring`;
    return () => {
      document.title = previousTitle;
    };
  }, [callRouteMode]);

  return (
    <div className={`min-h-screen ${routeTheme.pageBg} p-4 text-slate-900`}>
      <div className="mx-auto w-full max-w-7xl py-6">
        <header className="relative mb-4 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-soft backdrop-blur">
          <div className={`absolute inset-x-0 top-0 h-1 ${routeTheme.headerLine}`} />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGoBack}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] transition hover:-translate-y-px ${routeTheme.routeChip}`}
            >
              <ChevronLeft size={12} />
              {backButtonLabel}
            </button>
            <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] ${routeTheme.routeChip}`}>
              <span className="inline-flex items-center gap-1.5">
                {callRouteMode === "video" ? <Video size={11} /> : callRouteMode === "audio" ? <PhoneCall size={11} /> : <PhoneCall size={11} />}
                {callRouteMode === "video" ? "Video Route" : callRouteMode === "audio" ? "Audio Route" : "Session Route"}
              </span>
            </span>
            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${routeTheme.routeBadge}`}>
              /session/{sessionId}/{callRouteMode || "message"}
            </span>
          </div>
          <h1 className="mt-3 font-heading text-2xl font-black md:text-3xl">{callRouteLabel}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{callRouteDescription}</p>
          <p className="mt-3 text-xs text-slate-500">
            Session {sessionId} | {connected ? "Signaling Online" : "Connecting"} | {joined ? "Room Joined" : "Waiting Room"} | Server Call Session: {serverCallState}
          </p>
          <SessionNetworkBadge quality={networkQuality} detail={networkDetail} />
          {featureError ? <p className="mt-2 text-sm text-rose-700">{featureError}</p> : null}
          {status ? <p className="mt-2 text-sm text-amber-700">{status}</p> : null}
        </header>

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

function getStoredVisitorQrId() {
  try {
    return String(window.sessionStorage.getItem("qring_visitor_last_qr_id") || "").trim();
  } catch {
    return "";
  }
}

function getSessionBackPath({ sessionId, isHomeowner, callRouteMode }) {
  const safeSessionId = String(sessionId || "").trim();
  if (isHomeowner) {
    return `/dashboard/homeowner/messages?sessionId=${encodeURIComponent(safeSessionId)}`;
  }
  if (callRouteMode === "audio" || callRouteMode === "video") {
    return safeSessionId ? `/session/${safeSessionId}/message` : "/";
  }
  const qrId = getStoredVisitorQrId();
  if (qrId) {
    return `/scan/${encodeURIComponent(qrId)}`;
  }
  return "/";
}

function renderMessageBody(text) {
  if (typeof text !== "string") return <p>{String(text || "")}</p>;
  return <p>{text}</p>;
}

function renderSessionMessage(message) {
  const snapshotSrc = String(message?.snapshotUrl || message?.photoUrl || "").trim();
  const messageType = String(message?.messageType || "text");
  const hasSnapshot = messageType === "visitor_snapshot" || Boolean(snapshotSrc);

  if (hasSnapshot) {
    return (
      <div className="space-y-2">
        {snapshotSrc ? (
          <SecureSnapshotImage
            src={snapshotSrc}
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

function resolveRequestedCallMode(pathname, searchParams) {
  const queryMode = String(searchParams.get("mode") || "").trim().toLowerCase();
  if (queryMode === "audio" || queryMode === "video") return queryMode;
  const path = String(pathname || "").toLowerCase();
  if (path.endsWith("/audio")) return "audio";
  if (path.endsWith("/video")) return "video";
  return "";
}
