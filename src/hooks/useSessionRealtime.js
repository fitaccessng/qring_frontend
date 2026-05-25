import { useEffect, useMemo, useRef, useState } from "react";
import { env } from "../config/env";
import { apiRequest } from "../services/apiClient";
import {
  CALL_MEDIA_MODE,
  getConnectWatchdogMs,
  getNextFallbackAction,
  getRingTimeoutMs
} from "../services/callFallbackManager";
import { getAccessToken, getStoredUser } from "../services/authStorage";
import {
  clearSessionCallAccess,
  grantSessionCallAccess,
  hasSessionCallAccess
} from "../services/sessionCallAccess";
import { RealtimeEvent } from "../services/realtimeEvents";
import { createRealtimeSocket, releaseRealtimeSocket } from "../services/socketClient";
import { reportRtcEvent } from "../services/rtcMonitoring";
import {
  getHomeownerSessionMessages,
  getVisitorSessionMessages,
  sendHomeownerSessionMessage,
  sendVisitorSessionMessage
} from "../services/homeownerService";
import { addNativeAppStateListener, addNativeNetworkListener } from "../services/nativeAppService";
import { getSecuritySessionMessages, sendSecuritySessionMessage } from "../services/securityService";
import { getVisitorSessionToken } from "../services/visitorSessionToken";
import { playIncomingCallNotificationSound, playMessageNotificationSound } from "../utils/notificationSound";

const LOW_BANDWIDTH_STORAGE_KEY = "qring_low_bandwidth_mode";
const CALL_START_INTENT_KEY = "qring_call_start_intent";
const CALL_ACCEPT_INTENT_KEY = "qring_call_accept_intent";
const CALL_RETRY_LIMIT = 3;
const STATS_POLL_MS = 3000;
const OFFER_ACK_TIMEOUT_MS = 8000;
const MEDIA_WATCHDOG_MS = 5000;
const MEDIA_STALL_TIMEOUT_MS = 12000;
const VIDEO_FREEZE_TIMEOUT_MS = 9000;
const MIN_RECOVERY_GAP_MS = 7000;
const QUALITY_PROFILE_ORDER = ["balanced", "reduced", "emergency"];
const MOBILE_VIDEO_CONSTRAINTS = {
  width: { ideal: 640, max: 640 },
  height: { ideal: 360, max: 360 },
  frameRate: { ideal: 24, max: 24 }
};
const VIDEO_QUALITY_PROFILES = {
  balanced: {
    width: { ideal: 640, max: 640 },
    height: { ideal: 360, max: 360 },
    frameRate: { ideal: 24, max: 24 },
    maxBitrate: 480_000
  },
  reduced: {
    width: { ideal: 480, max: 480 },
    height: { ideal: 270, max: 270 },
    frameRate: { ideal: 18, max: 18 },
    maxBitrate: 280_000
  },
  emergency: {
    width: { ideal: 320, max: 320 },
    height: { ideal: 180, max: 180 },
    frameRate: { ideal: 12, max: 12 },
    maxBitrate: 180_000
  }
};

