import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Mic,
  MicOff,
  PhoneOff,
  RotateCcw,
  User,
  Volume2
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

export default function SessionAudioPage() {
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
    speakerOn,
    featureError,
    callConnectedAt,
    incomingCall,
    canStartCall,
    remoteAudioRef,
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
    startAudioCall,
    toggleMute,
    toggleSpeaker,
    endCall,
    retryCallConnection,
    acceptIncomingCall,
    rejectIncomingCall,
    setDebugOverlayOpen
  } = useSessionRealtime(sessionId);

  const [connectedSeconds, setConnectedSeconds] = useState(0);
  const [acceptingCall, setAcceptingCall] = useState(false);

  useEffect(() => {
    if (callState !== "connected" || !callConnectedAt) {
      setConnectedSeconds(0);
      return;
    }
    const timer = window.setInterval(() => {
      setConnectedSeconds(Math.max(0, Math.floor((Date.now() - callConnectedAt) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [callConnectedAt, callState]);

  useEffect(() => {
    if (callState !== "ended" || !shouldReturnToMessagesAfterEnd) return;
    // eslint-disable-next-line no-console
    console.info("qring.call.redirect.after_end", { sessionId, route: exitRoute, mode: "audio" });
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
      if (nextMode !== "audio") {
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
    <div className="h-screen w-screen bg-gradient-to-b from-neutral-800 to-neutral-950 font-sans text-white overflow-hidden relative select-none flex flex-col justify-between p-6">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* --- WHATSAPP FLOATING TOP HEADER --- */}
      <header className="w-full flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(exitRoute)}
            className="p-1 text-white/90 hover:text-white transition-colors"
          >
            <ChevronLeft size={28} />
          </button>
          <div>
            <span className="text-xs text-white/50 font-light uppercase tracking-wider block">WhatsApp Voice Call</span>
            <span className="text-[10px] text-white/30 block mt-0.5">
              {connected ? "Secure Signal" : "Reconnecting Link..."}
            </span>
          </div>
        </div>

        {/* Hidden button to open debug overlay layout dynamically without cluttering screen */}
        <button 
          onClick={() => setDebugOverlayOpen(prev => !prev)}
          className="text-white/10 text-xs px-2 py-1"
        >
          •
        </button>
      </header>

      {/* --- CENTERED IDENTITY & STATUS PROFILE BLOCK --- */}
      <main className="flex-grow flex flex-col items-center justify-center text-center gap-4 z-10 -mt-12">
        <h1 className="text-2xl font-normal text-white tracking-wide">Visitor at Gate</h1>
        
        <p className="text-sm text-white/70 font-light tracking-wide min-h-[20px]">
          {callState === "connected" ? formatDuration(connectedSeconds) : formatCallStatus(callState)}
        </p>

        {/* Dynamic, clean network descriptions right under timing */}
        {networkDetail && (
          <p className="text-xs text-white/40 max-w-xs">{networkDetail}</p>
        )}

        {/* Profile Avatar Canvas matching WhatsApp's calling image bubble */}
        <div className="relative mt-6 flex items-center justify-center">
          <div className={`absolute inset-0 rounded-full bg-emerald-500/10 blur-xl transition-all duration-500 ${callState === "connected" ? "animate-pulse" : "opacity-0"}`} />
          <div className="h-32 w-32 rounded-full bg-neutral-700/60 border border-white/10 shadow-2xl flex items-center justify-center relative z-10 overflow-hidden">
            <User size={64} className="text-white/40 translate-y-1" />
          </div>
        </div>

        {/* Error notifications container stacked neatly under avatar frame */}
        {(featureError || status) && (
          <div className="mt-4 max-w-xs bg-black/40 backdrop-blur-md py-2 px-4 rounded-xl text-xs text-rose-300 border border-white/5">
            {featureError || status}
          </div>
        )}
      </main>

      {/* --- BOTTOM SYSTEM ACTION SHELF --- */}
      <footer className="w-full max-w-md mx-auto flex flex-col items-center gap-6 z-50">
        
        {/* Tray Action Buttons Grid */}
        <div className="w-full bg-neutral-900/60 backdrop-blur-xl border border-white/5 rounded-[2rem] p-4 flex items-center justify-around shadow-2xl">
          
          {/* Speaker Button */}
          <button
            type="button"
            onClick={toggleSpeaker}
            disabled={callState !== "connected"}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-20 ${
              speakerOn 
                ? "bg-white text-neutral-900" 
                : "bg-neutral-800/80 text-white hover:bg-neutral-700"
            }`}
          >
            <Volume2 size={22} />
          </button>

          {/* Mute/Microphone Button */}
          <button
            type="button"
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              muted 
                ? "bg-white text-neutral-900" 
                : "bg-neutral-800/80 text-white hover:bg-neutral-700"
            }`}
          >
            {muted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          {/* Connection Trigger / Dynamic Retry Action Toggle */}
          <button
            type="button"
            onClick={retryCallConnection}
            disabled={!canStartCall && callState !== "connected"}
            className="w-12 h-12 rounded-full bg-neutral-800/80 flex items-center justify-center text-white hover:bg-neutral-700 transition-all disabled:opacity-20"
          >
            <RotateCcw size={20} className={callState === "connecting" ? "animate-spin" : ""} />
          </button>

          {/* End Call / Start Call Master Trigger */}
          <button
            type="button"
            onClick={callState === "connected" ? handleEndCall : startAudioCall}
            disabled={Boolean(featureError) || (!canStartCall && callState !== "connected")}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-all active:scale-90 disabled:opacity-40 ${
              callState === "connected" ? "bg-rose-600" : "bg-emerald-600 animate-bounce"
            }`}
          >
            <PhoneOff size={24} className={callState === "connected" ? "rotate-[135deg]" : ""} />
          </button>
        </div>

        {/* Low Profile Diagnostic Labels */}
        {(lowBandwidthMode || audioRoute || networkType) && (
          <div className="text-[10px] text-white/30 tracking-wide flex gap-3">
            {lowBandwidthMode && <span>Low Bandwidth</span>}
            {audioRoute && <span>Route: {audioRoute}</span>}
            {networkType && <span>Network: {networkType}</span>}
          </div>
        )}
      </footer>

      {/* --- BACKGROUND CALL CONTROL MODALS & HOOK OVERLAYS --- */}
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
