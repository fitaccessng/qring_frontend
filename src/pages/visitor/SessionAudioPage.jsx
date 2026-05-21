import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Bell,
  ChevronLeft,
  MicOff,
  PhoneOff,
  Radio,
  RotateCcw,
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
  const { unreadCount } = useNotifications();
  const exitRoute = getExitRoute(sessionId);
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#eff6ff_0,_#f8fafc_38%,_#e2e8f0_100%)] font-sans text-slate-900 antialiased flex flex-col">
      <audio ref={remoteAudioRef} autoPlay playsInline />
      <header className="fixed top-0 w-full z-[100] bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(exitRoute)}
              className="p-2.5 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-none">Secure Audio Call</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                {connected ? "Signal online" : "Signal reconnecting"}
              </p>
            </div>
          </div>
          <Link to="/dashboard/notifications" className="relative p-2.5 bg-slate-50 text-slate-600 rounded-full">
            <Bell size={18} />
            {unreadCount > 0 ? (
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
            ) : null}
          </Link>
        </div>
      </header>

      <main
        className="flex-grow flex flex-col items-center justify-between pt-32 pb-32 relative overflow-hidden px-6"
      >
        <div className="absolute inset-x-0 top-24 mx-auto h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="z-10 flex w-full max-w-xl flex-col items-center text-center">
          <div className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full flex items-center gap-2 mb-6 animate-pulse">
            <Radio size={14} />
            <span className="text-[10px] uppercase tracking-[0.2em] font-black">Encrypted Audio</span>
          </div>

          <div className="grid h-28 w-28 place-items-center rounded-full border border-indigo-200 bg-white/80 shadow-[0_20px_60px_rgba(37,99,235,0.12)]">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-300/50">
              <Radio size={30} />
            </div>
          </div>

          <h1 className="mt-6 text-4xl font-black text-slate-900 tracking-tight mb-3">Visitor at Gate</h1>
          <p className="text-xl font-medium text-slate-500 tabular-nums">
            {callState === "connected" ? formatDuration(connectedSeconds) : formatCallStatus(callState)}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            {networkDetail || (joined ? "Call room ready" : "Preparing call room")}
          </p>
          {featureError ? <p className="mt-3 text-sm font-bold text-rose-500">{featureError}</p> : null}
          {status ? <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{status}</p> : null}

          <div className="mt-6 grid w-full gap-3 sm:grid-cols-3">
            <InfoTile label="Signaling" value={joined ? "Joined" : connected ? "Connected" : "Offline"} />
            <InfoTile label="Network" value={networkQualityLabel(networkQuality)} />
            <InfoTile label="Launch" value={formatLaunchStage(callLaunchStage)} />
          </div>
        </div>

        <div className="z-10 w-full max-w-md">
          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Live Controls</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Route {audioRoute} · Link {networkType || "unknown"}
                </p>
              </div>
              {lowBandwidthMode ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                  Low bandwidth
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-10">
            <ControlBtn icon={<MicOff size={24} />} label={muted ? "Unmute" : "Mute"} active={muted} onClick={toggleMute} />
            <ControlBtn icon={<RotateCcw size={24} />} label="Retry" onClick={retryCallConnection} disabled={!canStartCall && callState !== "connected"} />
            <ControlBtn icon={<Volume2 size={24} />} label="Speaker" active={speakerOn} onClick={toggleSpeaker} disabled={callState !== "connected"} />
            </div>

            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={startAudioCall}
                disabled={Boolean(featureError) || !canStartCall}
                className="px-6 h-12 rounded-2xl bg-indigo-600 text-white font-bold disabled:opacity-45"
              >
                {callState === "connected" ? "Connected" : "Start Call"}
              </button>
              <button type="button" onClick={endCall} className="group flex flex-col items-center outline-none">
                <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-rose-700 rounded-full flex items-center justify-center text-white shadow-[0_12px_40px_rgba(244,63,94,0.3)] active:scale-90 transition-all duration-300">
                  <PhoneOff size={32} strokeWidth={2.5} className="rotate-[135deg]" />
                </div>
                <span className="mt-4 text-[11px] font-black uppercase tracking-[0.2em] text-rose-600">End Call</span>
              </button>
            </div>
          </div>
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

function ControlBtn({ icon, label, active = false, onClick, disabled = false }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 disabled:opacity-45 ${
          active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-100 shadow-sm"
        }`}
      >
        {icon}
      </button>
      <span className={`text-[10px] font-black uppercase tracking-widest ${active ? "text-indigo-600" : "text-slate-400"}`}>{label}</span>
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-left shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-800">{value}</p>
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
