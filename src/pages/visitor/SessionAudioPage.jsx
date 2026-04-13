import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Bell,
  ChevronLeft,
  Grid3X3,
  History,
  KeyRound,
  LayoutGrid,
  MicOff,
  PhoneOff,
  Radio,
  Shield,
  User as UserIcon,
  Volume2
} from "lucide-react";
import VisitorIncomingCallModal from "../../components/VisitorIncomingCallModal";
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
    callState,
    muted,
    speakerOn,
    featureError,
    callConnectedAt,
    incomingCall,
    canStartCall,
    startAudioCall,
    toggleMute,
    toggleSpeaker,
    endCall,
    retryCallConnection,
    acceptIncomingCall,
    rejectIncomingCall
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
    <div className="min-h-screen bg-[#fcfcfd] font-sans text-slate-900 antialiased flex flex-col">
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
              <h1 className="font-bold text-lg text-slate-900 leading-none">Front Door Call</h1>
              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-1">● Live Connection</p>
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
        className="flex-grow flex flex-col items-center justify-between pt-32 pb-44 relative overflow-hidden px-6"
        style={{
          backgroundImage:
            "linear-gradient(rgba(252, 252, 253, 0.8), rgba(252, 252, 253, 0.98)), url('https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&q=80&w=800')",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <div className="z-10 flex flex-col items-center text-center">
          <div className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full flex items-center gap-2 mb-8 animate-pulse">
            <Radio size={14} />
            <span className="text-[10px] uppercase tracking-[0.2em] font-black">Encrypted Audio</span>
          </div>

          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Visitor at Gate</h1>
          <p className="text-xl font-medium text-slate-500 tabular-nums">
            {callState === "connected" ? formatDuration(connectedSeconds) : formatCallStatus(callState)}
          </p>
          {featureError ? <p className="mt-3 text-sm font-bold text-rose-500">{featureError}</p> : null}
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[80px] -z-0" />

        <div className="z-10 w-full max-w-md">
          <div className="grid grid-cols-3 gap-4 mb-16">
            <ControlBtn icon={<MicOff size={24} />} label={muted ? "Unmute" : "Mute"} active={muted} onClick={toggleMute} />
            <ControlBtn icon={<Grid3X3 size={24} />} label="Retry" onClick={retryCallConnection} disabled={!canStartCall} />
            <ControlBtn icon={<Volume2 size={24} />} label="Speaker" active={speakerOn} onClick={toggleSpeaker} disabled={callState !== "connected"} />
          </div>

          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={startAudioCall}
              disabled={Boolean(featureError) || !canStartCall}
              className="px-6 h-12 rounded-2xl bg-indigo-600 text-white font-bold disabled:opacity-45"
            >
              Start Call
            </button>
            <button type="button" onClick={endCall} className="group flex flex-col items-center outline-none">
              <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-rose-700 rounded-full flex items-center justify-center text-white shadow-[0_12px_40px_rgba(244,63,94,0.3)] active:scale-90 transition-all duration-300">
                <PhoneOff size={32} strokeWidth={2.5} className="rotate-[135deg]" />
              </div>
              <span className="mt-4 text-[11px] font-black uppercase tracking-[0.2em] text-rose-600">End Call</span>
            </button>
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-8 pt-4 bg-white border-t border-slate-100 z-[9999] shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
        <NavItem to="/dashboard/homeowner/overview" icon={<LayoutGrid size={22} />} label="Home" />
        <NavItem to="/dashboard/homeowner/visits" icon={<History size={22} />} label="Activity" />
        <NavItem to="/dashboard/homeowner/safety" icon={<Shield size={22} />} label="Safety" />
        <NavItem to="/dashboard/homeowner/doors" icon={<KeyRound size={22} />} label="Access" active />
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

function NavItem({ to, icon, label, active = false }) {
  return (
    <Link to={to} className={`flex flex-col items-center gap-1 ${active ? "text-indigo-600" : "text-slate-400"}`}>
      <div className={`${active ? "bg-indigo-50 p-2 rounded-xl" : "p-2"}`}>{icon}</div>
      <span className="text-[9px] font-black uppercase mt-0.5 tracking-tight">{label}</span>
    </Link>
  );
}

function getExitRoute(sessionId) {
  try {
    const user = JSON.parse(localStorage.getItem("qring_user") || "null");
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
