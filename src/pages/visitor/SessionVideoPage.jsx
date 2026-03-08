import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Camera, CameraOff, Mic, PhoneOff, RefreshCw, RotateCcw, Volume2 } from "lucide-react";
import VisitorIncomingCallModal from "../../components/VisitorIncomingCallModal";
import { useSessionRealtime } from "../../hooks/useSessionRealtime";

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function SessionVideoPage() {
  const { sessionId } = useParams();
  const exitRoute = getExitRoute(sessionId);
  const {
    callState,
    muted,
    speakerOn,
    cameraOn,
    cameraFacing,
    status,
    networkQuality,
    featureError,
    localStreamRef,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    incomingCall,
    canStartCall,
    remoteVideoActive,
    toggleMute,
    toggleSpeaker,
    toggleCamera,
    switchCamera,
    endCall,
    startVideoCall,
    retryCallConnection,
    acceptIncomingCall,
    rejectIncomingCall
  } = useSessionRealtime(sessionId);

  const [connectedSeconds, setConnectedSeconds] = useState(0);
  const showRemoteAsPrimary = callState === "connected" && remoteVideoActive;
  const showReconnectBanner = networkQuality === "reconnecting" || networkQuality === "slow";

  useEffect(() => {
    if (callState !== "connected") {
      setConnectedSeconds(0);
      return;
    }
    const start = Date.now();
    const timer = setInterval(() => {
      setConnectedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [callState]);

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="relative mx-auto min-h-screen w-full max-w-md overflow-hidden">
        <audio ref={remoteAudioRef} autoPlay playsInline />

        <video
          ref={showRemoteAsPrimary ? remoteVideoRef : localVideoRef}
          autoPlay
          playsInline
          muted={!showRemoteAsPrimary}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/75" />

        <header className="relative z-20 flex items-start justify-between px-5 pb-2 pt-[calc(1rem+env(safe-area-inset-top))]">
          <div>
            <p className="text-[22px] font-semibold leading-tight tracking-tight">Homeowner</p>
            <p className="mt-0.5 text-[13px] font-medium text-white/85">
              {callState === "connected" ? formatDuration(connectedSeconds) : callState}
            </p>
            <p className="mt-0.5 text-[12px] text-white/70">{networkQuality}</p>
          </div>
          <Link to={exitRoute} className="rounded-full bg-white/20 px-3 py-1.5 text-[11px] font-semibold backdrop-blur">
            Back
          </Link>
        </header>

        {showReconnectBanner ? (
          <div className="relative z-20 mx-5 rounded-xl bg-amber-500/25 px-3 py-2 text-[12px] text-amber-100 backdrop-blur">
            {networkQuality === "reconnecting" ? "Reconnecting..." : "Poor connection"} {status ? `| ${status}` : ""}
          </div>
        ) : null}

        <article className="absolute right-5 top-28 z-20 w-28 overflow-hidden rounded-[16px] border border-white/45 bg-black/35 shadow-xl backdrop-blur">
          <video
            ref={showRemoteAsPrimary ? localVideoRef : remoteVideoRef}
            autoPlay
            playsInline
            muted={showRemoteAsPrimary}
            className="h-36 w-full object-cover"
          />
          <p className="bg-black/45 px-2 py-1 text-[10px] font-medium text-white/90">
            {showRemoteAsPrimary ? "You" : "Homeowner"}
          </p>
        </article>

        <div className="absolute inset-x-0 bottom-0 z-30 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {featureError ? (
            <div className="mb-3 rounded-xl bg-rose-500/25 px-3 py-2 text-[12px] text-rose-100">{featureError}</div>
          ) : null}
          <div className="rounded-[28px] border border-white/20 bg-black/52 p-4 backdrop-blur-md">
            <div className="grid grid-cols-5 gap-2.5">
              <CallControl
                label={muted ? "Unmute" : "Mute"}
                onClick={toggleMute}
                disabled={!localStreamRef.current}
                icon={<Mic size={17} />}
              />
              <CallControl
                label={cameraOn ? "Camera Off" : "Camera On"}
                onClick={toggleCamera}
                disabled={!localStreamRef.current}
                icon={cameraOn ? <CameraOff size={17} /> : <Camera size={17} />}
              />
              <CallControl
                label={cameraFacing === "user" ? "Flip Rear" : "Flip Front"}
                onClick={switchCamera}
                disabled={!cameraOn}
                icon={<RotateCcw size={17} />}
              />
              <CallControl
                label={speakerOn ? "Speaker" : "Earpiece"}
                onClick={toggleSpeaker}
                disabled={callState !== "connected"}
                icon={<Volume2 size={17} />}
              />
              <CallControl label="Retry" onClick={retryCallConnection} disabled={!canStartCall} icon={<RefreshCw size={17} />} />
            </div>
            <div className="mt-3.5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={startVideoCall}
                disabled={Boolean(featureError) || !canStartCall}
                className="h-12 rounded-2xl bg-white/20 px-4 text-[14px] font-semibold disabled:opacity-45"
              >
                Start Video
              </button>
              <button
                type="button"
                onClick={endCall}
                className="h-12 rounded-2xl bg-rose-500 px-4 text-[14px] font-semibold"
              >
                <span className="inline-flex items-center gap-2">
                  <PhoneOff size={16} />
                  End Call
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <VisitorIncomingCallModal
        open={incomingCall.pending && !canStartCall}
        hasVideo={incomingCall.hasVideo}
        onAccept={acceptIncomingCall}
        onReject={rejectIncomingCall}
      />
    </div>
  );
}

function CallControl({ label, icon, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="grid h-14 place-items-center rounded-2xl bg-white/15 text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span className="flex flex-col items-center gap-0.5">
        {icon}
        <span className="text-[10px] font-medium leading-none">{label}</span>
      </span>
    </button>
  );
}

function getExitRoute(sessionId) {
  try {
    const user = JSON.parse(localStorage.getItem("qring_user") || "null");
    if (user?.role === "visitor") return `/session/${sessionId}/message`;
    if (user?.role === "admin") return "/dashboard/admin";
    if (user?.role === "estate") return "/dashboard/estate";
    return "/dashboard/homeowner/visits";
  } catch {
    return `/session/${sessionId}/message`;
  }
}
