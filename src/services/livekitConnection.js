export const LIVEKIT_DEFAULT_CONNECT_TIMEOUT_MS = 8000;
export const LIVEKIT_DEFAULT_RING_TIMEOUT_MS = 30000;

export function buildLivekitRtcConfig({ iceServers = [], forceRelay = false } = {}) {
  return {
    iceServers,
    iceCandidatePoolSize: 8,
    iceTransportPolicy: forceRelay ? "relay" : "all",
  };
}

export function buildLivekitRoomOptions({
  iceServers = [],
  lowBandwidth = false,
  forceRelay = false,
} = {}) {
  return {
    adaptiveStream: true,
    dynacast: true,
    rtcConfig: buildLivekitRtcConfig({ iceServers, forceRelay }),
    publishDefaults: {
      simulcast: false,
      videoCodec: "h264",
      dtx: true,
      red: true,
      audioBitrate: lowBandwidth ? 24000 : 32000,
      videoEncoding: {
        maxBitrate: lowBandwidth ? 350_000 : 450_000,
        maxFramerate: lowBandwidth ? 12 : 15,
      },
    },
    videoCaptureDefaults: buildLivekitVideoCaptureOptions({ lowBandwidth }),
  };
}

export function buildLivekitConnectOptions({
  websocketTimeoutMs,
  peerConnectionTimeoutMs,
} = {}) {
  return {
    maxRetries: 6,
    websocketTimeout: websocketTimeoutMs ?? 15000,
    peerConnectionTimeout: peerConnectionTimeoutMs ?? 30000,
  };
}

export function buildLivekitVideoCaptureOptions({
  lowBandwidth = false,
  facingMode = "user",
} = {}) {
  return lowBandwidth
    ? {
        width: 480,
        height: 270,
        frameRate: 12,
        facingMode,
      }
    : {
        width: 640,
        height: 360,
        frameRate: 15,
        facingMode,
      };
}

export function describeLivekitAttempt({ mode = "audio", forceRelay = false } = {}) {
  const mediaLabel = mode === "video" ? "video" : "audio";
  return `${mediaLabel}${forceRelay ? " over TURN relay" : " with auto ICE"}`;
}
