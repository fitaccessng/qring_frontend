import {
  ConnectionState,
  DisconnectReason,
  Room,
  RoomEvent,
  Track,
  createLocalAudioTrack,
  createLocalVideoTrack
} from "livekit-client";
import { apiRequest } from "./apiClient";
import { getVisitorSessionToken } from "./visitorSessionToken";

const LOG_ENABLED = import.meta.env?.MODE !== "production";

function log(message, detail = {}) {
  if (!LOG_ENABLED || typeof console === "undefined") return;
  console.info(`[QRING LIVEKIT] ${message}`, detail);
}

export function normalizeLiveKitPermissionError(error, wantsVideo = false) {
  const name = String(error?.name || "").trim();
  const message = String(error?.message || "").trim();
  const lowered = `${name} ${message}`.toLowerCase();
  if (lowered.includes("notallowed") || lowered.includes("permission") || lowered.includes("denied")) {
    return wantsVideo
      ? "Camera permission is required for video calls."
      : "Microphone permission is required for audio calls.";
  }
  if (lowered.includes("notfound") || lowered.includes("device")) {
    return wantsVideo ? "Camera or microphone is unavailable." : "Microphone is unavailable.";
  }
  return message || "Unable to start call media.";
}

export async function fetchLiveKitCallToken({ callSessionId, participantType, visitorId, sessionId }) {
  const response = await apiRequest("/calls/livekit/token", {
    method: "POST",
    body: JSON.stringify({
      callSessionId,
      participantType,
      visitorId: participantType === "visitor" ? visitorId || sessionId : undefined,
      visitorToken: participantType === "visitor" ? getVisitorSessionToken(sessionId) || undefined : undefined
    })
  });
  return response?.data ?? null;
}

export async function connectLiveKitCall({
  url,
  token,
  callType = "audio",
  audioElement,
  videoElement,
  localVideoElement,
  speakerOn = true,
  facingMode = "user",
  onState,
  onRemoteMedia,
  onLocalMedia,
  onParticipantJoined,
  onParticipantLeft,
  onDisconnected,
  onError
}) {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true
  });
  const localTracks = [];
  const wantsVideo = String(callType).toLowerCase() === "video";

  const attachPublication = (publication) => {
    const track = publication?.track;
    if (!track) return;
    const element = track.kind === Track.Kind.Video ? videoElement : audioElement;
    if (!element) return;
    try {
      track.attach(element);
      if (track.kind === Track.Kind.Audio) {
        element.muted = !speakerOn;
        element.autoplay = true;
      } else {
        element.muted = true;
        element.playsInline = true;
      }
      const playPromise = element.play?.();
      if (playPromise?.catch) {
        playPromise.catch((error) => {
          onError?.(error);
          log("livekit playback blocked", { kind: track.kind, participant: publication?.participantIdentity || publication?.name || "remote" });
        });
      }
      onRemoteMedia?.({ kind: track.kind, active: true });
      log("LIVEKIT REMOTE TRACK", {
        callType,
        kind: track.kind,
        source: publication?.source,
        participant: publication?.participantIdentity || publication?.name || "remote",
        room: room.name,
        attachedTo: track.kind === Track.Kind.Video ? "videoElement" : "audioElement"
      });
    } catch (error) {
      onError?.(error);
    }
  };

  room
    .on(RoomEvent.ConnectionStateChanged, (state) => {
      log(String(state).toLowerCase());
      onState?.(state);
    })
    .on(RoomEvent.ParticipantConnected, (participant) => {
      log("participant joined", { identity: participant.identity });
      onParticipantJoined?.(participant);
    })
    .on(RoomEvent.ParticipantDisconnected, (participant) => {
      log("participant left", { identity: participant.identity });
      onParticipantLeft?.(participant);
    })
    .on(RoomEvent.TrackSubscribed, (track, publication) => {
      log("LIVEKIT TRACK SUBSCRIBED", { kind: track.kind, source: publication?.source, sid: publication?.trackSid });
      attachPublication({ ...publication, track });
    })
    .on(RoomEvent.TrackPublished, (publication) => {
      log("LIVEKIT TRACK PUBLISHED", { kind: publication?.kind, source: publication?.source, sid: publication?.trackSid });
    })
    .on(RoomEvent.TrackUnsubscribed, (track) => {
      try {
        track.detach();
      } catch {
        // ignore detach differences across SDK/browser versions
      }
      onRemoteMedia?.({ kind: track.kind, active: false });
    })
    .on(RoomEvent.Disconnected, (reason) => {
      log("disconnected", { reason });
      onState?.(ConnectionState.Disconnected);
      onDisconnected?.(reason);
    })
    .on(RoomEvent.Reconnecting, () => {
      log("reconnecting");
      onState?.("reconnecting");
    })
    .on(RoomEvent.Reconnected, () => {
      log("reconnected");
      onState?.(ConnectionState.Connected);
    });

  log("LIVEKIT CONNECT", { callType, url, room: "pending", participantIdentity: token ? "token-present" : "token-missing" });
  try {
    await room.connect(url, token, { autoSubscribe: true });
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();
    const status = Number(error?.status || error?.code || 0);
    const isAuthFailure =
      status === 401 ||
      status === 403 ||
      message.includes("token") ||
      message.includes("jwt") ||
      message.includes("authorization") ||
      message.includes("notallowed");
    if (isAuthFailure) {
      error.liveKitAuthFailed = true;
      error.disconnectReason = DisconnectReason.USER_REJECTED;
    }
    throw error;
  }

  try {
    const audioTrack = await createLocalAudioTrack({
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    });
    localTracks.push(audioTrack);
    await room.localParticipant.publishTrack(audioTrack);

    if (wantsVideo) {
      const videoTrack = await createLocalVideoTrack({
        facingMode,
        resolution: { width: 640, height: 360, frameRate: 24 }
      });
      localTracks.push(videoTrack);
      if (localVideoElement) {
        videoTrack.attach(localVideoElement);
        localVideoElement.muted = true;
        localVideoElement.playsInline = true;
        void localVideoElement.play?.().catch((error) => {
          onError?.(error);
          log("livekit local preview playback blocked", { kind: "video" });
        });
      }
      await room.localParticipant.publishTrack(videoTrack);
    }
  } catch (error) {
    room.disconnect();
    throw new Error(normalizeLiveKitPermissionError(error, wantsVideo));
  }

  onLocalMedia?.({ audio: true, video: wantsVideo });
  room.remoteParticipants.forEach((participant) => {
    participant.trackPublications.forEach((publication) => attachPublication(publication));
  });
  log("LIVEKIT CONNECT", { callType, url, room: room.name, participantIdentity: room.localParticipant?.identity || "unknown" });
  log("connected", { name: room.name });

  return { room, localTracks };
}

export function disconnectLiveKitCall(connection) {
  if (!connection) return;
  for (const track of connection.localTracks || []) {
    try {
      track.stop();
      track.detach();
    } catch {
      // ignore
    }
  }
  try {
    connection.room?.disconnect();
  } catch {
    // ignore
  }
}
