export function remoteMediaIsAttached(stream) {
  return Boolean(stream && (stream.getAudioTracks?.().length || stream.getVideoTracks?.().length));
}

export function bindStreamToMediaElement(element, stream, { muted = false, autoplay = true, playsInline = true } = {}) {
  if (!element) return;
  element.srcObject = stream || null;
  element.muted = Boolean(muted);
  element.autoplay = Boolean(autoplay);
  element.playsInline = Boolean(playsInline);
}

export function shouldStartCallTimer({ callState = "idle", remoteMediaAttached = false } = {}) {
  return String(callState || "").toLowerCase() === "connected" && Boolean(remoteMediaAttached);
}

export function stopStreamTracks(stream) {
  if (!stream?.getTracks) return;
  for (const track of stream.getTracks()) {
    try {
      track.stop?.();
    } catch {
      // ignore individual track stop failures
    }
  }
}

export function shouldClearIncomingCallOnTerminalEvent(phase) {
  return ["idle", "ended", "rejected", "failed"].includes(String(phase || "").toLowerCase());
}

export function applyRemoteTrackEvent(remoteStream, event) {
  const [incomingStream] = event?.streams || [];
  const track = event?.track;
  let nextStream = remoteStream;
  if (!incomingStream && track && typeof remoteStream?.addTrack === "function") {
    remoteStream.addTrack(track);
  } else if (incomingStream && nextStream !== incomingStream) {
    nextStream = incomingStream;
  }
  return {
    remoteStream: nextStream,
    remoteMediaAttached: remoteMediaIsAttached(nextStream),
    hasVideo: Boolean(nextStream?.getVideoTracks?.().length)
  };
}
