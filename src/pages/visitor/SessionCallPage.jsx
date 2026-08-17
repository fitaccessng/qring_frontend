import { useEffect } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Mic, MicOff, PhoneOff, RotateCcw, SwitchCamera, User, Volume2, VolumeX } from "lucide-react";
import SessionNetworkBadge from "../../components/SessionNetworkBadge";
import { useSessionRealtime } from "../../hooks/useSessionRealtime";

export default function SessionCallPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const requestedCallMode = resolveRequestedCallMode(location.pathname, searchParams);

  const {
    callState,
    status,
    networkQuality,
    networkDetail,
    acceptedCallMode,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    muted,
    speakerOn,
    remoteVideoActive,
    retryCallConnection,
    toggleMute,
    toggleSpeaker,
    switchCamera,
    endCall
  } = useSessionRealtime(sessionId, { requestedCallMode });

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = requestedCallMode === "video" ? "Video Call" : "Audio Call";
  }, [requestedCallMode]);

  useEffect(() => {
    if (!["ended", "rejected", "failed"].includes(callState)) return;
    const timer = window.setTimeout(() => {
      navigate(`/session/${sessionId}/message`, { replace: true });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [callState, navigate, sessionId]);

  if (!sessionId) {
    return <div className="grid min-h-dvh place-items-center bg-slate-950 text-sm text-slate-400">Invalid session link</div>;
  }

  const isVideo = (acceptedCallMode || requestedCallMode || "audio") === "video";
  const isConnected = callState === "connected";
  const isTerminal = ["ended", "rejected", "failed"].includes(callState);

  // Terminal / Ended View
  if (isTerminal) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-950 px-4 text-white">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-900 border border-slate-800 text-slate-400">
            <PhoneOff size={24} />
          </div>
          <h1 className="text-lg font-semibold capitalize">{callState}</h1>
          <button
            type="button"
            onClick={() => navigate(`/session/${sessionId}/message`, { replace: true })}
            className="mt-2 rounded-full bg-white/10 px-5 py-2 text-xs font-medium backdrop-blur transition hover:bg-white/20"
          >
            Back to chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-slate-950 text-white select-none">
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Top Header Floating Overlay */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-slate-950/80 to-transparent">
        <SessionNetworkBadge quality={networkQuality} detail={networkDetail} />
        {status && <span className="text-xs text-amber-300 font-medium">{status}</span>}
      </header>

      {/* Main Call Viewport */}
      <main className="relative h-dvh w-full flex flex-col items-center justify-center">
        {isVideo ? (
          <div className="relative h-full w-full bg-slate-900">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`h-full w-full object-cover transition-opacity duration-300 ${isConnected && remoteVideoActive ? "opacity-100" : "opacity-0"}`}
            />
            {(!isConnected || !remoteVideoActive) && (
              <div className="absolute inset-0 grid place-items-center bg-slate-900">
                <div className="grid h-24 w-24 place-items-center rounded-full bg-slate-800/80 text-slate-400 animate-pulse">
                  <User size={48} />
                </div>
              </div>
            )}
            {/* Local Video Pip */}
            <div className="absolute right-4 top-16 h-36 w-24 overflow-hidden rounded-2xl border border-white/20 bg-slate-900 shadow-2xl">
              <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            </div>
          </div>
        ) : (
          /* Audio Call Minimal View */
          <div className="flex flex-col items-center gap-4">
            <div className="relative grid h-28 w-28 place-items-center rounded-full bg-slate-900 border border-slate-800">
              <User size={52} className="text-slate-400" />
              {!isConnected && <div className="absolute inset-0 rounded-full border-2 border-emerald-500/50 animate-ping" />}
            </div>
            <p className="text-xs tracking-wider uppercase font-semibold text-slate-400">
              {isConnected ? "Connected" : "Calling..."}
            </p>
          </div>
        )}
      </main>

      {/* Bottom Floating Controls Bar */}
      <footer className="absolute inset-x-0 bottom-8 z-20 flex justify-center px-4">
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-slate-900/80 px-5 py-3 shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            className={`grid h-12 w-12 place-items-center rounded-full transition ${muted ? "bg-white text-slate-950" : "bg-white/10 text-white hover:bg-white/20"}`}
          >
            {muted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <button
            type="button"
            onClick={toggleSpeaker}
            aria-label={speakerOn ? "Mute speaker" : "Turn on speaker"}
            className={`grid h-12 w-12 place-items-center rounded-full transition ${speakerOn ? "bg-white text-slate-950" : "bg-white/10 text-white hover:bg-white/20"}`}
          >
            {speakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>

          {isVideo && (
            <button
              type="button"
              onClick={switchCamera}
              aria-label="Switch camera"
              className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <SwitchCamera size={20} />
            </button>
          )}

          <button
            type="button"
            onClick={retryCallConnection}
            aria-label="Retry connection"
            className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <RotateCcw size={20} />
          </button>

          <button
            type="button"
            onClick={() => void endCall()}
            aria-label="End call"
            className="grid h-12 w-12 place-items-center rounded-full bg-rose-600 text-white transition hover:bg-rose-700"
          >
            <PhoneOff size={20} />
          </button>
        </div>
      </footer>
    </div>
  );
}

function resolveRequestedCallMode(pathname, searchParams) {
  const queryMode = String(searchParams.get("mode") || "").trim().toLowerCase();
  if (queryMode === "audio" || queryMode === "video") return queryMode;
  const path = String(pathname || "").toLowerCase();
  if (path.endsWith("/audio")) return "audio";
  if (path.endsWith("/video")) return "video";
  return "audio";
}