function normalizeIceServers(servers = []) {
  const seen = new Set();
  const normalized = (Array.isArray(servers) ? servers : [])
    .map((entry) => {
      if (!entry) return null;
      if (typeof entry === "string") return { urls: [entry] };
      const urls = Array.isArray(entry.urls) ? entry.urls.filter(Boolean) : [entry.urls].filter(Boolean);
      if (!urls.length) return null;
      return {
        urls,
        username: entry.username,
        credential: entry.credential
      };
    })
    .filter(Boolean)
    .filter((entry) => {
      const key = `${entry.urls.join(",")}|${entry.username || ""}|${entry.credential || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return normalized.length ? normalized : [{ urls: ["stun:stun.l.google.com:19302"] }];
}

function emptyDiagnostics() {
  return {
    connectionState: "new",
    iceConnectionState: "new",
    signalingState: "stable",
    localCandidateType: "-",
    remoteCandidateType: "-",
    selectedCandidatePair: "-",
    roundTripTimeMs: null,
    packetLoss: null,
    jitterMs: null,
    audioBitrateKbps: null,
    videoBitrateKbps: null,
    audioPacketsReceived: null,
    videoFramesDecoded: null,
    audioRoute: "unknown",
    networkType: "unknown",
    relayActive: false,
    lowBandwidthMode: false,
    videoProfile: "balanced",
    recoveries: 0,
    freezeEvents: 0,
    updatedAt: null
  };
}

function createIncomingCallState() {
  return {
    pending: false,
    hasVideo: false,
    callSessionId: "",
    visitorId: "",
    sessionId: ""
  };
}

function createEmptyStream() {
  if (typeof MediaStream !== "undefined") {
    return new MediaStream();
  }
  return {
    getTracks() {
      return [];
    },
    getAudioTracks() {
      return [];
    },
    getVideoTracks() {
      return [];
    },
    addTrack() {},
    removeTrack() {}
  };
}

function getParticipantContext() {
  const user = getStoredUser();
  const role = String(user?.role || "").toLowerCase();
  if (role === "homeowner") {
    return {
      user,
      participantType: "homeowner",
      canStartCall: true,
      displayName: user?.fullName || "Homeowner",
      polite: false
    };
  }
  if (role === "security") {
    return {
      user,
      participantType: "security",
      canStartCall: true,
      displayName: user?.fullName || "Security",
      polite: false
    };
  }
  return {
    user,
    participantType: "visitor",
    canStartCall: false,
    displayName: user?.fullName || "Visitor",
    polite: true
  };
}

function isMineBySenderType(senderType, participantType) {
  return String(senderType || "").toLowerCase() === participantType;
}

function normalizeMessage(payload, participantType) {
  return {
    id: payload?.id || `${payload?.at || Date.now()}-${Math.random()}`,
    text: String(payload?.text || ""),
    displayName: payload?.displayName || "Participant",
    senderType: payload?.senderType || "visitor",
    at: payload?.at || new Date().toISOString(),
    persisted: payload?.persisted !== false,
    failed: Boolean(payload?.failed),
    mine: isMineBySenderType(payload?.senderType, participantType)
  };
}

function mergeMessages(existing, next) {
  const map = new Map();
  for (const item of existing) {
    map.set(item.id, item);
  }
  for (const item of next) {
    const previous = map.get(item.id);
    map.set(item.id, previous ? { ...previous, ...item } : item);
  }
  return Array.from(map.values()).sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

function readJsonStorage(key) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearJsonStorage(key) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function persistLowBandwidthMode(enabled) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOW_BANDWIDTH_STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    // ignore
  }
}

function getInitialLowBandwidthMode() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(LOW_BANDWIDTH_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function getVideoConstraints({ enabled, facingMode }) {
  if (!enabled) return false;
  return {
    ...MOBILE_VIDEO_CONSTRAINTS,
    facingMode
  };
}

function getVideoConstraintsForProfile({ enabled, facingMode, profile = "balanced" }) {
  if (!enabled) return false;
  return {
    ...(VIDEO_QUALITY_PROFILES[profile] || MOBILE_VIDEO_CONSTRAINTS),
    facingMode
  };
}

function classifyAudioRouteFromDevices(devices = []) {
  const names = devices
    .map((device) => String(device?.label || "").toLowerCase())
    .filter(Boolean);
  if (names.some((name) => name.includes("bluetooth") || name.includes("airpods") || name.includes("buds"))) {
    return "bluetooth";
  }
  if (names.some((name) => name.includes("headset") || name.includes("headphone") || name.includes("earpiece") || name.includes("wired"))) {
    return "headset";
  }
  if (names.some((name) => name.includes("speaker"))) {
    return "speaker";
  }
  return "default";
}

function summarizeConnectionType(status) {
  const raw = String(status?.connectionType || status?.effectiveType || "").trim().toLowerCase();
  return raw || (status?.connected ? "online" : "offline");
}

function getCandidateType(candidate) {
  const text = String(candidate?.candidate || candidate || "");
  if (!text) return "-";
  if (text.includes(" typ relay")) return "relay";
  if (text.includes(" typ srflx")) return "srflx";
  if (text.includes(" typ host")) return "host";
  if (text.includes(" typ prflx")) return "prflx";
  return "-";
}

async function safePlayMedia(element) {
  if (!element?.play) return;
  try {
    await element.play();
  } catch {
    // Mobile autoplay can be blocked until user interaction.
  }
}

function buildSessionRtcConfig(rtcConfig, forceRelay = false) {
  const config = rtcConfig && typeof rtcConfig === "object" ? rtcConfig : {};
  return {
    iceServers: normalizeIceServers(config.iceServers || env.webRtcIceServers),
    iceTransportPolicy: forceRelay ? "relay" : (config.iceTransportPolicy || "all"),
    bundlePolicy: "balanced",
    rtcpMuxPolicy: "require",
    iceCandidatePoolSize: 2
  };
}

export function useSessionRealtime(sessionId) {
  const context = useMemo(() => getParticipantContext(), []);
  const { participantType, canStartCall, displayName, polite } = context;
  const supportsWebRTC = typeof window !== "undefined" && typeof window.RTCPeerConnection !== "undefined";
  const supportsUserMedia =
    typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function";
  const isSecureOrigin = typeof window === "undefined" ? true : window.isSecureContext;

  const [connected, setConnected] = useState(false);
  const [joined, setJoined] = useState(false);
  const [callState, setCallState] = useState("idle");
  const [muted, setMuted] = useState(false);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraFacing, setCameraFacing] = useState("user");
  const [speakerOn, setSpeakerOn] = useState(true);
  const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState(false);
  const [localMicEnabled, setLocalMicEnabled] = useState(true);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("");
  const [typingState, setTypingState] = useState({ isTyping: false, senderType: "", displayName: "", at: "" });
  const [messageDelivery, setMessageDelivery] = useState({});
  const [mediaPermission, setMediaPermission] = useState({
    state: "idle",
    error: "",
    lastRequestedAt: null,
    lastGrantedAt: null,
  });
  const [networkQuality, setNetworkQuality] = useState("reconnecting");
  const [networkDetail, setNetworkDetail] = useState("Connecting...");
  const [callLaunchStage, setCallLaunchStage] = useState("idle");
  const [callLaunchStartedAt, setCallLaunchStartedAt] = useState(null);
  const [callConnectedAt, setCallConnectedAt] = useState(null);
  const [incomingCall, setIncomingCall] = useState(createIncomingCallState);
  const [acceptedCallMode, setAcceptedCallMode] = useState("");
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);
  const [callLogs, setCallLogs] = useState([]);
  const [callDiagnostics, setCallDiagnostics] = useState(() => emptyDiagnostics());
  const [lowBandwidthMode, setLowBandwidthMode] = useState(getInitialLowBandwidthMode);
  const [audioRoute, setAudioRoute] = useState("unknown");
  const [networkType, setNetworkType] = useState("unknown");
  const [videoQualityProfile, setVideoQualityProfile] = useState("balanced");
  const [debugOverlayOpen, setDebugOverlayOpen] = useState(false);

  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(createEmptyStream());
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const pendingRemoteCandidatesRef = useRef([]);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const localVideoEnabledRef = useRef(false);
  const statsTimerRef = useRef(null);
  const mediaWatchdogTimerRef = useRef(null);
  const connectWatchdogRef = useRef(null);
  const offerTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const lastOutgoingOfferRef = useRef(null);
  const pendingOfferPayloadRef = useRef(null);
  const callSessionRef = useRef("");
  const callVisitorIdRef = useRef("");
  const currentRtcConfigRef = useRef(buildSessionRtcConfig());
  const callModeRef = useRef(CALL_MEDIA_MODE.AUDIO);
  const shouldForceRelayRef = useRef(false);
  const callStateRef = useRef("idle");
  const incomingCallRef = useRef(createIncomingCallState());
  const lowBandwidthModeRef = useRef(lowBandwidthMode);
  const networkQualityRef = useRef(networkQuality);
  const audioRouteRef = useRef(audioRoute);
  const networkTypeRef = useRef(networkType);
  const videoQualityProfileRef = useRef(videoQualityProfile);
  const recoveryInFlightRef = useRef(false);
  const lastRecoveryAtRef = useRef(0);
  const freezeEventsRef = useRef(0);
  const pendingStartIntentRef = useRef(null);
  const pendingAcceptIntentRef = useRef(null);
  const beginCallRef = useRef(null);
  const acceptIncomingCallRef = useRef(null);
  const emitWithAckRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const statsSnapshotRef = useRef({
    at: 0,
    audioBytesReceived: 0,
    videoBytesReceived: 0,
    videoFramesDecoded: 0,
    audioPacketsReceived: 0,
  });

  const featureError = useMemo(() => {
    if (!supportsWebRTC) return "This browser does not support WebRTC calls.";
    if (!isSecureOrigin) {
      return "Camera and microphone require HTTPS on network devices. Open the app with HTTPS or localhost.";
    }
    if (!supportsUserMedia) return "Camera/microphone APIs are unavailable in this browser.";
    return "";
  }, [isSecureOrigin, supportsUserMedia, supportsWebRTC]);

  function pushLog(message, extra = {}) {
    const entry = {
      id: `${Date.now()}-${Math.random()}`,
      message,
      at: new Date().toISOString(),
      extra
    };
    setCallLogs((prev) => [...prev.slice(-59), entry]);
    reportRtcEvent({
      level: message.toLowerCase().includes("failed") ? "warn" : "info",
      message,
      sessionId,
      callSessionId: callSessionRef.current,
      participantType,
      extra
    });
    if (typeof console !== "undefined") {
      console.log("[Qring RTC]", message, {
        sessionId,
        participantType,
        callSessionId: callSessionRef.current || null,
        ...extra
      });
    }
  }

  function updateNetwork(nextQuality, detail) {
    setNetworkQuality(nextQuality);
    setNetworkDetail(detail);
  }

  function setCallStateSafe(nextState) {
    callStateRef.current = nextState;
    setCallState(nextState);
  }

  function clearConnectTimers() {
    if (connectWatchdogRef.current) {
      window.clearTimeout(connectWatchdogRef.current);
      connectWatchdogRef.current = null;
    }
    if (offerTimeoutRef.current) {
      window.clearTimeout(offerTimeoutRef.current);
      offerTimeoutRef.current = null;
    }
  }

  function stopStatsPolling() {
    if (statsTimerRef.current) {
      window.clearInterval(statsTimerRef.current);
      statsTimerRef.current = null;
    }
  }

  function stopMediaWatchdog() {
    if (mediaWatchdogTimerRef.current) {
      window.clearInterval(mediaWatchdogTimerRef.current);
      mediaWatchdogTimerRef.current = null;
    }
  }

  function updateRemoteMediaBindings() {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStreamRef.current.getAudioTracks().length ? remoteStreamRef.current : null;
      remoteAudioRef.current.muted = !speakerOn;
      void safePlayMedia(remoteAudioRef.current).then(() => setAudioPlaybackBlocked(false)).catch(() => {
        setAudioPlaybackBlocked(true);
      });
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current.getVideoTracks().length ? remoteStreamRef.current : null;
      remoteVideoRef.current.muted = true;
      void safePlayMedia(remoteVideoRef.current);
    }
  }

  function resetRemoteStream() {
    const oldStream = remoteStreamRef.current;
    oldStream.getTracks().forEach((track) => oldStream.removeTrack(track));
    setRemoteMuted(false);
    setRemoteVideoActive(false);
    updateRemoteMediaBindings();
  }

  function clearPeerConnection() {
    stopStatsPolling();
    stopMediaWatchdog();
    clearConnectTimers();
    pendingRemoteCandidatesRef.current = [];
    pendingOfferPayloadRef.current = null;
    lastOutgoingOfferRef.current = null;
    const pc = peerRef.current;
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.oniceconnectionstatechange = null;
      pc.onnegotiationneeded = null;
      pc.onicegatheringstatechange = null;
      try {
        pc.getSenders().forEach((sender) => {
          try {
            if (sender.track) sender.track.stop();
          } catch {
            // ignore
          }
        });
        pc.close();
      } catch {
        // ignore
      }
      peerRef.current = null;
    }
  }

  function stopLocalStream() {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    setCameraOn(false);
    setMuted(false);
    setLocalMicEnabled(false);
  }

  function cleanupMedia({ preserveCallSession = false } = {}) {
    clearPeerConnection();
    stopLocalStream();
    resetRemoteStream();
    if (!preserveCallSession) {
      callSessionRef.current = "";
      callVisitorIdRef.current = "";
    }
    currentRtcConfigRef.current = buildSessionRtcConfig();
    setCallConnectedAt(null);
    setCallLaunchStage("idle");
    setCallLaunchStartedAt(null);
    statsSnapshotRef.current = {
      at: 0,
      audioBytesReceived: 0,
      videoBytesReceived: 0,
      videoFramesDecoded: 0,
      audioPacketsReceived: 0,
    };
    freezeEventsRef.current = 0;
    setCallDiagnostics((prev) => ({
      ...emptyDiagnostics(),
      audioRoute: prev.audioRoute || audioRouteRef.current || "unknown",
      networkType: prev.networkType || networkTypeRef.current || "unknown",
      lowBandwidthMode: lowBandwidthModeRef.current,
      videoProfile: videoQualityProfileRef.current
    }));
  }

  async function loadMessages() {
    try {
      let rows = [];
      if (participantType === "homeowner") {
        rows = await getHomeownerSessionMessages(sessionId);
      } else if (participantType === "security") {
        rows = await getSecuritySessionMessages(sessionId);
      } else {
        rows = await getVisitorSessionMessages(sessionId);
      }
      setMessages(rows.map((item) => normalizeMessage(item, participantType)));
    } catch (error) {
      setStatus(error?.message || "Failed to load session messages");
    }
  }

  async function persistMessageFallback(messageId, text) {
    if (participantType === "homeowner") {
      return sendHomeownerSessionMessage(sessionId, text);
    }
    if (participantType === "security") {
      return sendSecuritySessionMessage(sessionId, text);
    }
    return sendVisitorSessionMessage(sessionId, text, messageId);
  }

  function upsertMessage(message) {
    setMessages((prev) => mergeMessages(prev, [normalizeMessage(message, participantType)]));
  }

  async function refreshAudioRoute(reason = "refresh") {
    if (typeof navigator === "undefined" || typeof navigator.mediaDevices?.enumerateDevices !== "function") return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const route = speakerOn ? classifyAudioRouteFromDevices(devices) : "earpiece";
      audioRouteRef.current = route;
      setAudioRoute(route);
      setCallDiagnostics((prev) => ({ ...prev, audioRoute: route }));
      pushLog("Audio route updated", { route, reason });
    } catch {
      // ignore device enumeration issues
    }
  }

  function refreshBrowserNetworkType() {
    const connection = navigator?.connection || navigator?.mozConnection || navigator?.webkitConnection;
    const type = summarizeConnectionType(connection);
    networkTypeRef.current = type;
    setNetworkType(type);
    setCallDiagnostics((prev) => ({ ...prev, networkType: type }));
  }

  function createPeerConnection({ forceRelay = false } = {}) {
    if (peerRef.current) return peerRef.current;
    const pc = new RTCPeerConnection(buildSessionRtcConfig(currentRtcConfigRef.current, forceRelay));
    peerRef.current = pc;

    remoteStreamRef.current = createEmptyStream();
    updateRemoteMediaBindings();

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      const targetStream = stream || remoteStreamRef.current;
      if (!stream && event.track) {
        remoteStreamRef.current.addTrack(event.track);
      } else if (stream && remoteStreamRef.current !== stream) {
        remoteStreamRef.current = stream;
      }
      setRemoteMuted(!targetStream.getAudioTracks().some((track) => track.enabled));
      setRemoteVideoActive(targetStream.getVideoTracks().length > 0);
      updateRemoteMediaBindings();
      if (!callConnectedAt) {
        setCallConnectedAt(Date.now());
      }
      setCallStateSafe("connected");
      updateNetwork("good", "Media connected");
      reconnectAttemptsRef.current = 0;
      pushLog("Remote media received");
    };

    pc.onicecandidate = (event) => {
      if (!event.candidate || !socketRef.current || !sessionId) return;
      pushLog("ICE candidate generated", {
        candidateType: getCandidateType(event.candidate?.candidate || "")
      });
      socketRef.current.emit(RealtimeEvent.WEBRTC_ICE, {
        sessionId,
        callSessionId: callSessionRef.current || undefined,
        candidate: event.candidate
      });
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      setCallDiagnostics((prev) => ({ ...prev, connectionState: state, updatedAt: new Date().toISOString() }));
      if (state === "connected") {
        clearConnectTimers();
        setCallStateSafe("connected");
        setCallConnectedAt((current) => current || Date.now());
        updateNetwork("good", shouldForceRelayRef.current ? "Connected through TURN relay" : "Direct media connected");
      } else if (state === "connecting") {
        setCallStateSafe("connecting");
        updateNetwork("reconnecting", "Negotiating media path...");
      } else if (state === "disconnected") {
        updateNetwork("slow", "Connection dropped. Recovering...");
        void restartIce("connection_disconnected");
      } else if (state === "failed") {
        updateNetwork("slow", "Connection failed. Retrying...");
        void recoverCall("peer_failed");
      } else if (state === "closed" && callStateRef.current !== "ended") {
        setCallStateSafe("ended");
      }
    };

    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      setCallDiagnostics((prev) => ({ ...prev, iceConnectionState: iceState, updatedAt: new Date().toISOString() }));
      if (iceState === "failed") {
        void recoverCall("ice_failed");
      } else if (iceState === "disconnected") {
        updateNetwork("slow", "ICE disconnected. Retrying...");
      } else if (iceState === "connected" || iceState === "completed") {
        updateNetwork("good", shouldForceRelayRef.current ? "TURN relay active" : "Realtime path healthy");
      }
    };

    startStatsPolling(pc);
    startMediaWatchdog(pc);
    return pc;
  }

  async function ensureLocalStream({ video, facingMode = cameraFacing, reuse = true, qualityProfile = videoQualityProfileRef.current } = {}) {
    if (featureError) {
      throw new Error(featureError);
    }

    const wantsVideo = Boolean(video);
    const existing = localStreamRef.current;
    const existingHasVideo = existing?.getVideoTracks().length > 0;
    if (reuse && existing && existingHasVideo === wantsVideo) {
      return existing;
    }

    if (existing) {
      existing.getTracks().forEach((track) => track.stop());
    }

    setMediaPermission((prev) => ({
      ...prev,
      state: "requesting",
      error: "",
      lastRequestedAt: Date.now(),
    }));
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: getVideoConstraintsForProfile({ enabled: wantsVideo, facingMode, profile: qualityProfile })
    });

    localStreamRef.current = stream;
    localVideoEnabledRef.current = wantsVideo;
    videoQualityProfileRef.current = qualityProfile;
    setVideoQualityProfile(qualityProfile);
    setCameraOn(wantsVideo);
    setMuted(false);
    setLocalMicEnabled(true);
    setMediaPermission({
      state: "granted",
      error: "",
      lastRequestedAt: Date.now(),
      lastGrantedAt: Date.now(),
    });
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = wantsVideo ? stream : null;
      localVideoRef.current.muted = true;
      void safePlayMedia(localVideoRef.current);
    }
    void refreshAudioRoute("local_stream_ready");

    const pc = createPeerConnection({ forceRelay: shouldForceRelayRef.current });
    pc.getSenders().forEach((sender) => {
      if (!sender.track) return;
      try {
        pc.removeTrack(sender);
      } catch {
        // ignore
      }
    });
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    await optimizeSenders(pc);
    return stream;
  }

  async function requestMediaPermissions({ video = false } = {}) {
    try {
      await ensureLocalStream({ video, reuse: false });
      return true;
    } catch (error) {
      const message = String(error?.message || "");
      const unavailable =
        message.toLowerCase().includes("notfound") ||
        message.toLowerCase().includes("device") ||
        message.toLowerCase().includes("available");
      setMediaPermission((prev) => ({
        ...prev,
        state: unavailable ? "unavailable" : "denied",
        error: message || "Camera or microphone permission was denied.",
      }));
      throw error;
    }
  }

  async function optimizeSenders(pc = peerRef.current) {
    if (!pc) return;
    const isLowBandwidth = lowBandwidthModeRef.current || shouldForceRelayRef.current || networkQualityRef.current === "slow";
    const profile = VIDEO_QUALITY_PROFILES[videoQualityProfileRef.current] || VIDEO_QUALITY_PROFILES.balanced;
    const maxBitrate = isLowBandwidth ? Math.min(profile.maxBitrate, 220_000) : profile.maxBitrate;
    const maxFramerate = isLowBandwidth ? Math.min(profile.frameRate?.max || 15, 15) : (profile.frameRate?.max || 24);

    for (const sender of pc.getSenders()) {
      if (!sender.track || typeof sender.getParameters !== "function" || typeof sender.setParameters !== "function") {
        continue;
      }
      try {
        const params = sender.getParameters();
        params.encodings = params.encodings?.length ? params.encodings : [{}];
        if (sender.track.kind === "video") {
          params.encodings[0].maxBitrate = maxBitrate;
          params.encodings[0].maxFramerate = maxFramerate;
          params.encodings[0].networkPriority = "high";
          params.degradationPreference = "maintain-framerate";
        } else if (sender.track.kind === "audio") {
          params.encodings[0].networkPriority = "high";
        }
        await sender.setParameters(params);
      } catch {
        // Browser implementations vary here.
      }
    }
  }

  async function setVideoQualityProfileSafe(nextProfile, reason = "manual") {
    if (!localVideoEnabledRef.current) return;
    const normalizedProfile = VIDEO_QUALITY_PROFILES[nextProfile] ? nextProfile : "balanced";
    if (videoQualityProfileRef.current === normalizedProfile) return;
    videoQualityProfileRef.current = normalizedProfile;
    setVideoQualityProfile(normalizedProfile);
    pushLog("Video profile changed", { profile: normalizedProfile, reason });
    try {
      await ensureLocalStream({
        video: true,
        facingMode: cameraFacing,
        reuse: false,
        qualityProfile: normalizedProfile
      });
      await sendOffer();
    } catch (error) {
      setStatus(error?.message || "Unable to apply network video downgrade");
    }
  }

  async function startStatsPolling(pc) {
    stopStatsPolling();
    if (!pc?.getStats) return;
    statsTimerRef.current = window.setInterval(async () => {
      try {
        const stats = await pc.getStats();
        let selectedPair = null;
        let localCandidateType = "-";
        let remoteCandidateType = "-";
        let selectedPairLabel = "-";
        let rttMs = null;
        let jitterMs = null;
        let packetLoss = null;
        let audioBytesReceived = 0;
        let videoBytesReceived = 0;
        let videoFramesDecoded = 0;
        let audioPacketsReceived = 0;

        stats.forEach((report) => {
          if (report.type === "candidate-pair" && report.nominated && report.state === "succeeded") {
            selectedPair = report;
          }
        });

        if (selectedPair) {
          stats.forEach((report) => {
            if (report.id === selectedPair.localCandidateId) {
              localCandidateType = report.candidateType || localCandidateType;
            }
            if (report.id === selectedPair.remoteCandidateId) {
              remoteCandidateType = report.candidateType || remoteCandidateType;
            }
            if (report.type === "remote-inbound-rtp" && report.kind === "audio" && report.roundTripTime != null) {
              rttMs = Math.round(report.roundTripTime * 1000);
              jitterMs = report.jitter != null ? Math.round(report.jitter * 1000) : jitterMs;
              if (report.packetsLost != null && report.packetsReceived != null) {
                const total = report.packetsLost + report.packetsReceived;
                packetLoss = total > 0 ? Math.round((report.packetsLost / total) * 100) : 0;
              }
            }
            if (report.type === "inbound-rtp" && report.kind === "audio") {
              audioBytesReceived = Number(report.bytesReceived || 0);
              audioPacketsReceived = Number(report.packetsReceived || 0);
            }
            if (report.type === "inbound-rtp" && report.kind === "video") {
              videoBytesReceived = Number(report.bytesReceived || 0);
              videoFramesDecoded = Number(report.framesDecoded || 0);
            }
          });
          selectedPairLabel = `${localCandidateType}->${remoteCandidateType}`;
        }

        const previousSnapshot = statsSnapshotRef.current;
        const elapsedSeconds = previousSnapshot.at ? Math.max(1, (Date.now() - previousSnapshot.at) / 1000) : 1;
        const audioBitrateKbps = previousSnapshot.at
          ? Math.max(0, Math.round(((audioBytesReceived - previousSnapshot.audioBytesReceived) * 8) / elapsedSeconds / 1000))
          : null;
        const videoBitrateKbps = previousSnapshot.at
          ? Math.max(0, Math.round(((videoBytesReceived - previousSnapshot.videoBytesReceived) * 8) / elapsedSeconds / 1000))
          : null;

        const audioFlowing = audioPacketsReceived > previousSnapshot.audioPacketsReceived || audioBytesReceived > previousSnapshot.audioBytesReceived;
        const videoFlowing = videoFramesDecoded > previousSnapshot.videoFramesDecoded || videoBytesReceived > previousSnapshot.videoBytesReceived;
        statsSnapshotRef.current = {
          at: audioFlowing || videoFlowing ? Date.now() : previousSnapshot.at || Date.now(),
          audioBytesReceived,
          videoBytesReceived,
          videoFramesDecoded,
          audioPacketsReceived
        };

        const hasFrozenMedia = previousSnapshot.at && !audioFlowing && !videoFlowing;
        if (hasFrozenMedia) {
          freezeEventsRef.current += 1;
        }

        const nextDiagnostics = {
          connectionState: pc.connectionState,
          iceConnectionState: pc.iceConnectionState,
          signalingState: pc.signalingState,
          localCandidateType,
          remoteCandidateType,
          selectedCandidatePair: selectedPairLabel,
          roundTripTimeMs: rttMs,
          packetLoss,
          jitterMs,
          audioBitrateKbps,
          videoBitrateKbps,
          audioPacketsReceived,
          videoFramesDecoded,
          audioRoute: audioRouteRef.current,
          networkType: networkTypeRef.current,
          relayActive: remoteCandidateType === "relay" || localCandidateType === "relay",
          lowBandwidthMode: lowBandwidthModeRef.current,
          videoProfile: videoQualityProfileRef.current,
          recoveries: reconnectAttemptsRef.current,
          freezeEvents: freezeEventsRef.current,
          updatedAt: new Date().toISOString()
        };
        setCallDiagnostics(nextDiagnostics);

        const unstable =
          pc.connectionState === "disconnected" ||
          pc.iceConnectionState === "disconnected" ||
          (rttMs != null && rttMs > 900) ||
          (jitterMs != null && jitterMs > 60) ||
          (packetLoss != null && packetLoss >= 8);

        if (unstable) {
          updateNetwork("slow", remoteCandidateType === "relay" ? "Weak network. TURN relay keeping call alive." : "Weak network detected. Optimizing call.");
          if (!lowBandwidthModeRef.current) {
            setLowBandwidthMode(true);
          }
          if (videoQualityProfileRef.current === "balanced") {
            void setVideoQualityProfileSafe("reduced", "weak_network");
          } else if (packetLoss != null && packetLoss >= 12 && videoQualityProfileRef.current === "reduced") {
            void setVideoQualityProfileSafe("emergency", "critical_packet_loss");
          }
          await optimizeSenders(pc);
        } else if (pc.connectionState === "connected") {
          updateNetwork("good", remoteCandidateType === "relay" ? "TURN relay active" : "Direct peer path active");
          if (videoQualityProfileRef.current !== "balanced" && !lowBandwidthModeRef.current && (rttMs == null || rttMs < 350) && (packetLoss == null || packetLoss < 4)) {
            void setVideoQualityProfileSafe("balanced", "network_recovered");
          }
        }
      } catch {
        // Ignore stats failures.
      }
    }, STATS_POLL_MS);
  }

  function startMediaWatchdog(pc) {
    stopMediaWatchdog();
    mediaWatchdogTimerRef.current = window.setInterval(() => {
      if (!pc || peerRef.current !== pc) return;
      if (callStateRef.current !== "connected" && callStateRef.current !== "connecting") return;
      const now = Date.now();
      const snapshot = statsSnapshotRef.current;
      const hasRemoteAudio = remoteStreamRef.current.getAudioTracks().length > 0;
      const hasRemoteVideo = remoteStreamRef.current.getVideoTracks().length > 0;
      const stalledAudio =
        hasRemoteAudio &&
        snapshot.audioPacketsReceived > 0 &&
        now - snapshot.at > MEDIA_STALL_TIMEOUT_MS;
      const stalledVideo =
        hasRemoteVideo &&
        snapshot.videoFramesDecoded > 0 &&
        now - snapshot.at > VIDEO_FREEZE_TIMEOUT_MS;
      if (stalledAudio || stalledVideo) {
        pushLog("Media watchdog detected stalled stream", {
          stalledAudio,
          stalledVideo,
          elapsedMs: now - snapshot.at
        });
        void recoverCall(stalledVideo ? "video_stall_watchdog" : "audio_stall_watchdog");
      }
    }, MEDIA_WATCHDOG_MS);
  }

  async function drainPendingCandidates() {
    const pc = peerRef.current;
    if (!pc || !pc.remoteDescription) return;
    while (pendingRemoteCandidatesRef.current.length) {
      const candidate = pendingRemoteCandidatesRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // ignore invalid candidates during network churn
      }
    }
  }

  async function fetchCallSessionConfig(roleOverride = participantType) {
    if (!callSessionRef.current) return null;
    const payload = {
      callSessionId: callSessionRef.current,
      participantType: roleOverride
    };
    if (roleOverride === "visitor") {
      payload.visitorId = callVisitorIdRef.current || incomingCallRef.current.visitorId || sessionId;
      payload.visitorToken = getVisitorSessionToken(sessionId) || undefined;
    }
      const response = await apiRequest("/calls/join", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    const data = response?.data ?? null;
    if (data?.rtcConfig) {
      currentRtcConfigRef.current = data.rtcConfig;
    }
    return data;
  }

  async function emitWithAck(eventName, payload, label = eventName, timeoutMs = 5000) {
    if (typeof emitWithAckRef.current !== "function") {
      throw new Error(`${label} socket unavailable`);
    }
    return emitWithAckRef.current(eventName, payload, label, timeoutMs);
  }

  async function sendOffer({ iceRestart = false } = {}) {
    const pc = createPeerConnection({ forceRelay: shouldForceRelayRef.current });
    if (pc.signalingState === "have-local-offer") {
      return;
    }
    makingOfferRef.current = true;
    try {
      const offer = await pc.createOffer({
        iceRestart
      });
      await pc.setLocalDescription(offer);
      lastOutgoingOfferRef.current = pc.localDescription;
      socketRef.current?.emit(RealtimeEvent.WEBRTC_OFFER, {
        sessionId,
        callSessionId: callSessionRef.current || undefined,
        hasVideo: localVideoEnabledRef.current,
        sdp: pc.localDescription
      });
      setCallStateSafe(callStateRef.current === "connected" ? "connecting" : "ringing");
      offerTimeoutRef.current = window.setTimeout(() => {
        if (callStateRef.current === "connected") return;
        void recoverCall("offer_timeout");
      }, OFFER_ACK_TIMEOUT_MS);
      pushLog("Offer sent", { iceRestart, forceRelay: shouldForceRelayRef.current });
    } finally {
      makingOfferRef.current = false;
    }
  }

  async function restartIce(reason = "manual") {
    if (!peerRef.current || !localStreamRef.current || !callSessionRef.current) return;
    pushLog("Restarting ICE", { reason });
    updateNetwork("reconnecting", "Refreshing network path...");
    try {
      await sendOffer({ iceRestart: true });
    } catch {
      await recoverCall(`ice_restart_failed:${reason}`);
    }
  }

  async function recoverCall(reason = "recovery") {
    if (recoveryInFlightRef.current) return;
    const now = Date.now();
    if (now - lastRecoveryAtRef.current < MIN_RECOVERY_GAP_MS) return;
    recoveryInFlightRef.current = true;
    lastRecoveryAtRef.current = now;

    try {
      if (!callSessionRef.current || reconnectAttemptsRef.current >= CALL_RETRY_LIMIT) {
        const fallback = getNextFallbackAction({
          currentMode: callModeRef.current,
          forceRelay: shouldForceRelayRef.current
        });
        if (fallback.kind === "retry") {
          shouldForceRelayRef.current = Boolean(fallback.forceRelay);
          setStatus(fallback.detail);
          updateNetwork("slow", fallback.detail);
          reconnectAttemptsRef.current = 0;
          if (callStateRef.current !== "ended") {
            await retryCallConnection();
          }
          return;
        }
        setStatus(fallback.detail);
        setCallStateSafe("ended");
        cleanupMedia({ preserveCallSession: false });
        return;
      }

      reconnectAttemptsRef.current += 1;
      shouldForceRelayRef.current = shouldForceRelayRef.current || reconnectAttemptsRef.current > 1;
      updateNetwork("reconnecting", `Recovering call (${reconnectAttemptsRef.current}/${CALL_RETRY_LIMIT})...`);
      pushLog("Recovering call", { reason, attempt: reconnectAttemptsRef.current, forceRelay: shouldForceRelayRef.current });

      try {
        await fetchCallSessionConfig();
        await ensureLocalStream({
          video: callModeRef.current === CALL_MEDIA_MODE.VIDEO,
          reuse: false,
          qualityProfile: videoQualityProfileRef.current
        });
        await sendOffer({ iceRestart: true });
      } catch (error) {
        setStatus(error?.message || "Unable to recover call");
      }
    } finally {
      recoveryInFlightRef.current = false;
    }
  }

  async function beginCall({ video, restart = false } = {}) {
    if (featureError) {
      setStatus(featureError);
      return;
    }
    if (!joined) {
      setStatus("Joining the signaling room...");
      return;
    }

    const nextMode = video ? CALL_MEDIA_MODE.VIDEO : CALL_MEDIA_MODE.AUDIO;
    callModeRef.current = nextMode;
    setAcceptedCallMode(nextMode);
    setCallLaunchStage("starting");
    setCallLaunchStartedAt(Date.now());
    setCallStateSafe("connecting");
    shouldForceRelayRef.current = Boolean(lowBandwidthModeRef.current);
    reconnectAttemptsRef.current = 0;

    try {
      if (!restart || !callSessionRef.current) {
        const response = await apiRequest("/calls/start", {
          method: "POST",
          body: JSON.stringify({
            sessionId,
            type: nextMode,
            hasVideo: video
          })
        });
        const data = response?.data ?? null;
        callSessionRef.current = data?.callSessionId || callSessionRef.current;
        callVisitorIdRef.current = data?.visitorId || callVisitorIdRef.current || sessionId;
        currentRtcConfigRef.current = data?.rtcConfig || currentRtcConfigRef.current;
      } else {
        await fetchCallSessionConfig();
      }

      await ensureLocalStream({ video });
      await sendOffer();
      setStatus(video ? "Starting video call..." : "Starting audio call...");
      connectWatchdogRef.current = window.setTimeout(() => {
        if (callStateRef.current !== "connected") {
          void recoverCall("connect_watchdog");
        }
      }, getConnectWatchdogMs({
        lowBandwidth: lowBandwidthModeRef.current,
        forceRelay: shouldForceRelayRef.current
      }));
    } catch (error) {
      setStatus(error?.message || "Unable to start call");
      setCallStateSafe("idle");
      cleanupMedia({ preserveCallSession: false });
    }
  }

  async function startAudioCall() {
    await beginCall({ video: false });
  }

  async function startVideoCall() {
    await beginCall({ video: true });
  }

  function queueStartIntent(intent) {
    if (!intent || intent.sessionId !== sessionId || !canStartCall) return false;
    pendingStartIntentRef.current = intent;
    return true;
  }

  function queueAcceptIntent(intent) {
    if (!intent || intent.sessionId !== sessionId || !intent.callSessionId) return false;
    pendingAcceptIntentRef.current = intent;
    return true;
  }

  async function acceptIncomingCall(snapshotOverride = null) {
    const snapshot = snapshotOverride && typeof snapshotOverride === "object" ? snapshotOverride : incomingCallRef.current;
    if (!snapshot?.callSessionId) {
      setStatus("Incoming call is no longer available.");
      return;
    }

    callSessionRef.current = snapshot.callSessionId;
    callVisitorIdRef.current = snapshot.visitorId || sessionId;
    callModeRef.current = snapshot.hasVideo ? CALL_MEDIA_MODE.VIDEO : CALL_MEDIA_MODE.AUDIO;
    setAcceptedCallMode(snapshot.hasVideo ? CALL_MEDIA_MODE.VIDEO : CALL_MEDIA_MODE.AUDIO);
    setIncomingCall(createIncomingCallState());
    grantSessionCallAccess(sessionId, "connected");

    try {
      await fetchCallSessionConfig();
      await emitWithAck(RealtimeEvent.CALL_ACCEPTED, {
        sessionId,
        callSessionId: snapshot.callSessionId,
        hasVideo: snapshot.hasVideo
      }, "call.accepted");
      pushLog("Call accepted", {
        hasVideo: snapshot.hasVideo
      });
      await ensureLocalStream({ video: snapshot.hasVideo });

      if (pendingOfferPayloadRef.current?.sdp) {
        const pc = createPeerConnection({ forceRelay: shouldForceRelayRef.current });
        await pc.setRemoteDescription(new RTCSessionDescription(pendingOfferPayloadRef.current.sdp));
        await drainPendingCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current?.emit(RealtimeEvent.WEBRTC_ANSWER, {
          sessionId,
          callSessionId: snapshot.callSessionId,
          sdp: pc.localDescription
        });
        pushLog("Answer sent from accepted call", {
          callSessionId: snapshot.callSessionId
        });
        pendingOfferPayloadRef.current = null;
      }

      setStatus(snapshot.hasVideo ? "Joining video call..." : "Joining audio call...");
      setCallStateSafe("connecting");
    } catch (error) {
      setStatus(error?.message || "Failed to accept incoming call");
      cleanupMedia({ preserveCallSession: false });
    }
  }

  async function rejectIncomingCall() {
    if (!incomingCallRef.current.pending) return;
    const activeCall = incomingCallRef.current;
    setIncomingCall(createIncomingCallState());
    clearSessionCallAccess(sessionId);
    if (activeCall.callSessionId) {
      socketRef.current?.emit(RealtimeEvent.CALL_REJECTED, {
        sessionId,
        callSessionId: activeCall.callSessionId,
        hasVideo: activeCall.hasVideo
      });
      pushLog("Call rejected", {
        callSessionId: activeCall.callSessionId
      });
    }
    try {
      if (activeCall.callSessionId) {
        await apiRequest("/calls/end", {
          method: "POST",
          body: JSON.stringify({
            callSessionId: activeCall.callSessionId,
            participantType,
            visitorId: participantType === "visitor" ? activeCall.visitorId || sessionId : undefined,
            visitorToken: participantType === "visitor" ? getVisitorSessionToken(sessionId) || undefined : undefined
          })
        });
      }
    } catch (error) {
      setStatus(error?.message || "Unable to reject call");
    }
  }

  async function retryCallConnection() {
    if (!callSessionRef.current && !canStartCall) return;
    if (callSessionRef.current) {
      await beginCall({
        video: callModeRef.current === CALL_MEDIA_MODE.VIDEO,
        restart: true
      });
      return;
    }
    if (canStartCall) {
      await beginCall({
        video: callModeRef.current === CALL_MEDIA_MODE.VIDEO
      });
    }
  }

  async function endCall(broadcast = true) {
    if (broadcast && callSessionRef.current) {
      try {
        await apiRequest("/calls/end", {
          method: "POST",
          body: JSON.stringify({
            callSessionId: callSessionRef.current,
            participantType,
            visitorId: participantType === "visitor" ? callVisitorIdRef.current || sessionId : undefined,
            visitorToken: participantType === "visitor" ? getVisitorSessionToken(sessionId) || undefined : undefined
          })
        });
      } catch (error) {
        setStatus(error?.message || "Unable to end call cleanly");
      }
    }
    setCallStateSafe("ended");
    clearSessionCallAccess(sessionId);
    cleanupMedia({ preserveCallSession: false });
  }

  function sendMessage(text) {
    const body = String(text || "").trim();
    if (!body || !socketRef.current || !joined) return false;
    const messageId = `${Date.now()}-${Math.random()}`;
    const optimistic = {
      id: messageId,
      text: body,
      displayName,
      senderType: participantType,
      at: new Date().toISOString(),
      persisted: false,
      failed: false
    };
    upsertMessage(optimistic);
    pushLog("Sending chat message", {
      clientId: messageId
    });
    void emitWithAck(RealtimeEvent.CHAT_MESSAGE, {
      sessionId,
      text: body,
      clientId: messageId,
      displayName,
      senderType: participantType,
      visitorToken: participantType === "visitor" ? getVisitorSessionToken(sessionId) || undefined : undefined
    }, "chat.message").catch((error) => {
      setMessageDelivery((prev) => ({ ...prev, [messageId]: "timeout" }));
      upsertMessage({ ...optimistic, failed: true, persisted: false });
      pushLog("Chat acknowledgement timed out", {
        clientId: messageId,
        error: error?.message || "chat_ack_timeout"
      });
    });
    return true;
  }

  function sendTypingState(isTyping) {
    if (!socketRef.current || !joined) return;
    pushLog("Sending typing state", {
      isTyping: Boolean(isTyping)
    });
    socketRef.current.emit(RealtimeEvent.CHAT_TYPING, {
      sessionId,
      senderType: participantType,
      displayName,
      isTyping: Boolean(isTyping),
      visitorToken: participantType === "visitor" ? getVisitorSessionToken(sessionId) || undefined : undefined
    });
  }

  async function retryFailedMessage(messageId) {
    const target = messages.find((item) => item.id === messageId);
    if (!target) return;
    try {
      const saved = await persistMessageFallback(messageId, target.text);
      if (saved) {
        upsertMessage({ ...saved, failed: false, persisted: true });
      }
    } catch (error) {
      setStatus(error?.message || "Unable to resend message");
    }
  }

  async function sendQuickResponse(action) {
    const map = {
      on_my_way: "I'm on my way.",
      leave_at_door: "Please leave it at the door.",
      unlock_door: "Door unlocking now."
    };
    return sendMessage(map[action] || action);
  }

  function toggleMute() {
    if (!localStreamRef.current) return;
    const nextMuted = !muted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
    setLocalMicEnabled(!nextMuted);
    socketRef.current?.emit(RealtimeEvent.SESSION_CONTROL, {
      sessionId,
      action: nextMuted ? "mute" : "unmute"
    });
  }

  function toggleSpeaker() {
    const nextValue = !speakerOn;
    setSpeakerOn(nextValue);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !nextValue;
    }
    audioRouteRef.current = nextValue ? "speaker" : "earpiece";
    setAudioRoute(audioRouteRef.current);
    void refreshAudioRoute("speaker_toggle");
  }

  async function switchCamera() {
    const nextFacing = cameraFacing === "user" ? "environment" : "user";
    setCameraFacing(nextFacing);
    if (!localVideoEnabledRef.current) return;
    try {
      await ensureLocalStream({
        video: true,
        facingMode: nextFacing,
        reuse: false
      });
      await sendOffer();
    } catch (error) {
      setStatus(error?.message || "Unable to switch camera");
    }
  }

  useEffect(() => {
    loadMessages();
  }, [sessionId]);

  useEffect(() => {
    refreshBrowserNetworkType();
    void refreshAudioRoute("mount");

    const handleDeviceChange = () => {
      void refreshAudioRoute("device_change");
    };
    const connection = navigator?.connection || navigator?.mozConnection || navigator?.webkitConnection;
    const handleConnectionChange = () => {
      refreshBrowserNetworkType();
      if (callStateRef.current === "connected" || callStateRef.current === "connecting") {
        void recoverCall("network_type_change");
      }
    };

    navigator?.mediaDevices?.addEventListener?.("devicechange", handleDeviceChange);
    connection?.addEventListener?.("change", handleConnectionChange);

    return () => {
      navigator?.mediaDevices?.removeEventListener?.("devicechange", handleDeviceChange);
      connection?.removeEventListener?.("change", handleConnectionChange);
    };
  }, []);

  useEffect(() => {
    const socket = createRealtimeSocket(env.signalingNamespace ?? "/realtime/signaling", {
      authBuilder: () => {
        const token = getAccessToken();
        return token ? { token } : {};
      }
    });
    socketRef.current = socket;

    const emitWithAck = (eventName, payload, label = eventName, timeoutMs = 5000) =>
      new Promise((resolve, reject) => {
        if (!socketRef.current) {
          reject(new Error(`${label} socket unavailable`));
          return;
        }
        socketRef.current.timeout(timeoutMs).emit(eventName, payload, (error, response) => {
          if (error) {
            reject(new Error(`${label} ack timeout`));
            return;
          }
          if (response?.ok === false) {
            reject(new Error(response?.reason || `${label} rejected`));
            return;
          }
          resolve(response || { ok: true });
        });
      });
    emitWithAckRef.current = emitWithAck;

    const handleConnect = () => {
      setConnected(true);
      updateNetwork("reconnecting", "Signaling connected");
      pushLog("Socket connected", {
        socketId: socket.id
      });
      void emitWithAck(RealtimeEvent.SESSION_JOIN, {
        sessionId,
        displayName,
        visitorToken: participantType === "visitor" ? getVisitorSessionToken(sessionId) || undefined : undefined
      }, "session.join").catch((error) => {
        pushLog("Session join ack failed", {
          error: error?.message || "session_join_ack_failed"
        });
      });
    };

    const handleDisconnect = () => {
      setConnected(false);
      setJoined(false);
      updateNetwork("reconnecting", "Signaling disconnected");
      pushLog("Socket disconnected");
      if (callStateRef.current === "connected" || callStateRef.current === "connecting") {
        void recoverCall("socket_disconnect");
      }
    };

    const handleConnectError = (error) => {
      pushLog("Socket connect error", {
        error: error?.message || "unknown_connect_error"
      });
    };

    const handleReconnectAttempt = (attempt) => {
      pushLog("Socket reconnect attempt", { attempt });
    };

    const handleSessionJoined = () => {
      setJoined(true);
      updateNetwork("good", "Signaling ready");
      pushLog("Session joined", {
        sessionId
      });
    };

    const handleSessionJoinDenied = (payload) => {
      pushLog("Session join denied", payload || {});
      setStatus(payload?.reason === "invalid_visitor_token" ? "Session access expired. Re-open the invite link." : "Unable to join session.");
    };

    const handleSessionSnapshot = (payload) => {
      if (String(payload?.sessionId || "") !== String(sessionId || "")) return;
      if (payload?.status) {
        setStatus(String(payload.status));
      }
      const activeCall = payload?.activeCall;
      if (!activeCall?.callSessionId) return;
      callSessionRef.current = String(activeCall.callSessionId || callSessionRef.current || "");
      callVisitorIdRef.current = String(activeCall.visitorId || callVisitorIdRef.current || sessionId);
      if (activeCall.status === "ringing" && !canStartCall) {
        setIncomingCall((current) => current.pending ? current : {
          pending: true,
          hasVideo: Boolean(activeCall.hasVideo),
          callSessionId: String(activeCall.callSessionId || ""),
          visitorId: String(activeCall.visitorId || sessionId),
          sessionId
        });
        grantSessionCallAccess(sessionId, "incoming");
      }
      if (["active", "ongoing"].includes(String(activeCall.status || ""))) {
        setCallStateSafe("connecting");
      }
      pushLog("Session snapshot received", {
        activeCallStatus: activeCall.status || "none",
        participantCount: Array.isArray(payload?.participants) ? payload.participants.length : 0
      });
    };

    const handleChatMessage = (payload) => {
      if (payload?.sessionId !== sessionId) return;
      const normalized = normalizeMessage(payload, participantType);
      setMessages((prev) => {
        const existing = prev.find((item) => item.id === normalized.id);
        if (existing) return prev;
        return mergeMessages(prev, [normalized]);
      });
      if (!normalized.mine) {
        playMessageNotificationSound();
      }
      pushLog("Chat message received", {
        messageId: normalized.id,
        senderType: normalized.senderType
      });
    };

    const handleChatPersisted = (payload) => {
      if (payload?.sessionId !== sessionId) return;
      setMessageDelivery((prev) => ({ ...prev, [payload?.clientId || payload?.id]: "delivered" }));
      upsertMessage({ ...payload, failed: false, persisted: true });
    };

    const handleChatPersistFailed = (payload) => {
      if (payload?.sessionId !== sessionId) return;
      setMessageDelivery((prev) => ({ ...prev, [payload?.clientId || payload?.id]: "failed" }));
      upsertMessage({ ...payload, failed: true, persisted: false });
    };

    const handleChatAck = (payload) => {
      if (payload?.sessionId !== sessionId) return;
      setMessageDelivery((prev) => ({ ...prev, [payload?.clientId || payload?.id]: payload?.status || "queued" }));
    };

    const handleChatTyping = (payload) => {
      if (payload?.sessionId !== sessionId) return;
      const nextState = {
        isTyping: Boolean(payload?.isTyping),
        senderType: payload?.senderType || "",
        displayName: payload?.displayName || "Participant",
        at: payload?.at || new Date().toISOString(),
      };
      setTypingState(nextState);
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      if (nextState.isTyping) {
        typingTimeoutRef.current = window.setTimeout(() => {
          setTypingState({ isTyping: false, senderType: "", displayName: "", at: "" });
        }, 2500);
      }
    };

    const handleChatRead = (payload) => {
      if (payload?.sessionId !== sessionId) return;
      setMessageDelivery((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          if (next[key] === "queued" || next[key] === "delivered") {
            next[key] = "read";
          }
        });
        return next;
      });
    };

    const handleCallInvite = (payload) => {
      if (String(payload?.sessionId || "") !== String(sessionId || "")) return;
      const nextIncoming = {
        pending: true,
        hasVideo: Boolean(payload?.hasVideo || payload?.type === "video"),
        callSessionId: String(payload?.callSessionId || ""),
        visitorId: String(payload?.visitorId || sessionId),
        sessionId: String(payload?.sessionId || sessionId)
      };
      if (
        canStartCall &&
        nextIncoming.callSessionId &&
        nextIncoming.callSessionId === callSessionRef.current &&
        ["connecting", "ringing", "connected"].includes(callStateRef.current)
      ) {
        return;
      }
      callSessionRef.current = nextIncoming.callSessionId || callSessionRef.current;
      callVisitorIdRef.current = nextIncoming.visitorId || callVisitorIdRef.current;
      setIncomingCall(nextIncoming);
      setStatus(nextIncoming.hasVideo ? "Incoming video call" : "Incoming audio call");
      setCallStateSafe("ringing");
      grantSessionCallAccess(sessionId, "incoming");
      playIncomingCallNotificationSound();
      void emitWithAck(RealtimeEvent.CALL_INVITE_RECEIVED, {
        sessionId,
        callSessionId: nextIncoming.callSessionId
      }, "call.invite.received").catch(() => {});
      pushLog("Incoming call received", {
        callSessionId: nextIncoming.callSessionId,
        hasVideo: nextIncoming.hasVideo,
        replayed: Boolean(payload?.replayed)
      });
    };

    const handleCallAccepted = async (payload) => {
      if (String(payload?.sessionId || "") !== String(sessionId || "")) return;
      if (String(payload?.callSessionId || "") && payload.callSessionId !== callSessionRef.current) return;
      setStatus("Call accepted. Connecting media...");
      pushLog("Remote accepted call", {
        callSessionId: payload?.callSessionId || callSessionRef.current
      });
      if (canStartCall && localStreamRef.current) {
        await sendOffer();
      }
    };

    const handleCallRejected = (payload) => {
      if (String(payload?.sessionId || "") !== String(sessionId || "")) return;
      setStatus("Call was rejected");
      pushLog("Remote rejected call", {
        callSessionId: payload?.callSessionId || callSessionRef.current
      });
      void endCall(false);
    };

    const handleCallEnded = (payload) => {
      if (String(payload?.sessionId || "") !== String(sessionId || "") && String(payload?.callSessionId || "") !== callSessionRef.current) {
        return;
      }
      setStatus("Call ended by participant");
      pushLog("Remote ended call", {
        callSessionId: payload?.callSessionId || callSessionRef.current
      });
      void endCall(false);
    };

    const handleSessionControl = (payload) => {
      if (payload?.sessionId !== sessionId) return;
      if (payload?.action === "mute") setRemoteMuted(true);
      if (payload?.action === "unmute") setRemoteMuted(false);
      if (payload?.action === "end") {
        setStatus("Call ended by participant");
        void endCall(false);
      }
    };

    const handleSessionStatus = (payload) => {
      if (String(payload?.sessionId || "") !== String(sessionId || "")) return;
      if (payload?.status) {
        setStatus(String(payload.status));
      }
    };

    const handleSessionActivated = (payload) => {
      if (String(payload?.sessionId || payload?.data?.id || "") !== String(sessionId || "")) return;
      setStatus("Access approved. Entering session...");
    };

    const handleWebrtcOffer = async (payload) => {
      if (String(payload?.sessionId || "") !== String(sessionId || "")) return;
      pendingOfferPayloadRef.current = payload;
      callSessionRef.current = String(payload?.callSessionId || callSessionRef.current || "");

      const readyToAnswer =
        participantType !== "visitor" ||
        hasSessionCallAccess(sessionId) ||
        incomingCallRef.current.pending ||
        Boolean(readJsonStorage(CALL_ACCEPT_INTENT_KEY));

      if (!readyToAnswer) {
        setIncomingCall((current) => current.pending ? current : {
          pending: true,
          hasVideo: Boolean(payload?.hasVideo),
          callSessionId: callSessionRef.current,
          visitorId: callVisitorIdRef.current || sessionId,
          sessionId
        });
        return;
      }

      const pc = createPeerConnection({ forceRelay: shouldForceRelayRef.current });
      const offerCollision = makingOfferRef.current || pc.signalingState !== "stable";
      ignoreOfferRef.current = !polite && offerCollision;
      if (ignoreOfferRef.current) {
        return;
      }

      try {
        if (!localStreamRef.current) {
          await ensureLocalStream({ video: Boolean(payload?.hasVideo) });
        }
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        await drainPendingCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit(RealtimeEvent.WEBRTC_ANSWER, {
          sessionId,
          callSessionId: callSessionRef.current || undefined,
          sdp: pc.localDescription
        });
        setCallStateSafe("connecting");
        setStatus("Connecting call...");
        pushLog("Answer sent");
      } catch (error) {
        setStatus(error?.message || "Failed to handle incoming call");
        pushLog("Failed to handle offer", {
          error: error?.message || "offer_error"
        });
      }
    };

    const handleWebrtcAnswer = async (payload) => {
      if (String(payload?.sessionId || "") !== String(sessionId || "")) return;
      const pc = peerRef.current;
      if (!pc) return;
      clearConnectTimers();
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        await drainPendingCandidates();
        setCallStateSafe("connecting");
        pushLog("Remote answer applied");
      } catch (error) {
        setStatus(error?.message || "Failed to establish call");
        pushLog("Failed to apply remote answer", {
          error: error?.message || "answer_error"
        });
      }
    };

    const handleWebrtcIce = async (payload) => {
      if (String(payload?.sessionId || "") !== String(sessionId || "")) return;
      const candidate = payload?.candidate;
      if (!candidate) return;
      const pc = peerRef.current;
      if (!pc || !pc.remoteDescription) {
        pendingRemoteCandidatesRef.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        pushLog("Remote ICE candidate applied", {
          candidateType: getCandidateType(candidate?.candidate || "")
        });
      } catch {
        pendingRemoteCandidatesRef.current.push(candidate);
        pushLog("Remote ICE candidate queued", {
          candidateType: getCandidateType(candidate?.candidate || "")
        });
      }
    };

    const handleAnyEvent = (event, data) => {
      if (typeof console !== "undefined") {
        console.log("[SOCKET EVENT]", event, data);
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.io.on("reconnect_attempt", handleReconnectAttempt);
    socket.on(RealtimeEvent.SESSION_JOINED, handleSessionJoined);
    socket.on(RealtimeEvent.SESSION_JOIN_DENIED, handleSessionJoinDenied);
    socket.on(RealtimeEvent.SESSION_SNAPSHOT, handleSessionSnapshot);
    socket.on(RealtimeEvent.CHAT_MESSAGE, handleChatMessage);
    socket.on(RealtimeEvent.CHAT_PERSISTED, handleChatPersisted);
    socket.on(RealtimeEvent.CHAT_PERSIST_FAILED, handleChatPersistFailed);
    socket.on(RealtimeEvent.CHAT_ACK, handleChatAck);
    socket.on(RealtimeEvent.CHAT_TYPING, handleChatTyping);
    socket.on(RealtimeEvent.CHAT_READ, handleChatRead);
    socket.on(RealtimeEvent.CALL_INVITE, handleCallInvite);
    socket.on(RealtimeEvent.CALL_ACCEPTED, handleCallAccepted);
    socket.on(RealtimeEvent.CALL_REJECTED, handleCallRejected);
    socket.on(RealtimeEvent.CALL_ENDED, handleCallEnded);
    socket.on(RealtimeEvent.SESSION_CONTROL, handleSessionControl);
    socket.on(RealtimeEvent.SESSION_STATUS, handleSessionStatus);
    socket.on(RealtimeEvent.SESSION_ACTIVATED, handleSessionActivated);
    socket.on(RealtimeEvent.WEBRTC_OFFER, handleWebrtcOffer);
    socket.on(RealtimeEvent.WEBRTC_ANSWER, handleWebrtcAnswer);
    socket.on(RealtimeEvent.WEBRTC_ICE, handleWebrtcIce);
    socket.onAny(handleAnyEvent);
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.io.off("reconnect_attempt", handleReconnectAttempt);
      socket.off(RealtimeEvent.SESSION_JOINED, handleSessionJoined);
      socket.off(RealtimeEvent.SESSION_JOIN_DENIED, handleSessionJoinDenied);
      socket.off(RealtimeEvent.SESSION_SNAPSHOT, handleSessionSnapshot);
      socket.off(RealtimeEvent.CHAT_MESSAGE, handleChatMessage);
      socket.off(RealtimeEvent.CHAT_PERSISTED, handleChatPersisted);
      socket.off(RealtimeEvent.CHAT_PERSIST_FAILED, handleChatPersistFailed);
      socket.off(RealtimeEvent.CHAT_ACK, handleChatAck);
      socket.off(RealtimeEvent.CHAT_TYPING, handleChatTyping);
      socket.off(RealtimeEvent.CHAT_READ, handleChatRead);
      socket.off(RealtimeEvent.CALL_INVITE, handleCallInvite);
      socket.off(RealtimeEvent.CALL_ACCEPTED, handleCallAccepted);
      socket.off(RealtimeEvent.CALL_REJECTED, handleCallRejected);
      socket.off(RealtimeEvent.CALL_ENDED, handleCallEnded);
      socket.off(RealtimeEvent.SESSION_CONTROL, handleSessionControl);
      socket.off(RealtimeEvent.SESSION_STATUS, handleSessionStatus);
      socket.off(RealtimeEvent.SESSION_ACTIVATED, handleSessionActivated);
      socket.off(RealtimeEvent.WEBRTC_OFFER, handleWebrtcOffer);
      socket.off(RealtimeEvent.WEBRTC_ANSWER, handleWebrtcAnswer);
      socket.off(RealtimeEvent.WEBRTC_ICE, handleWebrtcIce);
      socket.offAny(handleAnyEvent);
      releaseRealtimeSocket(env.signalingNamespace ?? "/realtime/signaling", {
        autoConnect: true,
        reconnection: true,
        withCredentials: true
      });
      socketRef.current = null;
      cleanupMedia({ preserveCallSession: false });
    };
  }, [displayName, participantType, polite, sessionId]);

  useEffect(() => {
    beginCallRef.current = beginCall;
  }, [beginCall]);

  useEffect(() => {
    acceptIncomingCallRef.current = acceptIncomingCall;
  }, [acceptIncomingCall]);

  useEffect(() => {
    const startIntent = readJsonStorage(CALL_START_INTENT_KEY);
    if (startIntent?.pending && startIntent?.sessionId === sessionId && canStartCall) {
      clearJsonStorage(CALL_START_INTENT_KEY);
      queueStartIntent(startIntent);
    }

    const acceptIntent = readJsonStorage(CALL_ACCEPT_INTENT_KEY);
    if (acceptIntent?.sessionId === sessionId && acceptIntent?.callSessionId) {
      clearJsonStorage(CALL_ACCEPT_INTENT_KEY);
      queueAcceptIntent(acceptIntent);
    }
  }, [canStartCall, sessionId]);

  useEffect(() => {
    if (!connected || !joined) return;

    if (pendingStartIntentRef.current && canStartCall) {
      const startIntent = pendingStartIntentRef.current;
      pendingStartIntentRef.current = null;
      callModeRef.current = startIntent.mode === CALL_MEDIA_MODE.VIDEO ? CALL_MEDIA_MODE.VIDEO : CALL_MEDIA_MODE.AUDIO;
      if (startIntent.callSessionId) {
        callSessionRef.current = String(startIntent.callSessionId || "");
        callVisitorIdRef.current = String(startIntent.visitorId || callVisitorIdRef.current || sessionId);
        if (startIntent.rtcConfig && typeof startIntent.rtcConfig === "object") {
          currentRtcConfigRef.current = startIntent.rtcConfig;
        }
      }
      if (startIntent.mode === CALL_MEDIA_MODE.VIDEO) {
        void beginCallRef.current?.({ video: true, restart: Boolean(startIntent.callSessionId) });
      } else {
        void beginCallRef.current?.({ video: false, restart: Boolean(startIntent.callSessionId) });
      }
    }

    if (pendingAcceptIntentRef.current) {
      const acceptIntent = pendingAcceptIntentRef.current;
      pendingAcceptIntentRef.current = null;
      const snapshot = {
        pending: true,
        hasVideo: Boolean(acceptIntent.hasVideo),
        callSessionId: String(acceptIntent.callSessionId || ""),
        visitorId: String(acceptIntent.visitorId || sessionId),
        sessionId
      };
      setIncomingCall(snapshot);
      void acceptIncomingCallRef.current?.(snapshot);
    }
  }, [canStartCall, connected, joined, sessionId]);

  useEffect(() => {
    const handleOnline = () => {
      updateNetwork("reconnecting", "Network restored. Reconnecting...");
      if (callStateRef.current === "connected" || callStateRef.current === "connecting") {
        void recoverCall("browser_online");
      }
    };
    const handleOffline = () => {
      updateNetwork("slow", "Network offline. Waiting to reconnect...");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    let removeNativeNetwork = () => {};
    let removeNativeAppState = () => {};
    void addNativeNetworkListener((status) => {
      const nextType = summarizeConnectionType(status);
      networkTypeRef.current = nextType;
      setNetworkType(nextType);
      if (status?.connected) {
        handleOnline();
      } else {
        handleOffline();
      }
    }).then((cleanup) => {
      removeNativeNetwork = cleanup;
    });
    void addNativeAppStateListener((state) => {
      if (state?.isActive && (callStateRef.current === "connected" || callStateRef.current === "connecting")) {
        void refreshAudioRoute("app_resumed");
        void recoverCall("app_resumed");
      }
    }).then((cleanup) => {
      removeNativeAppState = cleanup;
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      removeNativeNetwork();
      removeNativeAppState();
    };
  }, [sessionId]);

  useEffect(() => {
    persistLowBandwidthMode(lowBandwidthMode);
    void optimizeSenders();
  }, [lowBandwidthMode]);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useEffect(() => {
    lowBandwidthModeRef.current = lowBandwidthMode;
    setCallDiagnostics((prev) => ({ ...prev, lowBandwidthMode }));
  }, [lowBandwidthMode]);

  useEffect(() => {
    networkQualityRef.current = networkQuality;
  }, [networkQuality]);

  useEffect(() => {
    audioRouteRef.current = audioRoute;
    setCallDiagnostics((prev) => ({ ...prev, audioRoute }));
  }, [audioRoute]);

  useEffect(() => {
    networkTypeRef.current = networkType;
    setCallDiagnostics((prev) => ({ ...prev, networkType }));
  }, [networkType]);

  useEffect(() => {
    videoQualityProfileRef.current = videoQualityProfile;
    setCallDiagnostics((prev) => ({ ...prev, videoProfile: videoQualityProfile }));
  }, [videoQualityProfile]);

  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !speakerOn;
    }
  }, [speakerOn]);

  useEffect(() => {
    const pc = peerRef.current;
    if (!pc) return;
    const timeoutMs = getRingTimeoutMs(env.callRingTimeoutMs, 30000);
    if (canStartCall && callState === "ringing") {
      const timer = window.setTimeout(() => {
        setStatus("Call timed out. Please try again.");
        void endCall(true);
      }, timeoutMs);
      return () => window.clearTimeout(timer);
    }
  }, [callState, canStartCall]);

  return {
    connected,
    joined,
    callState,
    muted,
    cameraOn,
    cameraFacing,
    speakerOn,
    messages,
    status,
    networkQuality,
    networkDetail,
    callLaunchStage,
    callLaunchStartedAt,
    callConnectedAt,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    featureError,
    remoteMuted,
    audioPlaybackBlocked,
    localMicEnabled,
    callDiagnostics,
    incomingCall,
    acceptedCallMode,
    typingState,
    messageDelivery,
    mediaPermission,
    remoteVideoActive,
    callLogs,
    lowBandwidthMode,
    audioRoute,
    networkType,
    videoQualityProfile,
    debugOverlayOpen,
    canStartCall,
    sendMessage,
    sendTypingState,
    sendQuickResponse,
    retryFailedMessage,
    requestMediaPermissions,
    toggleMute,
    toggleSpeaker,
    setLowBandwidthMode,
    setDebugOverlayOpen,
    switchCamera,
    endCall,
    startAudioCall,
    startVideoCall,
    retryCallConnection,
    acceptIncomingCall,
    rejectIncomingCall
  };
}
