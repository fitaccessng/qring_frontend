import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Bell,
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
  const { unreadCount } = useNotifications();
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

  async function handleEndCall() {
    await endCall();
    if (shouldReturnToMessagesAfterEnd) {
      navigate(exitRoute, { replace: true });
    }
  }

  return (
    <div className="bg-slate-950 font-sans text-slate-900 overflow-hidden h-screen w-screen">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="fixed inset-0 z-0">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${showRemoteAsPrimary ? "opacity-100" : "opacity-0"}`}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
      </div>

      <header className="fixed top-0 w-full z-[100] bg-black/25 backdrop-blur-md border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(exitRoute)}
              className="p-2.5 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="font-bold text-lg text-white leading-none">Live Video Call</h1>
              <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest mt-1">
                {isPanicActive ? "Emergency active" : connected ? "Signal online" : "Signal reconnecting"}
              </p>
            </div>
          </div>
          <Link to="/dashboard/notifications" className="relative p-2.5 bg-white/10 text-white rounded-full">
            <Bell size={18} />
            {unreadCount > 0 ? (
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-slate-950" />
            ) : null}
          </Link>
        </div>
      </header>

      <div
        className={`fixed overflow-hidden border-white/20 shadow-2xl z-40 bg-slate-800 transition-all duration-300 ${
          showRemoteAsPrimary
            ? "top-28 right-6 w-28 md:w-32 aspect-[3/4] rounded-2xl border-2"
            : "inset-0 w-full h-full border-0 rounded-none"
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

      <main className="fixed bottom-24 left-0 right-0 z-50 p-6 flex flex-col items-center gap-5">
        <div className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-white text-[10px] font-black uppercase tracking-widest tabular-nums">
            Live • {callState === "connected" ? formatDuration(seconds) : formatCallStatus(callState)}
          </span>
        </div>

        <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-black/35 p-4 text-white shadow-2xl backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">Call Status</p>
              <p className="mt-1 text-lg font-semibold">{networkDetail || formatCallStatus(callState)}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em]">
              <span className="rounded-full bg-white/10 px-3 py-1">{joined ? "Room joined" : "Joining room"}</span>
              <span className="rounded-full bg-white/10 px-3 py-1">{networkQualityLabel(networkQuality)}</span>
              <span className="rounded-full bg-white/10 px-3 py-1">{formatLaunchStage(callLaunchStage)}</span>
            </div>
          </div>
          {featureError ? <p className="mt-3 text-sm font-bold text-rose-200">{featureError}</p> : null}
          {status ? <p className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100">{status}</p> : null}
        </div>

        <div className="flex flex-wrap justify-center gap-2 max-w-sm">
          {quickResponses.map((res, i) => (
            <button
              key={i}
              type="button"
              onClick={() => sendQuickResponse(res.key)}
              className="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full text-white font-bold text-[11px] uppercase tracking-wider hover:bg-white/20 transition-all active:scale-95"
            >
              {res.icon ? <span className="flex items-center gap-2">{res.icon} {res.label}</span> : `"${res.label}"`}
            </button>
          ))}
        </div>

        <div className="flex gap-6 items-center justify-center w-full max-w-md">
          <button
            type="button"
            onClick={toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-xl border border-white/10 transition-all ${muted ? "bg-rose-500 text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
          >
            {muted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          <button
            type="button"
            onClick={callState === "connected" ? handleEndCall : startVideoCall}
            disabled={Boolean(featureError) || (!canStartCall && callState !== "connected")}
            className="w-20 h-20 rounded-full bg-rose-600 flex items-center justify-center text-white shadow-[0_0_40px_rgba(225,29,72,0.4)] active:scale-90 transition-all disabled:opacity-45"
          >
            <PhoneOff size={32} strokeWidth={2.5} className="rotate-[135deg]" />
          </button>

          <button
            type="button"
            onClick={switchCamera}
            className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center text-white border border-white/10 hover:bg-white/20 transition-all"
          >
            <RotateCcw size={22} className={cameraFacing === "user" ? "" : "rotate-180"} />
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={retryCallConnection}
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white"
          >
            Retry Link
          </button>
          {lowBandwidthMode ? (
            <span className="rounded-full border border-amber-200/20 bg-amber-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-amber-100">
              Low bandwidth mode
            </span>
          ) : null}
        </div>
      </main>

      <VisitorIncomingCallModal
        open={incomingCall.pending}
        hasVideo={incomingCall.hasVideo}
        onAccept={acceptIncomingCall}
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

function formatLaunchStage(value) {
  if (!value || value === "idle") return "Standby";
  if (value === "starting") return "Starting";
  return value;
}
