export const CALL_MEDIA_MODE = {
  VIDEO: "video",
  AUDIO: "audio",
  VOICE_NOTE: "voice-note",
  TEXT: "text",
};

export function getConnectWatchdogMs({ lowBandwidth = false, forceRelay = false } = {}) {
  if (forceRelay) return 5000;
  if (lowBandwidth) return 6500;
  return 8000;
}

export function getRingTimeoutMs(rawValue, fallbackMs = 30000) {
  const parsed = Number(rawValue);
  if (Number.isFinite(parsed) && parsed >= 10000) return parsed;
  return fallbackMs;
}

export function getNextFallbackAction({
  currentMode = CALL_MEDIA_MODE.AUDIO,
  forceRelay = false,
  preferVoiceNote = true,
} = {}) {
  if (currentMode === CALL_MEDIA_MODE.VIDEO && !forceRelay) {
    return {
      kind: "retry",
      nextMode: CALL_MEDIA_MODE.VIDEO,
      forceRelay: true,
      status: "Reconnecting...",
      detail: "Direct video path failed. Retrying through TURN relay.",
    };
  }

  if (currentMode === CALL_MEDIA_MODE.VIDEO) {
    return {
      kind: "retry",
      nextMode: CALL_MEDIA_MODE.AUDIO,
      forceRelay: true,
      status: "Switching to audio...",
      detail: "Video path stayed unstable. Downgrading to audio over TURN.",
    };
  }

  if (currentMode === CALL_MEDIA_MODE.AUDIO && !forceRelay) {
    return {
      kind: "retry",
      nextMode: CALL_MEDIA_MODE.AUDIO,
      forceRelay: true,
      status: "Reconnecting...",
      detail: "Direct audio path failed. Retrying through TURN relay.",
    };
  }

  if (preferVoiceNote) {
    return {
      kind: "voice-note",
      nextMode: CALL_MEDIA_MODE.VOICE_NOTE,
      status: "Network issue, sending voice message...",
      detail: "Audio could not stabilize. Falling back to asynchronous voice messaging.",
    };
  }

  return {
    kind: "text",
    nextMode: CALL_MEDIA_MODE.TEXT,
    status: "Network issue, switching to chat...",
    detail: "Realtime media failed. Falling back to text messaging.",
  };
}
