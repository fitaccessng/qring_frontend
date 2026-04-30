import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Bell,
  ChevronLeft,
  History,
  KeyRound,
  LayoutGrid,
  LockOpen,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  RotateCcw,
  Shield,
  User as UserIcon
} from "lucide-react";
import VisitorIncomingCallModal from "../../components/VisitorIncomingCallModal";
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
  const {
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
    startVideoCall,
    toggleMute,
    switchCamera,
    endCall,
    acceptIncomingCall,
    rejectIncomingCall
  } = useSessionRealtime(sessionId);

  const [seconds, setSeconds] = useState(0);
  const [isPanicActive] = useState(false);
  const showRemoteAsPrimary = callState === "connected" && remoteVideoActive;
  const quickResponses = ["I'm on my way", "Leave at door", { label: "Unlock Door", icon: <LockOpen size={14} /> }];

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

  return (
    <div className="bg-slate-950 font-sans text-slate-900 overflow-hidden h-screen w-screen">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="fixed inset-0 z-0">
        <video
          ref={showRemoteAsPrimary ? remoteVideoRef : localVideoRef}
          autoPlay
          playsInline
          muted={!showRemoteAsPrimary}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
      </div>

      <header className="fixed top-0 w-full z-[100] bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2.5 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-none">Video Feed</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                {isPanicActive ? "🔴 Emergency Active" : "🟢 System Armed"}
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

      <div className="fixed top-28 right-6 w-28 md:w-32 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-40 bg-slate-800">
        <video
          ref={showRemoteAsPrimary ? localVideoRef : remoteVideoRef}
          autoPlay
          playsInline
          muted={showRemoteAsPrimary}
          className="w-full h-full object-cover"
        />
      </div>

      <main className="fixed bottom-36 left-0 right-0 z-50 p-8 flex flex-col items-center gap-6">
        <div className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-white text-[10px] font-black uppercase tracking-widest tabular-nums">
            Live • {callState === "connected" ? formatDuration(seconds) : formatCallStatus(callState)}
          </span>
        </div>

        {featureError ? <p className="text-sm font-bold text-rose-200">{featureError}</p> : null}

        <div className="flex flex-wrap justify-center gap-2 max-w-sm">
          {quickResponses.map((res, i) => (
            <button
              key={i}
              type="button"
              className="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full text-white font-bold text-[11px] uppercase tracking-wider hover:bg-white/20 transition-all active:scale-95"
            >
              {typeof res === "string" ? `"${res}"` : <span className="flex items-center gap-2">{res.icon} {res.label}</span>}
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
            onClick={callState === "connected" ? endCall : startVideoCall}
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
      </main>

      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-8 pt-4 bg-white border-t border-slate-100 z-[9999] shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
        <NavItem to="/dashboard/homeowner/overview" icon={<LayoutGrid size={22} />} label="Home" />
        <NavItem to="/dashboard/homeowner/visits" icon={<History size={22} />} label="Activity" />
        <NavItem to="/dashboard/homeowner/safety" icon={<Shield size={22} />} label="Safety" active />
        <NavItem to="/dashboard/homeowner/doors" icon={<KeyRound size={22} />} label="Access" />
        <NavItem to="/dashboard/homeowner/settings" icon={<UserIcon size={22} />} label="Profile" />
      </nav>

      <VisitorIncomingCallModal
        open={incomingCall.pending}
        hasVideo={incomingCall.hasVideo}
        onAccept={acceptIncomingCall}
        onReject={rejectIncomingCall}
      />
    </div>
  );
}

function NavItem({ to, icon, label, active = false }) {
  return (
    <Link to={to} className={`flex flex-col items-center gap-1 transition-all ${active ? "text-indigo-600" : "text-slate-400"}`}>
      <div className={`${active ? "bg-indigo-50 p-2 rounded-xl" : "p-2"}`}>{icon}</div>
      <span className="text-[9px] font-black uppercase mt-0.5 tracking-tight">{label}</span>
    </Link>
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
