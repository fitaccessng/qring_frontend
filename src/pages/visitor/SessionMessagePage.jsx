import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { 
  ChevronLeft, 
  PhoneCall, 
  Video, 
  Send, 
  RefreshCw, 
  Camera, 
  Sparkles, 
  AlertTriangle,
  User,
  Phone,
  HelpCircle,
  Activity,
  ShieldCheck
} from "lucide-react";
import SecureSnapshotImage from "../../components/SecureSnapshotImage";
import SessionNetworkBadge from "../../components/SessionNetworkBadge";
import VisitorIncomingCallModal from "../../components/VisitorIncomingCallModal";
import { useSessionRealtime } from "../../hooks/useSessionRealtime";

export default function SessionMessagePage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [text, setText] = useState("");
  const [acceptingCall, setAcceptingCall] = useState(false);
  const messagesRef = useRef(null);
  const requestMediaPermissionsRef = useRef(null);

  const isHomeowner = getStoredUserRole() === "homeowner";
  const requestedCallMode = resolveRequestedCallMode(location.pathname, searchParams);

  const backButtonLabel = isHomeowner
    ? "Back to Inbox"
    : requestedCallMode === "audio" || requestedCallMode === "video"
      ? "Back to Chat"
      : "Back to Scan";

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

  useEffect(() => {
    requestMediaPermissionsRef.current = requestMediaPermissions;
  }, [requestMediaPermissions]);

  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!sessionId) return;
    void requestMediaPermissionsRef.current?.({ video: false, silent: true }).catch(() => {
      // Permission state handled via hook
    });
  }, [sessionId]);

  const activeCallMode = acceptedCallMode || (requestedCallMode === "video" || requestedCallMode === "audio" ? requestedCallMode : "");
  const callRouteMode = activeCallMode || requestedCallMode;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const previousTitle = document.title;
    document.title = callRouteMode === "video"
      ? "Video Call | Qring"
      : callRouteMode === "audio"
        ? "Audio Call | Qring"
        : "Session Messages | Qring";

    return () => {
      document.title = previousTitle;
    };
  }, [callRouteMode]);

  if (isHomeowner && !requestedCallMode) {
    return <Navigate to={`/dashboard/homeowner/messages?sessionId=${encodeURIComponent(sessionId || "")}`} replace />;
  }

  if (!sessionId) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-900 text-sm font-semibold text-slate-400">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-xl backdrop-blur-md">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <p>Session link is incomplete or invalid.</p>
        </div>
      </div>
    );
  }

  const handleGoBack = () => {
    const backPath = getSessionBackPath({
      sessionId,
      isHomeowner,
      callRouteMode: requestedCallMode
    });
    navigate(backPath, { replace: true });
  };

  function onSubmit(event) {
    event.preventDefault();
    if (!text.trim()) return;
    if (sendMessage(text)) {
      setText("");
      sendTypingState(false);
    }
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
      window.sessionStorage.setItem("qring_call_accept_intent", JSON.stringify(snapshot));
      await acceptIncomingCall({
        ...snapshot,
        phase: "incoming",
        eventId: incomingCall.eventId || incomingCall.callSessionId
      });
      navigate(`/session/${sessionId}/${snapshot.hasVideo ? "video" : "audio"}`, { replace: true });
    } catch {
      // Hook manages active call errors
    } finally {
      window.setTimeout(() => setAcceptingCall(false), 1200);
    }
  }

  function handleRejectIncomingCall() {
    rejectIncomingCall();
    navigate(`/session/${sessionId}/message`, { replace: true });
  }

  const serverCallState = resolveServerCallState(callState);
  const routeTheme = getRouteTheme(callRouteMode);
  const callRouteLabel = callRouteMode === "video"
    ? "Video Call"
    : callRouteMode === "audio"
      ? "Audio Call"
      : "Session Messages";

  return (
    <div className={`min-h-screen ${routeTheme.pageBg} p-3 sm:p-4 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans`}>
      <div className="mx-auto flex max-w-5xl flex-col gap-4 py-2 sm:py-4">
        
        {/* Top Navigation & Status Header */}
        <header className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 p-4 sm:p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
          <div className={`absolute inset-x-0 top-0 h-1.5 ${routeTheme.headerLine}`} />

          {/* Navigation Controls & Route Chips */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={handleGoBack}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition active:scale-95 hover:-translate-y-px ${routeTheme.routeChip}`}
            >
              <ChevronLeft size={14} />
              {backButtonLabel}
            </button>

            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${routeTheme.routeChip}`}>
                {callRouteMode === "video" ? <Video size={12} /> : <PhoneCall size={12} />}
                {callRouteMode ? `${callRouteMode} Route` : "Session Route"}
              </span>

              <span className="hidden sm:inline-flex rounded-full border border-slate-200/60 bg-slate-100/80 px-3 py-1 text-[11px] font-mono text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                /session/{sessionId}/{callRouteMode || "message"}
              </span>
            </div>
          </div>

          {/* Title & Description */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{callRouteLabel}</h1>
                <span className="flex h-2 w-2 relative">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${connected ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? "bg-emerald-500" : "bg-amber-500"}`} />
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {callRouteMode === "video"
                  ? "Direct front-facing video channel prioritizing live camera verification."
                  : callRouteMode === "audio"
                    ? "Low-latency two-way encrypted audio session."
                    : "Encrypted interactive live visitor messaging channel."}
              </p>
            </div>

            {/* Quick Session Info Badges */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100/80 px-2.5 py-1 font-mono font-medium dark:bg-slate-800/70 dark:text-slate-300">
                ID: {sessionId}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2.5 py-1 font-semibold capitalize dark:bg-slate-800/70 dark:text-slate-300">
                <Activity size={12} className="text-emerald-500" />
                {serverCallState}
              </span>
            </div>
          </div>

          {/* Network & Diagnostics Bar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100/80 pt-3 dark:border-slate-800/80 text-xs">
            <div className="flex items-center gap-3">
              <SessionNetworkBadge quality={networkQuality} detail={networkDetail} />
              <span className="hidden md:inline-block text-slate-300 dark:text-slate-700">•</span>
              <span className="hidden md:inline-block text-slate-500 dark:text-slate-400">
                Status: <strong className="font-semibold text-slate-700 dark:text-slate-200">{joined ? "In Session" : "Waiting Area"}</strong>
              </span>
            </div>

            {featureError && <p className="text-xs font-semibold text-rose-500">{featureError}</p>}
            {status && <p className="text-xs font-semibold text-amber-500">{status}</p>}
          </div>
        </header>

        {/* Messaging Area Card */}
        <article className="flex flex-col h-[72vh] min-h-[500px] overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 shadow-md backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
          
          {/* Chat Stream Header */}
          <header className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:px-5 dark:border-slate-800/80 dark:bg-slate-900/50">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                <Sparkles size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold leading-tight">Live Session Stream</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Real-time gatekeeper exchange</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <PermissionPill permission={mediaPermission} />
              {typingState?.isTyping && (
                <span className="flex items-center gap-1.5 animate-pulse rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                  {typingState.displayName || "Participant"} typing...
                </span>
              )}
            </div>
          </header>

          {/* Messages Stream Container */}
          <div ref={messagesRef} className="flex-1 space-y-3.5 overflow-y-auto p-4 sm:p-5 scroll-smooth">
            {messages.length === 0 ? (
              <div className="grid h-full place-items-center text-center p-6">
                <div className="max-w-xs space-y-2">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                    <Send size={20} />
                  </div>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No messages sent yet</p>
                  <p className="text-xs text-slate-400">Type a note below to begin the secure conversation with the visitor.</p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => {
                const isMine = Boolean(message.mine);
                return (
                  <div key={message.id || `${message.at}-${index}`} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`group relative max-w-[88%] sm:max-w-[78%] rounded-2xl p-3.5 shadow-xs transition-all ${
                        isMine
                          ? "rounded-br-xs bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                          : "rounded-bl-xs border border-slate-200/80 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-800/90 dark:text-slate-100"
                      }`}
                    >
                      {/* Sender Tag */}
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider ${isMine ? "text-slate-400 dark:text-slate-500" : "text-slate-400"}`}>
                          {message.displayName || (isMine ? "You" : "Visitor")}
                        </span>
                        {message.at && (
                          <span className={`text-[9px] opacity-60 ${isMine ? "text-slate-300 dark:text-slate-600" : "text-slate-400"}`}>
                            {new Date(message.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      
                      {/* Message Content */}
                      <div>{renderSessionMessage(message)}</div>

                      {/* Retry Indicator for Failed Messages */}
                      {isMine && message.failed && (
                        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/10 dark:border-slate-900/10 pt-2 text-[10px]">
                          <span className="rounded-md bg-rose-500/20 px-2 py-0.5 font-bold text-rose-200 dark:text-rose-700">
                            Failed to send
                          </span>
                          <button
                            type="button"
                            onClick={() => retryFailedMessage(message.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-white/20 dark:bg-slate-900/20 px-2.5 py-1 font-bold transition hover:bg-white/30"
                          >
                            <RefreshCw size={10} className="animate-spin-once" />
                            Retry
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Action / Input Footer Bar */}
          <footer className="border-t border-slate-200/80 bg-white/90 p-3 sm:p-4 dark:border-slate-800/80 dark:bg-slate-900/90 backdrop-blur-md">
            <form onSubmit={onSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={text}
                  onChange={(event) => {
                    const val = event.target.value;
                    setText(val);
                    sendTypingState(Boolean(val.trim()));
                  }}
                  className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5 dark:border-slate-800 dark:bg-slate-950/80 dark:text-white dark:placeholder-slate-500 dark:focus:border-slate-700 dark:focus:ring-white/5"
                  placeholder="Type a secure message..."
                />
              </div>

              <button
                type="submit"
                disabled={!text.trim()}
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-95 disabled:opacity-40 disabled:pointer-events-none dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <span className="hidden sm:inline">Send</span>
                <Send size={15} />
              </button>
            </form>

            {/* Camera / Permission Alert Banner */}
            {(mediaPermission.state === "denied" || mediaPermission.state === "unavailable") && (
              <div className="mt-3 flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50/80 px-3.5 py-2.5 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                <div className="flex items-center gap-2">
                  <Camera size={14} className="text-rose-600 dark:text-rose-400" />
                  <span className="font-medium">Camera & microphone permissions are disabled.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void requestMediaPermissions({ video: false }).catch(() => {});
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1 font-bold text-white transition hover:bg-rose-700 active:scale-95"
                >
                  Grant Access
                </button>
              </div>
            )}
          </footer>
        </article>
      </div>

      {/* Visitor Call Modal Component */}
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

// Helper Functions
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
  return qrId ? `/scan/${encodeURIComponent(qrId)}` : "/";
}

function resolveServerCallState(value) {
  switch (value) {
    case "ringing": return "ringing";
    case "accepted":
    case "reconnecting":
    case "connected": return "active";
    case "ended": return "ended";
    case "failed": return "failed";
    default: return "pending";
  }
}

function resolveRequestedCallMode(pathname, searchParams) {
  const queryMode = String(searchParams.get("mode") || "").trim().toLowerCase();
  if (queryMode === "audio" || queryMode === "video") return queryMode;
  const path = String(pathname || "").toLowerCase();
  if (path.endsWith("/audio")) return "audio";
  if (path.endsWith("/video")) return "video";
  return "";
}

function getRouteTheme(mode) {
  switch (mode) {
    case "video":
      return {
        pageBg: "bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/40 via-slate-950 to-slate-950",
        headerLine: "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400",
        routeChip: "bg-emerald-500/10 text-emerald-800 border-emerald-500/20 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
        routeBadge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800"
      };
    case "audio":
      return {
        pageBg: "bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-950/40 via-slate-950 to-slate-950",
        headerLine: "bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-300",
        routeChip: "bg-sky-500/10 text-sky-800 border-sky-500/20 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60",
        routeBadge: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800"
      };
    default:
      return {
        pageBg: "bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/60 via-slate-950 to-slate-950",
        headerLine: "bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400",
        routeChip: "bg-slate-500/10 text-slate-700 border-slate-500/20 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/60",
        routeBadge: "bg-white text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
      };
  }
}

// Message Renderer (Handles Snapshots & Rich Content)
function renderSessionMessage(message) {
  const snapshotSrc = String(message?.snapshotUrl || message?.photoUrl || "").trim();
  const messageType = String(message?.messageType || "text");
  const hasSnapshot = messageType === "visitor_snapshot" || Boolean(snapshotSrc);

  if (hasSnapshot) {
    return (
      <div className="space-y-3 pt-1">
        <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-slate-100/50 dark:border-slate-700/60 dark:bg-slate-900/50">
          {snapshotSrc ? (
            <SecureSnapshotImage
              src={snapshotSrc}
              alt="Visitor snapshot"
              visitorSessionId={message?.sessionId || ""}
              className="max-h-60 w-full object-cover transition hover:scale-105"
              fallback={
                <div className="grid h-36 w-full place-items-center bg-slate-100 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  Snapshot unavailable
                </div>
              }
            />
          ) : (
            <div className="grid h-36 w-full place-items-center bg-slate-100 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              Snapshot unavailable
            </div>
          )}
        </div>

        {/* Visitor Info Card */}
        <div className="grid gap-1.5 rounded-xl border border-slate-200/60 bg-slate-50/60 p-2.5 text-xs dark:border-slate-700/60 dark:bg-slate-900/60">
          {message?.visitorName && (
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <User size={13} className="text-slate-400" />
              <span className="font-semibold">{message.visitorName}</span>
            </div>
          )}
          {message?.visitorPhone && (
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Phone size={13} className="text-slate-400" />
              <span>{message.visitorPhone}</span>
            </div>
          )}
          {message?.purpose && (
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <HelpCircle size={13} className="text-slate-400" />
              <span className="italic">{message.purpose}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <p className="whitespace-pre-wrap break-words text-sm font-normal leading-relaxed">{message?.text || ""}</p>;
}

// Media Permission Pill Component
function PermissionPill({ permission }) {
  const state = String(permission?.state || "idle");

  const stateConfig = {
    granted: { label: "Media Ready", style: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300" },
    requesting: { label: "Requesting...", style: "bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300" },
    denied: { label: "Media Denied", style: "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300" },
    unavailable: { label: "Unavailable", style: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300" },
    idle: { label: "Media Idle", style: "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400" }
  };

  const config = stateConfig[state] || stateConfig.idle;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${config.style}`}>
      <ShieldCheck size={11} />
      {config.label}
    </span>
  );
}