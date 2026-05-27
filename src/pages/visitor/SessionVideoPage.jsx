import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  LockOpen,
  Mic,
  MicOff,
  PhoneOff,
  RotateCcw,
} from "lucide-react";
import VisitorIncomingCallModal from "../../components/VisitorIncomingCallModal";
import SessionDebugOverlay from "../../components/SessionDebugOverlay";
import { useSessionRealtime } from "../../hooks/useSessionRealtime";
import { useNotifications } from "../../state/NotificationsContext";

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function SessionVideoPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  useNotifications();
  const exitRoute = getExitRoute(sessionId);
  const shouldReturnToMessagesAfterEnd = getStoredUserRole() === "homeowner";
  const {
    connected,
    joined,
    callState,
    muted,
    featureError,
    callConnectedAt,
    incomingCall,
    canStartCall,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    remoteVideoActive,
    cameraFacing,
    networkQuality,
    networkDetail,
    status,
    callLaunchStage,
    callDiagnostics,
    callLogs,
    lowBandwidthMode,
    audioRoute,
    networkType,
    videoQualityProfile,
    debugOverlayOpen,
    acceptedCallMode,
    sendQuickResponse,
    startVideoCall,
    toggleMute,
    switchCamera,
    endCall,
    retryCallConnection,
    acceptIncomingCall,
    rejectIncomingCall,
    setDebugOverlayOpen
  } = useSessionRealtime(sessionId);

  const [seconds, setSeconds] = useState(0);
  const [acceptingCall, setAcceptingCall] = useState(false);
  const [isPanicActive] = useState(false);
  const showRemoteAsPrimary = callState === "connected" && remoteVideoActive;
  const quickResponses = [
    { key: "on_my_way", label: "I'm on my way" },
    { key: "leave_at_door", label: "Leave at Door" },
    { key: "unlock_door", label: "Unlock Door", icon: <LockOpen size={14} /> }
  ];

  useEffect(() => {
    if (callState !== "connected" || !callConnectedAt) {
      setSeconds(0);
      return;
    }
    const timer = window.setInterval(() => {
      setSeconds(Math.max(0, Math.floor((Date.now() - callConnectedAt) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [callConnectedAt, callState]);

  useEffect(() => {
    if (callState !== "ended" || !shouldReturnToMessagesAfterEnd) return;
    // eslint-disable-next-line no-console
    console.info("qring.call.redirect.after_end", { sessionId, route: exitRoute, mode: "video" });
    navigate(exitRoute, { replace: true });
  }, [callState, exitRoute, navigate, sessionId, shouldReturnToMessagesAfterEnd]);

  async function handleEndCall() {
    await endCall();
  }

  async function handleAcceptIncomingCall() {
    if (!incomingCall?.callSessionId || acceptingCall) return;
    const nextMode = incomingCall.hasVideo ? "video" : "audio";
    const snapshot = {
      sessionId,
      hasVideo: Boolean(incomingCall.hasVideo),
      callSessionId: incomingCall.callSessionId,
      visitorId: incomingCall.visitorId
    };
    setAcceptingCall(true);
    try {
      window.sessionStorage.setItem("qring_call_accept_intent", JSON.stringify(snapshot));
      if (nextMode !== "video") {
        navigate(`/session/${sessionId}/${nextMode}`, { replace: true });
        return;
      }
      await acceptIncomingCall({
        ...snapshot,
        phase: "incoming",
        eventId: incomingCall.eventId || incomingCall.callSessionId
      });
    } catch {
      navigate(`/session/${sessionId}/${nextMode}`, { replace: true });
    } finally {
      window.setTimeout(() => setAcceptingCall(false), 1200);
    }
  }

  useEffect(() => {
    if (!acceptedCallMode) return;
    navigate(`/session/${sessionId}/${acceptedCallMode}`, { replace: true });
  }, [acceptedCallMode, navigate, sessionId]);

  return (
    <div className="bg-neutral-900 font-sans text-white overflow-hidden h-screen w-screen relative select-none">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* --- BACKGROUND / REMOTE VIDEO STREAM --- */}
      <div className="absolute inset-0 z-0 bg-neutral-950">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${showRemoteAsPrimary ? "opacity-100" : "opacity-0"}`}
        />
        {/* Dark overlays mimicking WhatsApp's subtle UI readability shadows */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />
      </div>

      {/* --- FLOATING WHATSAPP TOP HEADER --- */}
      <header className="absolute top-0 inset-x-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(exitRoute)}
            className="p-1 text-white/90 hover:text-white transition-colors"
          >
            <ChevronLeft size={28} />
          </button>
          <div>
            <h1 className="font-medium text-base text-white tracking-wide">
              {isPanicActive ? "🚨 Emergency Call" : "Live Video Call"}
            </h1>
            <p className="text-xs text-white/70 mt-0.5 font-light">
              {callState === "connected" ? formatDuration(seconds) : formatCallStatus(callState)}
            </p>
          </div>
        </div>
        
        {/* Hidden button to toggle the debug overlay when needed without ruining the minimal UI */}
        <button 
          onClick={() => setDebugOverlayOpen(prev => !prev)}
          className="text-white/20 text-xs px-2 py-1 absolute right-16 top-6"
        >
          •
        </button>
      </header>

      {/* --- WHATSAPP FLOATING LOCAL CAMERA PIP --- */}
      <div
        className={`absolute overflow-hidden border border-white/10 shadow-xl z-40 bg-neutral-800 rounded-lg transition-all duration-300 ${
          showRemoteAsPrimary
            ? "top-20 right-4 w-28 aspect-[3/4]"
            : "inset-0 w-full h-full rounded-none border-0"
        }`}
      >
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      </div>

      {/* --- FLOATING BOTTOM ACTION PANEL --- */}
      <main className="absolute bottom-0 inset-x-0 z-50 p-6 flex flex-col items-center gap-6 bg-gradient-to-t from-black/70 via-black/40 to-transparent">
        
        {/* Errors & Status notifications pushed cleanly right above controls */}
        {featureError || status ? (
          <div className="w-full max-w-xs text-center bg-black/60 backdrop-blur-md py-2 px-4 rounded-xl text-xs text-rose-300 border border-white/5 animate-pulse">
            {featureError || status}
          </div>
        ) : null}

        {/* Quick Responses Pill Pack */}
        <div className="flex flex-wrap justify-center gap-2 max-w-sm w-full">
          {quickResponses.map((res, i) => (
            <button
              key={i}
              type="button"
              onClick={() => sendQuickResponse(res.key)}
              className="px-4 py-2 bg-neutral-900/80 backdrop-blur-md border border-white/10 rounded-full text-white/95 font-medium text-xs transition-all active:scale-95 shadow-sm hover:bg-neutral-800"
            >
              {res.icon ? <span className="flex items-center gap-1.5">{res.icon} {res.label}</span> : res.label}
            </button>
          ))}
        </div>

        {/* Action Controls Bar */}
        <div className="flex gap-8 items-center justify-center w-full max-w-xs">
          {/* Mute Button */}
          <button
            type="button"
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
              muted 
                ? "bg-white text-neutral-900" 
                : "bg-neutral-900/70 text-white hover:bg-neutral-800"
            }`}
          >
            {muted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          {/* Call Trigger (Red Circle End Button) */}
          <button
            type="button"
            onClick={callState === "connected" ? handleEndCall : startVideoCall}
            disabled={Boolean(featureError) || (!canStartCall && callState !== "connected")}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-all disabled:opacity-40 ${
              callState === "connected" ? "bg-rose-600" : "bg-emerald-600 animate-bounce"
            }`}
          >
            <PhoneOff size={26} className={callState === "connected" ? "rotate-[135deg]" : ""} />
          </button>

          {/* Flip Camera Button */}
          <button
            type="button"
            onClick={switchCamera}
            className="w-12 h-12 rounded-full bg-neutral-900/70 backdrop-blur-md flex items-center justify-center text-white hover:bg-neutral-800 transition-all"
          >
            <RotateCcw size={22} className={`transition-transform duration-300 ${cameraFacing === "user" ? "" : "rotate-180"}`} />
          </button>
        </div>

        {/* Subtle Network Quality/Low Bandwidth Indicators */}
        {(lowBandwidthMode || networkQuality !== "good") && (
          <div className="text-[11px] text-white/40 tracking-wide">
            {lowBandwidthMode ? "Low bandwidth mode active" : `Connection: ${networkQualityLabel(networkQuality)}`}
          </div>
        )}
      </main>

      {/* --- BACKGROUND MODALS & EXPERT ASSISTANTS --- */}
      <VisitorIncomingCallModal
        open={incomingCall.phase === "incoming" && !acceptingCall}
        hasVideo={incomingCall.hasVideo}
        busy={acceptingCall}
        onAccept={handleAcceptIncomingCall}
        onReject={rejectIncomingCall}
      />
      <SessionDebugOverlay
        open={debugOverlayOpen}
        onToggle={() => setDebugOverlayOpen((current) => !current)}
        diagnostics={callDiagnostics}
        logs={callLogs}
        networkQuality={networkQuality}
        lowBandwidthMode={lowBandwidthMode}
        audioRoute={audioRoute}
        networkType={networkType}
        videoQualityProfile={videoQualityProfile}
      />
    </div>
  );
}

function getExitRoute(sessionId) {
  try {
    const raw = window.sessionStorage.getItem("qring_user") || window.localStorage.getItem("qring_user") || "null";
    const user = JSON.parse(raw);
    if (!user?.role || user.role === "visitor") return `/session/${sessionId}/message`;
    if (user.role === "admin") return "/dashboard/admin";
    if (user.role === "estate") return "/dashboard/estate";
    if (user.role === "security") return `/dashboard/security/messages?sessionId=${encodeURIComponent(sessionId)}`;
    return `/dashboard/homeowner/messages?sessionId=${encodeURIComponent(sessionId)}`;
  } catch {
    return `/session/${sessionId}/message`;
  }
}

function getStoredUserRole() {
  try {
    const raw = window.sessionStorage.getItem("qring_user") || window.localStorage.getItem("qring_user") || "null";
    return String(JSON.parse(raw)?.role || "").toLowerCase();
  } catch {
    return "";
  }
}

function formatCallStatus(callState) {
  if (callState === "connected") return "00:00";
  if (callState === "connecting") return "Connecting...";
  if (callState === "ringing") return "Ringing...";
  if (callState === "ended") return "Call ended";
  return "Ready";
}

function networkQualityLabel(value) {
  if (value === "good") return "Healthy";
  if (value === "slow") return "Recovering";
  return "Connecting";
}
