import { useEffect } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Mic, MicOff, PhoneCall, PhoneOff, RotateCcw, User, Video, Volume2 } from "lucide-react";
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
    featureError,
    acceptedCallMode,
    cameraFacing,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    muted,
    speakerOn,
    remoteVideoActive,
    requestMediaPermissions,
    retryCallConnection,
    toggleMute,
    toggleSpeaker,
    switchCamera,
    endCall
  } = useSessionRealtime(sessionId);

  useEffect(() => {
    if (typeof document === "undefined") return () => {};
    const previousTitle = document.title;
    document.title =
      requestedCallMode === "video"
        ? "Video Call | Qring"
        : "Audio Call | Qring";
    return () => {
      document.title = previousTitle;
    };
  }, [requestedCallMode]);

  if (!sessionId) {
    return <div className="grid min-h-screen place-items-center bg-slate-950 text-sm font-semibold text-white/70">Session link is incomplete.</div>;
  }

  const activeCallMode = acceptedCallMode || requestedCallMode || "audio";
  const isVideo = activeCallMode === "video";
  const isConnected = callState === "connected";
  const isConnecting = callState === "connecting" || callState === "ringing";
  const isTerminal = callState === "ended" || callState === "rejected" || callState === "failed";
  const routeTheme = isVideo
    ? {
        pageBg: "bg-[radial-gradient(circle_at_top_left,_#f8fafc_0,_#f0fdf4_38%,_#dcfce7_76%,_#bbf7d0_100%)]",
        headerLine: "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400",
        routeChip: "bg-emerald-100 text-emerald-900 border-emerald-200",
        routeBadge: "bg-emerald-50 text-emerald-700 border-emerald-200"
      }
    : {
        pageBg: "bg-[radial-gradient(circle_at_top_left,_#f8fafc_0,_#ecfeff_40%,_#cffafe_78%,_#bae6fd_100%)]",
        headerLine: "bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-300",
        routeChip: "bg-sky-100 text-sky-900 border-sky-200",
        routeBadge: "bg-sky-50 text-sky-700 border-sky-200"
      };
  const callHeadline = isVideo ? "Video call in progress" : "Audio call in progress";
  const callLabel = isVideo ? "Video Call" : "Audio Call";
  const routeIcon = isVideo ? <Video size={11} /> : <PhoneCall size={11} />;

  useEffect(() => {
    if (!isTerminal) return () => {};
    const timer = window.setTimeout(() => {
      navigate(`/session/${sessionId}/message`, { replace: true });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [isTerminal, navigate, sessionId]);

  if (isTerminal) {
    const terminalLabel =
      callState === "rejected"
        ? "Call rejected"
        : callState === "failed"
          ? "Call failed"
          : "Call ended";
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
        <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-white/5 p-6 text-center shadow-[0_24px_90px_rgba(0,0,0,0.35)] backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/50">Session closed</p>
          <h1 className="mt-3 font-heading text-3xl font-black">{terminalLabel}</h1>
          <p className="mt-2 text-sm text-white/70">{status || "Returning to the conversation..."}</p>
          <button
            type="button"
            onClick={() => navigate(`/session/${sessionId}/message`, { replace: true })}
            className="mt-5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Back to chat
          </button>
        </div>
      </div>
    );
  }
  const callSurface = (
    <div className={`relative overflow-hidden text-white ${routeTheme.pageBg}`}>
      <div className={`absolute inset-0 opacity-95 ${isVideo ? "bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.32)_0,_rgba(15,23,42,0.88)_55%,_rgba(2,6,23,1)_100%)]" : "bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.28)_0,_rgba(15,23,42,0.90)_58%,_rgba(2,6,23,1)_100%)]"}`} />
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      <div className="relative">
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
            <div className="grid h-24 w-24 place-items-center rounded-full bg-white/10 backdrop-blur-sm">
              <User size={36} className="text-white/60" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">{isVideo ? "Video Route" : "Audio Route"}</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">{callHeadline}</h2>
              <p className="mt-2 text-sm text-white/70">{isConnecting ? "Connecting securely..." : isConnected ? "You are live now." : "Waiting to connect."}</p>
              {networkDetail ? <p className="mt-2 text-xs text-white/45">{networkDetail}</p> : null}
              {status ? <p className="mt-2 text-xs text-amber-200">{status}</p> : null}
            </div>
          </div>
        )}
      </div>

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

  return (
    <div className={`min-h-screen ${routeTheme.pageBg} p-4 text-slate-900`}>
      <div className="mx-auto w-full max-w-7xl py-6">
        <header className="relative mb-4 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-soft backdrop-blur">
          <div className={`absolute inset-x-0 top-0 h-1 ${routeTheme.headerLine}`} />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/session/${sessionId}/message`, { replace: true })}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] transition hover:-translate-y-px ${routeTheme.routeChip}`}
            >
              {routeIcon}
              Back to chat
            </button>
            <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] ${routeTheme.routeChip}`}>
              <span className="inline-flex items-center gap-1.5">
                {routeIcon}
                {isVideo ? "Video Route" : "Audio Route"}
              </span>
            </span>
            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${routeTheme.routeBadge}`}>
              /session/{sessionId}/{requestedCallMode || "audio"}
            </span>
          </div>
          <h1 className="mt-3 font-heading text-2xl font-black md:text-3xl">{callLabel}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            {isVideo ? "The video surface is isolated here so the call can run without chat distractions." : "The audio surface is isolated here for a cleaner call experience."}
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Session {sessionId} | {callState === "connected" ? "Signaling Online" : "Connecting"} | {isConnected ? "Room Joined" : "Waiting Room"}
          </p>
          <SessionNetworkBadge quality={networkQuality} detail={networkDetail} />
          {featureError ? <p className="mt-2 text-sm text-rose-700">{featureError}</p> : null}
          {status ? <p className="mt-2 text-sm text-amber-700">{status}</p> : null}
        </header>

        <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          {callSurface}
        </article>
      </div>
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
