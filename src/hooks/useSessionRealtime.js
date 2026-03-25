import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { env } from "../config/env";
import { apiRequest } from "../services/apiClient";
import {
  CALL_MEDIA_MODE,
  getConnectWatchdogMs,
  getNextFallbackAction,
  getRingTimeoutMs
} from "../services/callFallbackManager";
import {
  buildLivekitConnectOptions,
  buildLivekitRoomOptions,
  buildLivekitVideoCaptureOptions,
  describeLivekitAttempt,
  LIVEKIT_DEFAULT_CONNECT_TIMEOUT_MS,
  LIVEKIT_DEFAULT_RING_TIMEOUT_MS
} from "../services/livekitConnection";
import { realtimeTransportOptions } from "../services/socketConfig";
import { getVisitorSessionMessages } from "../services/homeownerService";
import { getVisitorSessionToken } from "../services/visitorSessionToken";
import {
  clearSessionCallAccess,
  grantSessionCallAccess
} from "../services/sessionCallAccess";
import {
  playIncomingCallNotificationSound,
  playMessageNotificationSound
} from "../utils/notificationSound";
import { notify } from "../utils/notifier";

const rtcConfig = {
  iceServers: env.webRtcIceServers,
  iceCandidatePoolSize: 8
};

const CALL_RETRY_DELAY_MS = 2500;
const CALL_RETRY_LIMIT = 2;
const LOW_BANDWIDTH_STORAGE_KEY = "qring_low_bandwidth_mode";
const SOCKET_RELEASE_GRACE_MS = 2 * 60 * 1000;
const signalingSocketPool = new Map();
const DIAGNOSTICS_POLL_MS = 3000;
const CONNECTION_RECOVERY_LIMIT = 2;
const CALL_INVITE_RETRY_MS = 1800;
const DEVICE_STORAGE_KEY = "qring_visitor_device_id";
const CALL_ACCEPT_INTENT_KEY = "qring_call_accept_intent";
const CALL_START_INTENT_KEY = "qring_call_start_intent";
const LIVEKIT_PEER_CONNECT_TIMEOUT_MS = 30000;
const LIVEKIT_WEBSOCKET_TIMEOUT_MS = 15000;
const LIVEKIT_MANUAL_RECONNECT_DELAY_MS = 1500;
const LIVEKIT_MANUAL_RECONNECT_MAX_ATTEMPTS = 3;

function getMessageRoute({ sessionId, participantType }) {
  if (participantType === "homeowner") {
    return `/dashboard/homeowner/messages?sessionId=${encodeURIComponent(sessionId || "")}`;
  }
  if (participantType === "security") {
    return `/dashboard/security/messages?sessionId=${encodeURIComponent(sessionId || "")}`;
  }
  return `/session/${sessionId}/message`;
}

function normalizeIceServerList(servers = []) {
  const fallback = [
    { urls: ["stun:stun.l.google.com:19302"] },
    { urls: ["stun:stun1.l.google.com:19302"] }
  ];
  const list = Array.isArray(servers) ? servers : [];
  const normalized = list
    .map((entry) => {
      if (!entry) return null;
      if (typeof entry === "string") return { urls: [entry] };
      if (typeof entry !== "object") return null;
      const urls = Array.isArray(entry.urls) ? entry.urls : [entry.urls].filter(Boolean);
      if (urls.length === 0) return null;
      return {
        urls,
        username: entry.username,
        credential: entry.credential
      };
    })
    .filter(Boolean);
  const merged = [...normalized, ...fallback];
  const seen = new Set();
  return merged.filter((entry) => {
    const urls = Array.isArray(entry.urls) ? entry.urls : [entry.urls].filter(Boolean);
    if (!urls.length) return false;
    const key = `${urls.join(",")}|${entry.username || ""}|${entry.credential || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    entry.urls = urls;
    return true;
  });
}

function currentPathname() {
  if (typeof window === "undefined") return "/";
  const hash = window.location.hash || "";
  if (hash.startsWith("#/")) {
    const hashPath = hash.slice(1).split("?")[0];
    return hashPath || "/";
  }
  return window.location.pathname || "/";
}

function isLikelyMobileWebView() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod|wv|Version\/[\d.]+ Mobile/i.test(ua);
}

function shouldForceSecureSocket(url) {
  if (!url) return false;
  if (/^https:\/\//i.test(url) || /^wss:\/\//i.test(url)) return false;
  if (!/^http:\/\//i.test(url) && !/^ws:\/\//i.test(url)) return false;
  if (/localhost|127\.0\.0\.1|192\.168\.|10\./i.test(url)) return false;
  return true;
}

function emptyDiagnostics() {
  return {
    connectionState: "new",
    iceConnectionState: "new",
    signalingState: "stable",
    localCandidateType: "-",
    remoteCandidateType: "-",
    roundTripTimeMs: null,
    packetLoss: null,
    jitterMs: null,
    updatedAt: null
  };
}

function emitRealtimeTextAlert({
  title = "Qring Alert",
  message,
  type = "info",
  duration = 3200,
  route = ""
}) {
  if (typeof window === "undefined") return;
  const body = String(message || "").trim();
  if (!body) return;
  notify({
    title,
    message: body,
    type,
    duration,
    route,
    systemWhenHidden: true,
    dedupeKey: `realtime|${type}|${title}|${body}|${route}`
  });
}

function emitBlockingModal({ title = "Notice", message }) {
  if (typeof window === "undefined") return;
  const body = String(message || "").trim();
  if (!body) return;
  window.dispatchEvent(
    new CustomEvent("qring:blocking", {
      detail: {
        title,
        message: body
      }
    })
  );
}

function acquireSignalingSocket(sessionId) {
  const key = String(sessionId || "");
  let entry = signalingSocketPool.get(key);
  if (!entry) {
    const socket = io(`${env.socketUrl}${env.signalingNamespace ?? "/realtime/signaling"}`, {
      path: env.socketPath,
      ...realtimeTransportOptions,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 400,
      reconnectionDelayMax: 2000,
      timeout: 7000,
      auth: (cb) => {
        const latestToken = localStorage.getItem("qring_access_token");
        cb(latestToken ? { token: latestToken } : {});
      },
      withCredentials: true
    });
    entry = { socket, refs: 0, releaseTimer: null };
    signalingSocketPool.set(key, entry);
  }
  if (entry.releaseTimer) {
    clearTimeout(entry.releaseTimer);
    entry.releaseTimer = null;
  }
  entry.refs += 1;
  return entry.socket;
}

function releaseSignalingSocket(sessionId) {
  const key = String(sessionId || "");
  const entry = signalingSocketPool.get(key);
  if (!entry) return;
  entry.refs = Math.max(0, entry.refs - 1);
  if (entry.refs > 0) return;
  entry.releaseTimer = setTimeout(() => {
    const latest = signalingSocketPool.get(key);
    if (!latest || latest.refs > 0) return;
    latest.socket.disconnect();
    signalingSocketPool.delete(key);
  }, SOCKET_RELEASE_GRACE_MS);
}

export function useSessionRealtime(sessionId) {
  const token = localStorage.getItem("qring_access_token");
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("qring_user") || "null");
    } catch {
      return null;
    }
  }, []);
  const userRole = String(user?.role || "").toLowerCase();
  const displayName = user?.fullName || (userRole === "security" ? "Security" : userRole === "homeowner" ? "Homeowner" : "Visitor");
  const isHomeowner = userRole === "homeowner";
  const isSecurity = userRole === "security";
  const canStartCall = isHomeowner || isSecurity;
  const participantType = isHomeowner ? "homeowner" : isSecurity ? "security" : "visitor";
  const isMobileWebView = isLikelyMobileWebView();

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
  const [networkQuality, setNetworkQuality] = useState("reconnecting");
  const [networkDetail, setNetworkDetail] = useState("Connecting...");
  const [callLaunchStage, setCallLaunchStage] = useState("idle");
  const [callLaunchStartedAt, setCallLaunchStartedAt] = useState(null);
  const [callConnectedAt, setCallConnectedAt] = useState(null);
  const [incomingCall, setIncomingCall] = useState({
    pending: false,
    hasVideo: false,
    callSessionId: "",
    visitorId: ""
  });
  const [acceptedCallMode, setAcceptedCallMode] = useState("");
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);
  const [callLogs, setCallLogs] = useState([]);
  const [callDiagnostics, setCallDiagnostics] = useState(() => emptyDiagnostics());
  const [lowBandwidthMode, setLowBandwidthModeState] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LOW_BANDWIDTH_STORAGE_KEY) === "true";
  });

  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const previewStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const pendingRemoteCandidates = useRef([]);
  const isMakingOfferRef = useRef(false);
  const pendingOfferRef = useRef(null);
  const callStateRef = useRef("idle");
  const retryOfferTimerRef = useRef(null);
  const lastOfferRef = useRef(null);
  const offerRetryCountRef = useRef(0);
  const pendingLocalMessageIdsRef = useRef(new Set());
  const connectedOnceRef = useRef(false);
  const pendingStartCallRef = useRef(null);
  const pendingLivekitStartRef = useRef(null);
  const diagnosticsTimerRef = useRef(null);
  const forceRelayRef = useRef(false);
  const pendingVideoUpgradeRef = useRef(false);
  const pendingHomeownerVideoRef = useRef(false);
  const connectionRecoveryCountRef = useRef(0);
  const lastAlertAtRef = useRef(new Map());
  const audioOnlyModalKeyRef = useRef("");
  const audioOnlyModalShownRef = useRef(false);
  const lastInviteHasVideoRef = useRef(false);
  const inviteRetryTimerRef = useRef(null);
  const livekitRoomRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const livekitDisconnectingRef = useRef(false);
  const livekitConnectingRef = useRef(false);
  const livekitReconnectTimerRef = useRef(null);
  const livekitReconnectAttemptsRef = useRef(0);
  const acceptingCallRef = useRef(false);
  const remoteLivekitTracksRef = useRef(new Set());
  const callSessionRef = useRef("");
  const callVisitorIdRef = useRef("");
  const incomingRingTimerRef = useRef(null);
  const livekitAttemptRef = useRef({
    mode: CALL_MEDIA_MODE.AUDIO,
    forceRelay: false,
    startedAt: null
  });
  const livekitConnectWatchdogRef = useRef(null);
  const callRingTimeoutRef = useRef(null);
  const automatedFallbackMessageSentRef = useRef(false);
  const livekitDiagnosticsRoomRef = useRef(null);
  const livekitDiagnosticsSnapshotRef = useRef({
    publisherConnectionState: "",
    publisherIceConnectionState: "",
    subscriberConnectionState: "",
    subscriberIceConnectionState: "",
    localCandidateType: "",
    remoteCandidateType: ""
  });

  const supportsWebRTC =
    typeof window !== "undefined" && typeof window.RTCPeerConnection !== "undefined";
  const supportsUserMedia =
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function";
  const isSecureOrigin = typeof window === "undefined" ? true : window.isSecureContext;

  const livekitEnabled = Boolean(env.livekitUrl);
  const legacyWebrtcEnabled = !livekitEnabled && Boolean(env.enableLegacyWebrtc);

  const featureError = useMemo(() => {
    if (!supportsWebRTC) return "This browser does not support WebRTC calls.";
    if (!isSecureOrigin) {
      return "Camera and microphone require HTTPS on network devices. Open the app with HTTPS or localhost.";
    }
    if (shouldForceSecureSocket(env.socketUrl)) {
      return "Insecure signaling URL detected. Use HTTPS/WSS backend for reliable calls.";
    }
    if (livekitEnabled && !/^wss:\/\//i.test(env.livekitUrl)) {
      return "LiveKit must use a secure WSS URL outside local development.";
    }
    if (!supportsUserMedia) return "Camera/microphone APIs are unavailable in this browser.";
    if (!livekitEnabled && !legacyWebrtcEnabled) {
      return "Call service is unavailable. Configure VITE_LIVEKIT_URL to enable backend-driven calls.";
    }
    return "";
  }, [isSecureOrigin, supportsUserMedia, supportsWebRTC, livekitEnabled, legacyWebrtcEnabled]);
  const autoLowBandwidthActive = lowBandwidthMode || networkQuality === "slow";
  const livekitIceServers = useMemo(() => normalizeIceServerList(env.webRtcIceServers), []);

  function logCall(level, message, extra = undefined) {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      level,
      message,
      at: new Date().toISOString(),
      extra,
    };
    const loggerMethod =
      level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    loggerMethod(`[QRing RTC] ${message}`, extra ?? "");
    setCallLogs((prev) => [...prev.slice(-39), entry]);
    if (level === "error") {
      setStatus(message);
    }
  }

  function clearLivekitReconnectTimer() {
    if (livekitReconnectTimerRef.current) {
      clearTimeout(livekitReconnectTimerRef.current);
      livekitReconnectTimerRef.current = null;
    }
  }

  function clearLivekitConnectWatchdog() {
    if (livekitConnectWatchdogRef.current) {
      clearTimeout(livekitConnectWatchdogRef.current);
      livekitConnectWatchdogRef.current = null;
    }
  }

  function clearCallRingTimeout() {
    if (callRingTimeoutRef.current) {
      clearTimeout(callRingTimeoutRef.current);
      callRingTimeoutRef.current = null;
    }
  }

  function resetFallbackState() {
    automatedFallbackMessageSentRef.current = false;
    livekitAttemptRef.current = {
      mode: CALL_MEDIA_MODE.AUDIO,
      forceRelay: false,
      startedAt: null
    };
    clearLivekitConnectWatchdog();
    clearCallRingTimeout();
  }

  function clearInviteRetryTimer() {
    if (inviteRetryTimerRef.current) {
      clearInterval(inviteRetryTimerRef.current);
      inviteRetryTimerRef.current = null;
    }
  }

  function clearIncomingCall() {
    setIncomingCall({
      pending: false,
      hasVideo: false,
      callSessionId: "",
      visitorId: ""
    });
  }

  useEffect(() => {
    if (canStartCall) return;
    if (!incomingCall.pending) {
      if (incomingRingTimerRef.current) {
        clearInterval(incomingRingTimerRef.current);
        incomingRingTimerRef.current = null;
      }
      return;
    }

    const shouldRing = () => {
      try {
        return typeof document === "undefined" ? true : !document.hidden;
      } catch {
        return true;
      }
    };

    if (shouldRing()) {
      playIncomingCallNotificationSound();
    }
    if (!incomingRingTimerRef.current) {
      incomingRingTimerRef.current = setInterval(() => {
        if (!shouldRing()) return;
        playIncomingCallNotificationSound();
      }, CALL_INVITE_RETRY_MS);
    }

    return () => {
      if (incomingRingTimerRef.current) {
        clearInterval(incomingRingTimerRef.current);
        incomingRingTimerRef.current = null;
      }
    };
  }, [incomingCall.pending, canStartCall]);

  function getVisitorIdentity() {
    try {
      const existing = localStorage.getItem(DEVICE_STORAGE_KEY);
      if (existing) return existing;
    } catch {
      // Ignore storage failures; fallback below.
    }
    return sessionId;
  }

  function emitCallInvite(hasVideo) {
    lastInviteHasVideoRef.current = Boolean(hasVideo);
    socketRef.current?.emit("call.invite", {
      sessionId,
      hasVideo: Boolean(hasVideo),
      callSessionId: callSessionRef.current || undefined,
      visitorId: callVisitorIdRef.current || incomingCall.visitorId || undefined
    });
  }

  function consumeCallAcceptIntent() {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(CALL_ACCEPT_INTENT_KEY);
      if (!raw) return null;
      sessionStorage.removeItem(CALL_ACCEPT_INTENT_KEY);
      const parsed = JSON.parse(raw);
      if (parsed?.sessionId !== sessionId) return null;
      return {
        pending: true,
        hasVideo: Boolean(parsed?.hasVideo),
        callSessionId: String(parsed?.callSessionId || ""),
        visitorId: String(parsed?.visitorId || ""),
      };
    } catch {
      return null;
    }
  }

  function saveCallAcceptIntent(intent) {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(CALL_ACCEPT_INTENT_KEY, JSON.stringify(intent || {}));
    } catch {
      // Keep storage failures non-blocking.
    }
  }

  function clearCallAcceptIntent() {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.removeItem(CALL_ACCEPT_INTENT_KEY);
    } catch {
      // Keep storage failures non-blocking.
    }
  }

  function consumeCallStartIntent() {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(CALL_START_INTENT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.sessionId !== sessionId) return null;
      sessionStorage.removeItem(CALL_START_INTENT_KEY);
      return parsed;
    } catch {
      return null;
    }
  }

  function startInviteRetryLoop(hasVideo) {
    clearInviteRetryTimer();
    emitCallInvite(hasVideo);
    inviteRetryTimerRef.current = setInterval(() => {
      if (!["ringing", "connecting"].includes(callStateRef.current)) {
        clearInviteRetryTimer();
        return;
      }
      emitCallInvite(hasVideo);
    }, CALL_INVITE_RETRY_MS);
  }

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  function isMineBySenderType(senderType) {
    if (user?.role === "homeowner") return senderType === "homeowner";
    if (user?.role) return senderType === user.role;
    return senderType !== "homeowner";
  }

  function normalizeMessage(payload) {
    const senderType = payload?.senderType || null;
    const persisted = payload?.persisted !== false;
    const clientId = payload?.clientId || null;
    return {
      id: payload?.id || null,
      clientId,
      text: payload?.text || "",
      displayName: payload?.displayName || "Participant",
      senderType,
      at: payload?.at || new Date().toISOString(),
      persisted,
      failed: payload?.persistFailed === true,
      persistError: payload?.persistError || "",
      mine:
        senderType !== null
          ? isMineBySenderType(senderType)
          : payload?.displayName === displayName
    };
  }

  function isLikelyDuplicateMessage(current, next) {
    if (!current || !next) return false;
    if (current.id && next.id && current.id === next.id) return true;
    if ((current.text || "").trim() !== (next.text || "").trim()) return false;
    if ((current.senderType || "") !== (next.senderType || "")) return false;
    const currentTs = Date.parse(current.at || "");
    const nextTs = Date.parse(next.at || "");
    if (Number.isNaN(currentTs) || Number.isNaN(nextTs)) return false;
    return Math.abs(currentTs - nextTs) < 12000;
  }

  function mergeMessages(currentRows, nextRows) {
    const merged = [...(currentRows || [])];
    (nextRows || []).forEach((incoming) => {
      if (!incoming) return;
      if (incoming.id && merged.some((item) => item?.id && item.id === incoming.id)) return;
      if (merged.some((item) => isLikelyDuplicateMessage(item, incoming))) return;
      merged.push(incoming);
    });
    return merged.sort((a, b) => Date.parse(a?.at || "") - Date.parse(b?.at || ""));
  }

  function setLowBandwidthMode(nextValue) {
    const normalized = Boolean(nextValue);
    setLowBandwidthModeState(normalized);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOW_BANDWIDTH_STORAGE_KEY, normalized ? "true" : "false");
    }
  }

  function showAudioOnlyModal(key) {
    if (canStartCall) return;
    const modalKey = String(key || sessionId || "").trim();
    if (audioOnlyModalShownRef.current && audioOnlyModalKeyRef.current === modalKey) return;
    if (typeof window !== "undefined") {
      const storageKey = `qring_audio_only_modal_${modalKey}`;
      if (sessionStorage.getItem(storageKey) === "true") {
        audioOnlyModalShownRef.current = true;
        audioOnlyModalKeyRef.current = modalKey;
        return;
      }
      sessionStorage.setItem(storageKey, "true");
    }
    audioOnlyModalShownRef.current = true;
    audioOnlyModalKeyRef.current = modalKey;
    emitBlockingModal({
      title: "Connection unstable",
      message: "Bad network detected on visitor side. Joined audio-only to keep the call stable."
    });
  }

  async function applyAudioOutputPreference() {
    const audioEl = remoteAudioRef.current;
    if (!audioEl) return;
    audioEl.muted = false;
    audioEl.volume = 1;
    if (typeof audioEl.setSinkId === "function") {
      const preferredSink = speakerOn ? "default" : "communications";
      try {
        await audioEl.setSinkId(preferredSink);
      } catch {
        // Keep playback working even when sink selection is unsupported.
      }
    }
    try {
      await audioEl.play();
      setAudioPlaybackBlocked(false);
    } catch {
      setAudioPlaybackBlocked(true);
    }
  }

  async function retryAudioPlayback() {
    const audioEl = remoteAudioRef.current;
    if (!audioEl) return false;
    try {
      await audioEl.play();
      setAudioPlaybackBlocked(false);
      return true;
    } catch {
      setAudioPlaybackBlocked(true);
      return false;
    }
  }

  function stopLocalPreview() {
    if (!previewStreamRef.current) return;
    previewStreamRef.current.getTracks().forEach((track) => track.stop());
    previewStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }

  async function startLocalPreview({ video }) {
    if (!video) return;
    if (featureError) return;
    stopLocalPreview();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true
    });
    previewStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(() => {});
    }
    setCameraOn(true);
  }

  function ensurePeer() {
    if (peerRef.current) return peerRef.current;
    const peerConfig = {
      ...rtcConfig,
      iceTransportPolicy:
        forceRelayRef.current || (isMobileWebView && autoLowBandwidthActive) ? "relay" : "all"
    };
    const pc = new RTCPeerConnection(peerConfig);
    pc.ontrack = (event) => {
      const stream = event.streams?.[0];
      if (!stream) return;
      if (stream.getVideoTracks().length > 0) {
        setRemoteVideoActive(true);
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play().catch(() => {});
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        applyAudioOutputPreference();
      }
    };
    pc.onicecandidate = (event) => {
      if (!event.candidate || !socketRef.current) return;
      socketRef.current.emit("webrtc.ice", {
        sessionId,
        candidate: event.candidate
      });
    };
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      refreshPeerDiagnostics();
      if (state === "connected") {
        connectionRecoveryCountRef.current = 0;
        setCallState("connected");
        setCallLaunchStage("idle");
        setCallLaunchStartedAt(null);
        if (participantType === "visitor") {
          grantSessionCallAccess(sessionId, "connected");
        }
        if (pendingVideoUpgradeRef.current) {
          pendingVideoUpgradeRef.current = false;
          setStatus("Call connected. Upgrading to video...");
          upgradeCallToVideo().catch((error) => {
            setStatus(error?.message || "Video upgrade failed. Staying on audio.");
          });
        }
      }
      if (state === "failed" || state === "disconnected" || state === "closed") {
        const canRecover =
          canStartCall &&
          state !== "closed" &&
          connectionRecoveryCountRef.current < CONNECTION_RECOVERY_LIMIT;
        if (canRecover) {
          connectionRecoveryCountRef.current += 1;
          forceRelayRef.current = true;
          setCallState("reconnecting");
          setCallLaunchStage("signaling");
          setStatus(
            `Connection unstable. Retrying with relay/audio-only (${connectionRecoveryCountRef.current}/${CONNECTION_RECOVERY_LIMIT})...`
          );
          startCall({ video: false, restart: true, forceRelay: true }).catch(() => {
            // surfaced by startCall status
          });
          return;
        }
        setCallState("ended");
        setCallLaunchStage("idle");
        setCallLaunchStartedAt(null);
        clearSessionCallAccess(sessionId);
      }
    };
    pc.oniceconnectionstatechange = () => {
      refreshPeerDiagnostics();
    };
    pc.onsignalingstatechange = () => {
      refreshPeerDiagnostics();
    };
    peerRef.current = pc;
    startDiagnosticsPolling();
    return pc;
  }

  function stopDiagnosticsPolling() {
    if (diagnosticsTimerRef.current) {
      clearInterval(diagnosticsTimerRef.current);
      diagnosticsTimerRef.current = null;
    }
    livekitDiagnosticsRoomRef.current = null;
  }

  function startDiagnosticsPolling() {
    stopDiagnosticsPolling();
    refreshPeerDiagnostics();
    diagnosticsTimerRef.current = setInterval(() => {
      refreshPeerDiagnostics();
    }, DIAGNOSTICS_POLL_MS);
  }

  async function refreshLivekitDiagnostics(room = livekitDiagnosticsRoomRef.current) {
    const pcManager = room?.engine?.pcManager;
    if (!pcManager) {
      setCallDiagnostics(emptyDiagnostics());
      return;
    }

    const publisher = pcManager.publisher;
    const subscriber = pcManager.subscriber;
    const statsSources = [publisher, subscriber].filter(Boolean);
    const pairs = new Map();
    const candidates = new Map();
    let selectedPair = null;
    let jitterMs = null;
    let packetLoss = 0;
    let hasPacketLoss = false;

    try {
      for (const transport of statsSources) {
        const stats = await transport.getStats();
        stats.forEach((item) => {
          if (item.type === "candidate-pair") {
            pairs.set(item.id, item);
          }
          if (item.type === "local-candidate" || item.type === "remote-candidate") {
            candidates.set(item.id, item);
          }
        });
        stats.forEach((item) => {
          if (item.type === "transport" && item.selectedCandidatePairId && pairs.has(item.selectedCandidatePairId)) {
            selectedPair = pairs.get(item.selectedCandidatePairId);
          }
          if (item.type === "inbound-rtp" && !item.isRemote) {
            if (typeof item.jitter === "number" && jitterMs === null) {
              jitterMs = item.jitter * 1000;
            }
            if (typeof item.packetsLost === "number") {
              packetLoss += item.packetsLost;
              hasPacketLoss = true;
            }
          }
        });
      }

      if (!selectedPair) {
        for (const pair of pairs.values()) {
          if (pair.nominated || pair.selected || pair.state === "succeeded") {
            selectedPair = pair;
            break;
          }
        }
      }

      const localCandidate = selectedPair?.localCandidateId
        ? candidates.get(selectedPair.localCandidateId)
        : null;
      const remoteCandidate = selectedPair?.remoteCandidateId
        ? candidates.get(selectedPair.remoteCandidateId)
        : null;

      const nextSnapshot = {
        publisherConnectionState: publisher?.getConnectionState?.() || "closed",
        publisherIceConnectionState: publisher?.getICEConnectionState?.() || "closed",
        subscriberConnectionState: subscriber?.getConnectionState?.() || "closed",
        subscriberIceConnectionState: subscriber?.getICEConnectionState?.() || "closed",
        localCandidateType: localCandidate?.candidateType || "-",
        remoteCandidateType: remoteCandidate?.candidateType || "-"
      };
      const previousSnapshot = livekitDiagnosticsSnapshotRef.current;
      if (
        nextSnapshot.publisherConnectionState !== previousSnapshot.publisherConnectionState ||
        nextSnapshot.publisherIceConnectionState !== previousSnapshot.publisherIceConnectionState ||
        nextSnapshot.subscriberConnectionState !== previousSnapshot.subscriberConnectionState ||
        nextSnapshot.subscriberIceConnectionState !== previousSnapshot.subscriberIceConnectionState ||
        nextSnapshot.localCandidateType !== previousSnapshot.localCandidateType ||
        nextSnapshot.remoteCandidateType !== previousSnapshot.remoteCandidateType
      ) {
        logCall("info", "LiveKit ICE diagnostics updated", nextSnapshot);
      }
      livekitDiagnosticsSnapshotRef.current = nextSnapshot;

      setCallDiagnostics({
        connectionState:
          nextSnapshot.publisherConnectionState !== "closed"
            ? nextSnapshot.publisherConnectionState
            : nextSnapshot.subscriberConnectionState,
        iceConnectionState:
          nextSnapshot.publisherIceConnectionState !== "closed"
            ? nextSnapshot.publisherIceConnectionState
            : nextSnapshot.subscriberIceConnectionState,
        signalingState: room?.state || "connected",
        localCandidateType: nextSnapshot.localCandidateType,
        remoteCandidateType: nextSnapshot.remoteCandidateType,
        roundTripTimeMs:
          typeof selectedPair?.currentRoundTripTime === "number"
            ? Math.round(selectedPair.currentRoundTripTime * 1000)
            : null,
        packetLoss: hasPacketLoss ? packetLoss : null,
        jitterMs: jitterMs !== null ? Math.round(jitterMs) : null,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      logCall("warn", "Unable to refresh LiveKit diagnostics", error?.message || error);
      setCallDiagnostics((prev) => ({
        ...prev,
        connectionState: publisher?.getConnectionState?.() || subscriber?.getConnectionState?.() || prev.connectionState,
        iceConnectionState:
          publisher?.getICEConnectionState?.() || subscriber?.getICEConnectionState?.() || prev.iceConnectionState,
        updatedAt: new Date().toISOString()
      }));
    }
  }

  function startLivekitDiagnosticsPolling(room) {
    livekitDiagnosticsRoomRef.current = room;
    stopDiagnosticsPolling();
    livekitDiagnosticsRoomRef.current = room;
    void refreshLivekitDiagnostics(room);
    diagnosticsTimerRef.current = setInterval(() => {
      void refreshLivekitDiagnostics(room);
    }, DIAGNOSTICS_POLL_MS);
  }

  async function refreshPeerDiagnostics() {
    const pc = peerRef.current;
    if (!pc) {
      setCallDiagnostics(emptyDiagnostics());
      return;
    }
    try {
      const stats = await pc.getStats();
      const pairs = new Map();
      let selectedPair = null;
      let jitterMs = null;
      let packetLoss = 0;
      let hasPacketLoss = false;

      stats.forEach((item) => {
        if (item.type === "candidate-pair") {
          pairs.set(item.id, item);
        }
      });

      stats.forEach((item) => {
        if (item.type === "transport" && item.selectedCandidatePairId && pairs.has(item.selectedCandidatePairId)) {
          selectedPair = pairs.get(item.selectedCandidatePairId);
        }
      });

      if (!selectedPair) {
        for (const pair of pairs.values()) {
          if (pair.nominated || pair.selected || pair.state === "succeeded") {
            selectedPair = pair;
            break;
          }
        }
      }

      stats.forEach((item) => {
        if (item.type === "inbound-rtp" && !item.isRemote) {
          if (typeof item.jitter === "number" && jitterMs === null) {
            jitterMs = item.jitter * 1000;
          }
          if (typeof item.packetsLost === "number") {
            packetLoss += item.packetsLost;
            hasPacketLoss = true;
          }
        }
      });

      const localCandidate = selectedPair?.localCandidateId ? stats.get(selectedPair.localCandidateId) : null;
      const remoteCandidate = selectedPair?.remoteCandidateId ? stats.get(selectedPair.remoteCandidateId) : null;

      setCallDiagnostics({
        connectionState: pc.connectionState || "new",
        iceConnectionState: pc.iceConnectionState || "new",
        signalingState: pc.signalingState || "stable",
        localCandidateType: localCandidate?.candidateType || "-",
        remoteCandidateType: remoteCandidate?.candidateType || "-",
        roundTripTimeMs:
          typeof selectedPair?.currentRoundTripTime === "number"
            ? Math.round(selectedPair.currentRoundTripTime * 1000)
            : null,
        packetLoss: hasPacketLoss ? packetLoss : null,
        jitterMs: jitterMs !== null ? Math.round(jitterMs) : null,
        updatedAt: new Date().toISOString()
      });
    } catch {
      setCallDiagnostics((prev) => ({
        ...prev,
        connectionState: pc.connectionState || prev.connectionState,
        iceConnectionState: pc.iceConnectionState || prev.iceConnectionState,
        signalingState: pc.signalingState || prev.signalingState,
        updatedAt: new Date().toISOString()
      }));
    }
  }

  function markNetworkGood(detail = "Realtime connection is stable.") {
    setNetworkQuality("good");
    setNetworkDetail(detail);
  }

  function markNetworkSlow(detail = "Connection unstable. Trying to keep the session active.") {
    setNetworkQuality("slow");
    setNetworkDetail(detail);
  }

  function markNetworkReconnecting(detail = "Reconnecting to session...") {
    setNetworkQuality("reconnecting");
    setNetworkDetail(detail);
  }

  function notifyWithCooldown(key, payload, cooldownMs = 2500) {
    const now = Date.now();
    const previous = lastAlertAtRef.current.get(key) || 0;
    if (now - previous < cooldownMs) return;
    lastAlertAtRef.current.set(key, now);
    emitRealtimeTextAlert(payload);
  }

  function sendAutomatedFallbackMessage(reason) {
    if (automatedFallbackMessageSentRef.current) return;
    automatedFallbackMessageSentRef.current = true;
    sendMessage(`Network issue: ${reason}. Continue here in chat while the call stabilizes.`);
  }

  function routeToAsyncFallback(kind) {
    if (typeof window === "undefined") return;
    const baseRoute = getMessageRoute({ sessionId, participantType });
    const separator = baseRoute.includes("?") ? "&" : "?";
    const nextRoute = `${baseRoute}${separator}fallback=${encodeURIComponent(kind || "text")}`;
    if (`${window.location.pathname}${window.location.search}` === nextRoute) return;
    window.setTimeout(() => {
      if (typeof window === "undefined") return;
      window.location.assign(nextRoute);
    }, 250);
  }

  function scheduleLivekitConnectWatchdog({ mode, forceRelay }) {
    clearLivekitConnectWatchdog();
    const watchdogMs = Math.min(
      getConnectWatchdogMs({
        lowBandwidth: autoLowBandwidthActive,
        forceRelay
      }),
      env.callConnectTimeoutMs || LIVEKIT_DEFAULT_CONNECT_TIMEOUT_MS
    );
    livekitConnectWatchdogRef.current = setTimeout(() => {
      if (callStateRef.current === "connected") return;
      if (!livekitRoomRef.current) return;
      logCall("warn", "LiveKit connection watchdog fired", {
        mode,
        forceRelay,
        watchdogMs
      });
      void handleLivekitFallback(
        new Error("Call connection timed out before media stabilized."),
        {
          currentMode: mode,
          forceRelay,
          phase: "connect-timeout"
        }
      );
    }, watchdogMs);
  }

  async function getLivekitModule() {
    return import("livekit-client");
  }

  async function fetchLivekitToken() {
    if (!callSessionRef.current) {
      throw new Error("Call session is not initialized.");
    }
    const response = await apiRequest("/calls/join", {
      method: "POST",
      body: JSON.stringify({
        callSessionId: callSessionRef.current,
        participantType,
        visitorId: participantType === "visitor" ? incomingCall.visitorId || getVisitorIdentity() : undefined,
        visitorToken: participantType === "visitor" ? (getVisitorSessionToken(sessionId) || undefined) : undefined
      })
    });
    return response?.data ?? response;
  }

  async function ensureCallMediaPermissions({ video }) {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: Boolean(video)
    });
    stream.getTracks().forEach((track) => track.stop());
  }

  async function handleLivekitFallback(error, { currentMode, forceRelay, phase }) {
    const nextAction = getNextFallbackAction({
      currentMode,
      forceRelay,
      preferVoiceNote: env.preferVoiceNoteFallback
    });

    logCall("warn", "LiveKit fallback triggered", {
      phase,
      currentMode,
      forceRelay,
      nextAction,
      error: error?.message || error
    });

    clearLivekitConnectWatchdog();
    setStatus(nextAction.status);
    markNetworkSlow(nextAction.detail);

    if (nextAction.kind === "retry") {
      disconnectLivekitRoom();
      const nextIsVideo = nextAction.nextMode === CALL_MEDIA_MODE.VIDEO;
      const nextForceRelay = Boolean(nextAction.forceRelay);
      forceRelayRef.current = nextForceRelay;
      setCallState("reconnecting");
      setCallLaunchStage("connecting");
      if (!canStartCall) {
        setAcceptedCallMode(nextIsVideo ? "video" : "audio");
      }
      const auth = await fetchLivekitToken();
      return connectLivekitRoom({
        video: nextIsVideo,
        auth,
        retryOnAuthError: false,
        forceRelay: nextForceRelay,
        source: "fallback"
      });
    }

    disconnectLivekitRoom();
    setCallState("failed");
    setCallLaunchStage("idle");
    setCallLaunchStartedAt(null);
    notifyWithCooldown("livekit_terminal_fallback", {
      title: "Network Fallback",
      message: nextAction.status,
      type: "warning",
      route: getMessageRoute({ sessionId, participantType })
    });
    sendAutomatedFallbackMessage(
      nextAction.kind === "voice-note"
        ? "voice note fallback activated"
        : "switched to text chat"
    );
    routeToAsyncFallback(nextAction.kind);
    return false;
  }

  function attachTrackToElements(track) {
    if (!track) return;
    if (track.kind === "video") {
      setRemoteVideoActive(true);
      const mediaTrack = track.mediaStreamTrack ?? track;
      if (remoteVideoRef.current && mediaTrack) {
        remoteVideoRef.current.srcObject = new MediaStream([mediaTrack]);
        remoteVideoRef.current.play().catch(() => {});
      }
      return;
    }
    if (track.kind === "audio") {
      const mediaTrack = track.mediaStreamTrack ?? track;
      if (remoteAudioRef.current && mediaTrack) {
        remoteAudioRef.current.srcObject = new MediaStream([mediaTrack]);
        applyAudioOutputPreference();
      }
    }
  }

  function detachRemoteTracks() {
    setRemoteVideoActive(false);
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  }

  function queueLivekitReconnect(room) {
    if (livekitDisconnectingRef.current) return;
    if (!room || livekitRoomRef.current !== room) return;
    if (livekitReconnectAttemptsRef.current >= LIVEKIT_MANUAL_RECONNECT_MAX_ATTEMPTS) {
      logCall("error", "LiveKit reconnect limit reached");
      setStatus("Connection dropped and reconnect failed. Retry call connection.");
      markNetworkSlow("LiveKit reconnect limit reached.");
      setCallState("failed");
      return;
    }
    clearLivekitReconnectTimer();
    livekitReconnectTimerRef.current = setTimeout(() => {
      if (livekitDisconnectingRef.current) return;
      if (!livekitRoomRef.current || livekitRoomRef.current !== room) return;
      livekitReconnectAttemptsRef.current += 1;
      logCall("warn", `Attempting LiveKit reconnect ${livekitReconnectAttemptsRef.current}`);
      setStatus(`Reconnecting call (${livekitReconnectAttemptsRef.current}/${LIVEKIT_MANUAL_RECONNECT_MAX_ATTEMPTS})...`);
      room.reconnect().catch(() => {
        queueLivekitReconnect(room);
      });
    }, LIVEKIT_MANUAL_RECONNECT_DELAY_MS);
  }

  async function publishLivekitLocalVideoTrack({ createLocalTracks, room, lowBandwidth }) {
    if (!room || localVideoTrackRef.current) return;
    const [videoTrack] = await createLocalTracks({
      audio: false,
      video: buildLivekitVideoCaptureOptions({
        lowBandwidth,
        facingMode: "user"
      })
    });
    if (!videoTrack) return;
    await room.localParticipant.publishTrack(videoTrack);
    localVideoTrackRef.current = videoTrack;
    const existingTracks = localStreamRef.current ? localStreamRef.current.getTracks() : [];
    localStreamRef.current = new MediaStream([
      ...existingTracks.filter((track) => track.id !== videoTrack.mediaStreamTrack?.id),
      videoTrack.mediaStreamTrack
    ]);
    if (localVideoRef.current && videoTrack.mediaStreamTrack) {
      localVideoRef.current.srcObject = new MediaStream([videoTrack.mediaStreamTrack]);
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(() => {});
    }
    setCameraOn(true);
  }

  async function upgradeLivekitToVideo() {
    const room = livekitRoomRef.current;
    if (!room) return;
    if (localVideoTrackRef.current) return;
    const { createLocalTracks } = await getLivekitModule();
    await publishLivekitLocalVideoTrack({
      createLocalTracks,
      room,
      lowBandwidth: autoLowBandwidthActive
    });
    setStatus("Video connected");
  }

  async function connectLivekitRoom({
    video,
    auth = null,
    retryOnAuthError = true,
    forceRelay = forceRelayRef.current,
    source = "manual"
  }) {
    if (!livekitEnabled) {
      throw new Error("LiveKit is not enabled. Configure VITE_LIVEKIT_URL.");
    }
    if (livekitConnectingRef.current) return;
    livekitConnectingRef.current = true;
    const requestedMode = video ? CALL_MEDIA_MODE.VIDEO : CALL_MEDIA_MODE.AUDIO;
    livekitAttemptRef.current = {
      mode: requestedMode,
      forceRelay: Boolean(forceRelay),
      startedAt: Date.now()
    };
    try {
      if (livekitRoomRef.current) {
        disconnectLivekitRoom();
      }
      stopLocalPreview();
      let shouldPublishAudio = true;
      let shouldPublishVideo = Boolean(video);
      try {
        await ensureCallMediaPermissions({ video: Boolean(video) });
      } catch (error) {
        if (video) {
          logCall("warn", "Video permission failed, retrying audio-only", error?.message || error);
          setStatus("Video permission failed. Falling back to audio.");
          shouldPublishVideo = false;
          try {
            await ensureCallMediaPermissions({ video: false });
          } catch (audioError) {
            logCall("error", "Audio permission failed, falling back to chat", audioError?.message || audioError);
            shouldPublishAudio = false;
            setStatus("Audio unavailable. Call media fell back to chat.");
          }
        } else {
          logCall("error", "Audio permission failed, falling back to chat", error?.message || error);
          shouldPublishAudio = false;
          setStatus("Audio unavailable. Call media fell back to chat.");
        }
      }

      if (!shouldPublishAudio && !shouldPublishVideo) {
        return handleLivekitFallback(
          new Error("Camera and microphone are unavailable on this device."),
          {
            currentMode: requestedMode,
            forceRelay,
            phase: "media-permission"
          }
        );
      }

      const { EngineEvent, Room, RoomEvent, createLocalTracks } = await getLivekitModule();
      const effectiveAuth = auth || (await fetchLivekitToken());
      logCall("info", "Connecting to LiveKit room", {
        roomName: effectiveAuth?.roomName,
        url: effectiveAuth?.url || env.livekitUrl,
        participantType,
        source,
        attempt: describeLivekitAttempt({
          mode: shouldPublishVideo ? CALL_MEDIA_MODE.VIDEO : CALL_MEDIA_MODE.AUDIO,
          forceRelay
        })
      });
      const room = new Room(
        buildLivekitRoomOptions({
          iceServers: livekitIceServers,
          lowBandwidth: autoLowBandwidthActive,
          forceRelay
        })
      );
      livekitRoomRef.current = room;
      scheduleLivekitConnectWatchdog({
        mode: shouldPublishVideo ? CALL_MEDIA_MODE.VIDEO : CALL_MEDIA_MODE.AUDIO,
        forceRelay
      });

      room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
        if (livekitDisconnectingRef.current) return;
        if (livekitRoomRef.current !== room) return;
        if (participant && !room.remoteParticipants.has(participant.sid)) return;
        logCall("info", "Track received", {
          kind: track.kind,
          participant: participant?.identity || participant?.name || participant?.sid,
        });
        remoteLivekitTracksRef.current.add(track);
        attachTrackToElements(track);
        if (track.kind === "audio") setRemoteMuted(false);
      });
      room.on(RoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
        if (livekitDisconnectingRef.current) return;
        if (livekitRoomRef.current !== room) return;
        if (participant && !room.remoteParticipants.has(participant.sid)) return;
        try {
          track.detach?.();
        } catch {
          // Non-blocking detach.
        }
        remoteLivekitTracksRef.current.delete(track);
        logCall("info", "Track unsubscribed", {
          kind: track.kind,
          participant: participant?.identity || participant?.name || participant?.sid,
        });
        if (track.kind === "video") {
          setRemoteVideoActive(false);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        }
        if (track.kind === "audio") {
          setRemoteMuted(true);
          if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
        }
      });
      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        logCall(state === "disconnected" ? "warn" : "info", `LiveKit connection state: ${state}`);
        if (state === "connected") {
          livekitReconnectAttemptsRef.current = 0;
          clearLivekitReconnectTimer();
          clearLivekitConnectWatchdog();
          startLivekitDiagnosticsPolling(room);
          markNetworkGood("LiveKit room connected.");
          setStatus("Call connected");
          setCallState("connected");
          if (pendingVideoUpgradeRef.current && !localVideoTrackRef.current) {
            pendingVideoUpgradeRef.current = false;
            setStatus("Call connected. Upgrading to video...");
            upgradeLivekitToVideo().catch((error) => {
              setStatus(error?.message || "Video upgrade failed. Staying on audio.");
            });
          }
        } else if (state === "reconnecting") {
          startLivekitDiagnosticsPolling(room);
          markNetworkReconnecting("LiveKit reconnecting...");
          setStatus("Reconnecting...");
        } else if (state === "disconnected" && !livekitDisconnectingRef.current) {
          markNetworkSlow("LiveKit disconnected.");
          setStatus("Reconnecting...");
          clearLivekitConnectWatchdog();
          void handleLivekitFallback(
            new Error("LiveKit connection was disconnected."),
            {
              currentMode: livekitAttemptRef.current.mode,
              forceRelay: livekitAttemptRef.current.forceRelay,
              phase: "state-disconnected"
            }
          ).catch(() => {
            queueLivekitReconnect(room);
          });
        }
      });
      room.on(RoomEvent.ParticipantConnected, (participant) => {
        logCall("info", "Participant joined", participant?.identity || participant?.name || participant?.sid);
      });
      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        logCall("warn", "Participant left", participant?.identity || participant?.name || participant?.sid);
      });
      room.engine?.on?.(EngineEvent.TransportsCreated, () => {
        logCall("info", "LiveKit transports created");
        startLivekitDiagnosticsPolling(room);
      });
      room.localParticipant?.on?.("connectionQualityChanged", (quality) => {
        const level = Number(quality ?? 0);
        if (level <= 1) {
          markNetworkSlow("Connection unstable detected.");
          logCall("warn", "Connection quality degraded", quality);
        } else if (level >= 3) {
          markNetworkGood("Network quality is stable.");
        }
      });

      try {
        await room.connect(
          effectiveAuth.url || env.livekitUrl,
          effectiveAuth.token,
          buildLivekitConnectOptions({
            websocketTimeoutMs: LIVEKIT_WEBSOCKET_TIMEOUT_MS,
            peerConnectionTimeoutMs: LIVEKIT_PEER_CONNECT_TIMEOUT_MS
          })
        );
        logCall("info", "Connected to room", effectiveAuth?.roomName);
      } catch (error) {
        logCall("error", "LiveKit room connection failed", error?.message || error);
        if (retryOnAuthError) {
          const freshAuth = await fetchLivekitToken();
          disconnectLivekitRoom();
          livekitConnectingRef.current = false;
          return connectLivekitRoom({
            video: shouldPublishVideo,
            auth: freshAuth,
            retryOnAuthError: false,
            forceRelay,
            source
          });
        }
        return handleLivekitFallback(error, {
          currentMode: shouldPublishVideo ? CALL_MEDIA_MODE.VIDEO : CALL_MEDIA_MODE.AUDIO,
          forceRelay,
          phase: "connect-error"
        });
      }

      if (shouldPublishAudio) {
        const audioTracks = await createLocalTracks({
          audio: true,
          video: false
        });
        const localAudioTrack = audioTracks.find((track) => track.kind === "audio");
        if (!localAudioTrack) {
          throw new Error("Microphone track failed to initialize.");
        }
        await room.localParticipant.publishTrack(localAudioTrack);
        logCall("info", "Local audio track published");
        localAudioTrackRef.current = localAudioTrack;
        if (muted) {
          localAudioTrackRef.current.mute();
        } else {
          localAudioTrackRef.current.unmute?.();
        }
        setLocalMicEnabled(!muted);
      } else {
        setLocalMicEnabled(false);
      }

      if (shouldPublishVideo) {
        await publishLivekitLocalVideoTrack({
          createLocalTracks,
          room,
          lowBandwidth: autoLowBandwidthActive
        });
        logCall("info", "Local video track published");
      }

      const localTracks = [localAudioTrackRef.current, localVideoTrackRef.current]
        .map((track) => track?.mediaStreamTrack)
        .filter(Boolean);
      localStreamRef.current = new MediaStream(localTracks);
      if (localVideoRef.current && localVideoTrackRef.current?.mediaStreamTrack) {
        localVideoRef.current.srcObject = new MediaStream([localVideoTrackRef.current.mediaStreamTrack]);
        localVideoRef.current.muted = true;
        localVideoRef.current.play().catch(() => {});
      }
      setCameraOn(Boolean(shouldPublishVideo));
      return true;
    } finally {
      livekitConnectingRef.current = false;
    }
  }

  function disconnectLivekitRoom() {
    livekitDisconnectingRef.current = true;
    livekitConnectingRef.current = false;
    clearLivekitReconnectTimer();
    clearLivekitConnectWatchdog();
    livekitReconnectAttemptsRef.current = 0;
    try {
      if (localAudioTrackRef.current) localAudioTrackRef.current.stop();
      if (localVideoTrackRef.current) localVideoTrackRef.current.stop();
      localAudioTrackRef.current = null;
      localVideoTrackRef.current = null;
      if (livekitRoomRef.current) {
        livekitRoomRef.current.removeAllListeners?.();
        livekitRoomRef.current.disconnect();
      }
      for (const track of remoteLivekitTracksRef.current) {
        try {
          track.detach?.();
        } catch {
          // Non-blocking detach.
        }
      }
      remoteLivekitTracksRef.current.clear();
    } catch {
      // Non-blocking cleanup.
    } finally {
      logCall("info", "Call ended");
      livekitRoomRef.current = null;
      livekitDisconnectingRef.current = false;
      livekitDiagnosticsSnapshotRef.current = {
        publisherConnectionState: "",
        publisherIceConnectionState: "",
        subscriberConnectionState: "",
        subscriberIceConnectionState: "",
        localCandidateType: "",
        remoteCandidateType: ""
      };
    }
    detachRemoteTracks();
  }

  useEffect(() => {
    if (!legacyWebrtcEnabled || !joined || !canStartCall) return;
    try {
      ensurePeer();
    } catch {
      // Keep call start flow on-demand if eager init fails.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined, canStartCall, sessionId, legacyWebrtcEnabled]);

  function clearOfferRetryTimer() {
    if (retryOfferTimerRef.current) {
      clearTimeout(retryOfferTimerRef.current);
      retryOfferTimerRef.current = null;
    }
  }

  function scheduleOfferRetry() {
    clearOfferRetryTimer();
    retryOfferTimerRef.current = setTimeout(() => {
      if (callStateRef.current !== "ringing") return;
      if (!lastOfferRef.current || !socketRef.current) return;
      if (offerRetryCountRef.current >= CALL_RETRY_LIMIT) {
        setStatus("Connection unstable. Keep this page open while we continue trying.");
        markNetworkSlow("Signaling is delayed. Keeping call setup in progress.");
        return;
      }
      offerRetryCountRef.current += 1;
      socketRef.current.emit("webrtc.offer", {
        sessionId,
        sdp: lastOfferRef.current,
        retryAttempt: offerRetryCountRef.current
      });
      markNetworkSlow("Retrying call request due to network delay.");
      setStatus(`Connection unstable. Retrying call request (${offerRetryCountRef.current}/${CALL_RETRY_LIMIT})...`);
      scheduleOfferRetry();
    }, CALL_RETRY_DELAY_MS);
  }

  async function attachLocalStream({ video }) {
    if (featureError) {
      throw new Error(featureError);
    }
    if (localStreamRef.current) {
      const wantedVideo = Boolean(video);
      const hasVideo = localStreamRef.current.getVideoTracks().length > 0;
      if (hasVideo === wantedVideo) return localStreamRef.current;
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    const wantsVideo = Boolean(video);
    const videoConstraints = wantsVideo
      ? autoLowBandwidthActive
        ? {
            width: { ideal: 480, max: 640 },
            height: { ideal: 270, max: 360 },
            frameRate: { ideal: 12, max: 15 },
            facingMode: "user"
          }
        : isMobileWebView
          ? {
              width: { ideal: 640, max: 960 },
              height: { ideal: 360, max: 540 },
              frameRate: { ideal: 15, max: 20 },
              facingMode: "user"
            }
          : {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              frameRate: { ideal: 24, max: 30 },
              facingMode: "user"
            }
      : false;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: videoConstraints
      });
    } catch (error) {
      if (error?.name === "NotAllowedError") {
        throw new Error(
          "Camera/microphone permission denied. Allow access in your browser settings and try again."
        );
      }
      if (error?.name === "NotFoundError") {
        throw new Error("No microphone/camera device found on this device.");
      }
      throw error;
    }
    localStreamRef.current = stream;
    setLocalMicEnabled(true);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(() => {});
    }
    const pc = ensurePeer();
    const senders = pc.getSenders();
    senders.forEach((sender) => {
      if (sender.track) pc.removeTrack(sender);
    });
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    setCameraOn(Boolean(videoConstraints));
    setCallState("ready");
    return stream;
  }

  async function startCall({ video, restart = false, forceRelay = false, requestVideoUpgrade = false }) {
    try {
      setStatus("");
      if (!restart) {
        setCallLaunchStage("preparing");
        setCallLaunchStartedAt(Date.now());
      }
      forceRelayRef.current = Boolean(forceRelay);
      pendingVideoUpgradeRef.current = Boolean(requestVideoUpgrade);
      offerRetryCountRef.current = 0;
      clearOfferRetryTimer();
      if (featureError) {
        setStatus(featureError);
        setCallLaunchStage("idle");
        setCallLaunchStartedAt(null);
        return;
      }
      if (!joined) {
        setStatus("Joining session room...");
        setCallLaunchStage("waiting");
        pendingStartCallRef.current = { video };
        return;
      }
      pendingStartCallRef.current = null;
      startInviteRetryLoop(Boolean(video));
      await attachLocalStream({ video });
      setCallLaunchStage("signaling");
      const pc = ensurePeer();
      isMakingOfferRef.current = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current?.emit("webrtc.offer", {
        sessionId,
        sdp: offer
      });
      lastOfferRef.current = offer;
      setCallState("ringing");
      setCallLaunchStage("ringing");
      scheduleOfferRetry();
    } catch (error) {
      setStatus(error?.message ?? "Unable to start call");
      setCallLaunchStage("idle");
      setCallLaunchStartedAt(null);
      pendingStartCallRef.current = null;
    } finally {
      isMakingOfferRef.current = false;
    }
  }

  async function upgradeCallToVideo() {
    if (!joined || !socketRef.current) return;
    await attachLocalStream({ video: true });
    const pc = ensurePeer();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current.emit("webrtc.offer", {
      sessionId,
      sdp: offer
    });
  }

  function startLivekitCall(requestVideo) {
    if (!joined) {
      pendingLivekitStartRef.current = { requestVideo: Boolean(requestVideo) };
      setCallLaunchStage("waiting");
      setStatus("Joining session room before sending call request...");
      return;
    }
    pendingLivekitStartRef.current = null;
    (async () => {
      try {
        resetFallbackState();
        setStatus("");
        setCallLaunchStage("preparing");
        setCallLaunchStartedAt(Date.now());
        setCallState("ringing");
        const visitorIdentity = getVisitorIdentity();
        callVisitorIdRef.current = visitorIdentity;
        const startResponse = await apiRequest("/calls/start", {
          method: "POST",
          body: JSON.stringify({
            sessionId,
            visitorId: visitorIdentity,
            visitorName: participantType === "visitor" ? displayName : undefined,
            hasVideo: Boolean(requestVideo),
            visitorToken: participantType === "visitor" ? (getVisitorSessionToken(sessionId) || undefined) : undefined
          })
        });
        const startedCall = startResponse?.data ?? startResponse;
        const callSessionId = startedCall?.callSessionId;
          if (!callSessionId) {
            throw new Error("Unable to initialize call session.");
          }
          callSessionRef.current = callSessionId;
          pendingHomeownerVideoRef.current = Boolean(requestVideo);
          startInviteRetryLoop(Boolean(requestVideo));
          setStatus("Call request sent. Waiting for participant to accept.");
          try {
            await startLocalPreview({ video: Boolean(requestVideo) });
          } catch {
            setStatus("Unable to open camera preview. Waiting for participant to accept.");
          }
          setCallLaunchStage("ringing");
        } catch (error) {
        setStatus(error?.message || "Unable to start LiveKit call");
        setCallState("failed");
        setCallLaunchStage("idle");
        setCallLaunchStartedAt(null);
        if (callSessionRef.current) {
          try {
            await apiRequest("/calls/end", {
              method: "POST",
              body: JSON.stringify({
                callSessionId: callSessionRef.current,
                participantType,
                visitorId: participantType === "visitor" ? getVisitorIdentity() : undefined,
                visitorToken: participantType === "visitor" ? (getVisitorSessionToken(sessionId) || undefined) : undefined
              })
            });
          } catch {
            // Non-blocking cleanup.
          }
        }
        disconnectLivekitRoom();
        callSessionRef.current = "";
        callVisitorIdRef.current = "";
        if (legacyWebrtcEnabled) {
          setStatus(`${error?.message || "Unable to start LiveKit call"} Falling back to WebRTC...`);
          startCall({ video: Boolean(requestVideo) });
        }
      }
    })();
  }

    function startAudioCall() {
      if (!canStartCall) {
        setStatus("Wait for the caller to start the session.");
        return;
      }
      pendingHomeownerVideoRef.current = false;
      if (legacyWebrtcEnabled) {
        startCall({ video: false });
        return;
      }
    if (!livekitEnabled) {
      setStatus("Call service is unavailable. LiveKit URL is not configured.");
      return;
    }
    forceRelayRef.current = false;
    pendingVideoUpgradeRef.current = false;
    startLivekitCall(false);
  }

    function startVideoCall() {
      if (!canStartCall) {
        setStatus("Wait for the caller to start the session.");
        return;
      }
      if (legacyWebrtcEnabled) {
        const requestVideo = !lowBandwidthMode;
        pendingHomeownerVideoRef.current = requestVideo;
        startCall({ video: requestVideo });
        return;
      }
      if (!livekitEnabled) {
        setStatus("Call service is unavailable. LiveKit URL is not configured.");
        return;
      }
      const startWithVideo = !lowBandwidthMode;
      forceRelayRef.current = false;
      pendingVideoUpgradeRef.current = !startWithVideo;
      pendingHomeownerVideoRef.current = startWithVideo;
      if (!startWithVideo) {
        setStatus("Weak network detected. Starting audio first, video will connect after stabilization.");
      }
      startLivekitCall(startWithVideo);
    }

  function retryCallConnection() {
    if (!canStartCall) {
      setStatus("Reconnect from the caller side or re-open session.");
      return;
    }
    if (legacyWebrtcEnabled) {
      setStatus("Retrying call connection...");
      startCall({ video: false, restart: true, forceRelay: true });
      return;
    }
    if (!livekitEnabled) {
      setStatus("Call service is unavailable. LiveKit URL is not configured.");
      return;
    }
    disconnectLivekitRoom();
    setStatus("Retrying call connection...");
    startAudioCall();
  }

  async function acceptIncomingCall(snapshotOverride = null) {
    const incomingSnapshot =
      snapshotOverride && typeof snapshotOverride === "object"
        ? snapshotOverride
        : incomingCall;
    if (!incomingSnapshot?.pending) return;
    if (acceptingCallRef.current) return;
    acceptingCallRef.current = true;
    clearIncomingCall();
    setCallState("connecting");
    if (legacyWebrtcEnabled) {
      const pendingOffer = pendingOfferRef.current;
      if (!pendingOffer?.sdp) {
        setStatus("Incoming call data is no longer available. Ask homeowner to call again.");
        setCallState("idle");
        acceptingCallRef.current = false;
        return;
      }
      try {
        setStatus("");
        const wantsVideo =
          typeof pendingOffer?.sdp?.sdp === "string" &&
          pendingOffer.sdp.sdp.includes("m=video");
        const allowVideo = wantsVideo && !lowBandwidthMode;
        if (wantsVideo && !allowVideo) {
          setStatus("Low bandwidth mode enabled. Joining with audio-only.");
          const modalKey = `${sessionId}:${incomingSnapshot.callSessionId || "legacy"}`;
          showAudioOnlyModal(modalKey);
        }
        setAcceptedCallMode(allowVideo ? "video" : "audio");
        const joinedAt = Date.now();
        await attachLocalStream({ video: allowVideo });
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((track) => {
            track.enabled = true;
          });
        }
        setMuted(false);
        await applyRemoteDescriptionAndDrain(pendingOffer.sdp);
        const pc = ensurePeer();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current?.emit("webrtc.answer", { sessionId, sdp: answer });
        socketRef.current?.emit("call.accepted", {
          sessionId,
          hasVideo: allowVideo,
          joinedAt
        });
        setCallConnectedAt(joinedAt);
        setCallState("connected");
        setCallLaunchStage("idle");
        setCallLaunchStartedAt(null);
        if (participantType === "visitor") {
          grantSessionCallAccess(sessionId, "connected");
        }
        saveCallAcceptIntent({
          sessionId,
          hasVideo: allowVideo,
          callSessionId: incomingSnapshot.callSessionId || "",
          visitorId: incomingSnapshot.visitorId || "",
        });
        pendingOfferRef.current = null;
      } catch (error) {
        setStatus(error?.message ?? "Failed to accept incoming call");
        setCallState("incoming");
        setIncomingCall({
          pending: true,
          hasVideo: incomingSnapshot.hasVideo,
          callSessionId: incomingSnapshot.callSessionId || "",
          visitorId: incomingSnapshot.visitorId || ""
        });
      }
      acceptingCallRef.current = false;
      return;
    }
    if (!livekitEnabled) {
      setStatus("Call service is unavailable. LiveKit URL is not configured.");
      setCallState("idle");
      acceptingCallRef.current = false;
      return;
    }
    try {
      resetFallbackState();
      setStatus("");
      const allowVideo = incomingSnapshot.hasVideo && !lowBandwidthMode;
      pendingVideoUpgradeRef.current = Boolean(incomingSnapshot.hasVideo) && !allowVideo;
      if (incomingSnapshot.hasVideo && !allowVideo) {
        setStatus("Weak network detected. Joining audio first, then upgrading to video.");
        const modalKey = `${sessionId}:${incomingSnapshot.callSessionId || "legacy"}`;
        showAudioOnlyModal(modalKey);
      }
      setAcceptedCallMode(allowVideo ? "video" : "audio");
      const callSessionId = incomingSnapshot.callSessionId;
      if (!callSessionId) {
        throw new Error("Call session was not provided.");
      }
      callSessionRef.current = callSessionId;
      const joinedAt = Date.now();
      const auth = await apiRequest("/calls/join", {
        method: "POST",
        body: JSON.stringify({
          callSessionId,
          participantType,
          visitorId: participantType === "visitor" ? incomingSnapshot.visitorId || getVisitorIdentity() : undefined
        })
      });
      socketRef.current?.emit("call.accepted", {
        sessionId,
        hasVideo: allowVideo,
        joinedAt
      });
      setCallConnectedAt(joinedAt);
      setCallState("connecting");
      const connected = await connectLivekitRoom({
        video: allowVideo,
        auth: auth?.data ?? auth
      });
      if (!connected) {
        acceptingCallRef.current = false;
        return;
      }
      setCallState("connected");
      setCallLaunchStage("idle");
      setCallLaunchStartedAt(null);
      setMuted(false);
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.unmute?.();
      }
      if (participantType === "visitor") {
        grantSessionCallAccess(sessionId, "connected");
      }
      saveCallAcceptIntent({
        sessionId,
        hasVideo: allowVideo,
        callSessionId,
        visitorId: participantType === "visitor" ? incomingSnapshot.visitorId || getVisitorIdentity() : "",
      });
      pendingOfferRef.current = null;
      acceptingCallRef.current = false;
    } catch (error) {
      setStatus(error?.message ?? "Failed to accept incoming call");
      disconnectLivekitRoom();
      callSessionRef.current = "";
      callVisitorIdRef.current = "";
      setCallState("incoming");
      setIncomingCall({
        pending: true,
        hasVideo: incomingSnapshot.hasVideo,
        callSessionId: incomingSnapshot.callSessionId || "",
        visitorId: incomingSnapshot.visitorId || ""
      });
      acceptingCallRef.current = false;
    }
  }

  async function rejectIncomingCall() {
    if (!incomingCall.pending) return;
    if (legacyWebrtcEnabled) {
      socketRef.current?.emit("session.control", {
        sessionId,
        action: "call_rejected"
      });
      setStatus("Incoming call rejected");
      setCallState("idle");
      setCallLaunchStage("idle");
      setCallLaunchStartedAt(null);
      setCallConnectedAt(null);
      setAcceptedCallMode("");
      clearCallAcceptIntent();
      clearIncomingCall();
      pendingOfferRef.current = null;
      pendingVideoUpgradeRef.current = false;
      clearSessionCallAccess(sessionId);
      resetFallbackState();
      return;
    }
    if (!livekitEnabled) {
      setStatus("Call service is unavailable. LiveKit URL is not configured.");
      setCallState("idle");
      clearIncomingCall();
      clearCallAcceptIntent();
      clearSessionCallAccess(sessionId);
      return;
    }
    if (incomingCall.callSessionId) {
      try {
        await apiRequest("/calls/end", {
          method: "POST",
          body: JSON.stringify({
            callSessionId: incomingCall.callSessionId,
            participantType,
            visitorId: participantType === "visitor" ? incomingCall.visitorId || getVisitorIdentity() : undefined,
            visitorToken: participantType === "visitor" ? (getVisitorSessionToken(sessionId) || undefined) : undefined
          })
        });
      } catch {
        // Non-blocking cleanup.
      }
    }
    socketRef.current?.emit("call.rejected", {
      sessionId
    });
    setStatus("Incoming call rejected");
    setCallState("idle");
    setCallLaunchStage("idle");
    setCallLaunchStartedAt(null);
    setCallConnectedAt(null);
    setAcceptedCallMode("");
    clearCallAcceptIntent();
    clearIncomingCall();
    pendingOfferRef.current = null;
    pendingVideoUpgradeRef.current = false;
    callSessionRef.current = "";
    callVisitorIdRef.current = "";
    clearSessionCallAccess(sessionId);
  }

  async function applyRemoteDescriptionAndDrain(desc) {
    const pc = ensurePeer();
    await pc.setRemoteDescription(new RTCSessionDescription(desc));
    for (const candidate of pendingRemoteCandidates.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    }
    pendingRemoteCandidates.current = [];
  }

  function sendMessage(text, options = {}) {
    const body = (text || "").trim();
    if (!body || !socketRef.current || !joined) return false;
    const clientId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    pendingLocalMessageIdsRef.current.add(clientId);
    setMessages((prev) => {
      const nextMessage = normalizeMessage({
        id: clientId,
        clientId,
        text: body,
        displayName,
        senderType: user?.role || "visitor",
        at: new Date().toISOString(),
        persisted: false
      });
      if (options.replaceMessageId) {
        return prev.map((item) => (item.id === options.replaceMessageId ? nextMessage : item));
      }
      return [...prev, nextMessage];
    });
    socketRef.current.emit("chat.message", {
      sessionId,
      text: body,
      displayName,
      senderType: user?.role || "visitor",
      clientId,
      visitorToken: getVisitorSessionToken(sessionId) || undefined
    });
    return true;
  }

  function retryFailedMessage(messageId) {
    const target = messages.find((item) => item.id === messageId);
    if (!target?.mine || !target?.failed) return false;
    return sendMessage(target.text, { replaceMessageId: messageId });
  }

  function toggleMute() {
    if (livekitEnabled && localAudioTrackRef.current) {
      const nextMuted = !muted;
      if (nextMuted) {
        localAudioTrackRef.current.mute();
      } else {
        localAudioTrackRef.current.unmute();
      }
      setMuted(nextMuted);
      setLocalMicEnabled(!nextMuted);
      socketRef.current?.emit("session.control", {
        sessionId,
        action: nextMuted ? "mute" : "unmute"
      });
      return;
    }
    if (!localStreamRef.current) return;
    const nextMuted = !muted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
    setLocalMicEnabled(!nextMuted);
    socketRef.current?.emit("session.control", {
      sessionId,
      action: nextMuted ? "mute" : "unmute"
    });
  }

  function toggleSpeaker() {
    setSpeakerOn((prev) => !prev);
  }

  function toggleCamera() {
    if (livekitEnabled && localVideoTrackRef.current) {
      const nextCameraOn = !cameraOn;
      if (nextCameraOn) {
        localVideoTrackRef.current.unmute?.();
      } else {
        localVideoTrackRef.current.mute?.();
      }
      setCameraOn(nextCameraOn);
      return;
    }
    if (!localStreamRef.current) return;
    const videoTracks = localStreamRef.current.getVideoTracks();
    if (videoTracks.length === 0) return;
    const nextCameraOn = !cameraOn;
    videoTracks.forEach((track) => {
      track.enabled = nextCameraOn;
    });
    setCameraOn(nextCameraOn);
  }

  async function switchCamera() {
    const nextFacing = cameraFacing === "user" ? "environment" : "user";
    if (livekitEnabled && localVideoTrackRef.current?.mediaStreamTrack) {
      try {
        await localVideoTrackRef.current.mediaStreamTrack.applyConstraints({
          facingMode: nextFacing
        });
        setCameraFacing(nextFacing);
      } catch {
        // Keep current facing mode if browser/device does not support switch.
      }
      return;
    }
    const stream = localStreamRef.current;
    const track = stream?.getVideoTracks?.()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ facingMode: nextFacing });
      setCameraFacing(nextFacing);
    } catch {
      // Keep current facing mode if browser/device does not support switch.
    }
  }

  async function endCall(broadcast = true) {
    clearInviteRetryTimer();
    if (livekitEnabled) {
      if (broadcast && callSessionRef.current) {
        try {
          await apiRequest("/calls/end", {
            method: "POST",
            body: JSON.stringify({
              callSessionId: callSessionRef.current,
              participantType,
              visitorId: participantType === "visitor" ? incomingCall.visitorId || getVisitorIdentity() : undefined,
              visitorToken: participantType === "visitor" ? (getVisitorSessionToken(sessionId) || undefined) : undefined
            })
          });
        } catch {
          // Keep UI responsive on cleanup failure.
        }
      } else if (broadcast) {
        socketRef.current?.emit("call.ended", {
          sessionId
        });
      }
      disconnectLivekitRoom();
      stopDiagnosticsPolling();
      setCallDiagnostics(emptyDiagnostics());
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      setLocalMicEnabled(false);
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      setCallState("ended");
      setCallLaunchStage("idle");
      setCallLaunchStartedAt(null);
      setCallConnectedAt(null);
      setCameraOn(false);
      setMuted(false);
      setRemoteMuted(false);
      setAcceptedCallMode("");
      clearCallAcceptIntent();
      setRemoteVideoActive(false);
      pendingVideoUpgradeRef.current = false;
      connectionRecoveryCountRef.current = 0;
      clearIncomingCall();
      callSessionRef.current = "";
      callVisitorIdRef.current = "";
      pendingOfferRef.current = null;
      clearOfferRetryTimer();
      clearSessionCallAccess(sessionId);
      return;
    }
    if (broadcast) {
      socketRef.current?.emit("session.control", {
        sessionId,
        action: "end"
      });
    }
    if (peerRef.current) {
      peerRef.current.getSenders().forEach((sender) => {
        if (sender.track) sender.track.stop();
      });
      peerRef.current.close();
      peerRef.current = null;
    }
    stopDiagnosticsPolling();
    setCallDiagnostics(emptyDiagnostics());
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalMicEnabled(false);
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    setCallState("ended");
    setCallLaunchStage("idle");
    setCallLaunchStartedAt(null);
    setCallConnectedAt(null);
    setCameraOn(false);
    setMuted(false);
    setRemoteMuted(false);
    setAcceptedCallMode("");
    clearCallAcceptIntent();
    setRemoteVideoActive(false);
    forceRelayRef.current = false;
    pendingVideoUpgradeRef.current = false;
    connectionRecoveryCountRef.current = 0;
    clearIncomingCall();
    callSessionRef.current = "";
    callVisitorIdRef.current = "";
    pendingOfferRef.current = null;
    clearOfferRetryTimer();
    lastOfferRef.current = null;
    offerRetryCountRef.current = 0;
    stopLocalPreview();
    audioOnlyModalShownRef.current = false;
    audioOnlyModalKeyRef.current = "";
    pendingHomeownerVideoRef.current = false;
    clearSessionCallAccess(sessionId);
    resetFallbackState();
  }

  useEffect(() => {
    let active = true;
    const syncHistory = async () => {
      try {
        const rows = await getVisitorSessionMessages(sessionId);
        if (!active) return;
        const normalized = rows.map((row) => normalizeMessage(row));
        setMessages((prev) => mergeMessages(prev, normalized));
      } catch {
        if (active) setStatus((prev) => prev || "Unable to load message history");
      }
    };

    syncHistory();
    const intervalMs = 2500;
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      syncHistory();
    }, intervalMs);

    return () => {
      active = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, connected]);

  useEffect(() => {
    applyAudioOutputPreference();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speakerOn, callState]);

  useEffect(() => {
    clearCallRingTimeout();
    if (!livekitEnabled || !canStartCall || callState !== "ringing" || !callSessionRef.current) {
      return undefined;
    }
    const timeoutMs = getRingTimeoutMs(
      env.callRingTimeoutMs,
      LIVEKIT_DEFAULT_RING_TIMEOUT_MS
    );
    callRingTimeoutRef.current = setTimeout(() => {
      logCall("warn", "Call unanswered before timeout", {
        callSessionId: callSessionRef.current,
        timeoutMs
      });
      setStatus("No answer. Call cancelled.");
      notifyWithCooldown("call_timeout", {
        title: "Call Timeout",
        message: "Nobody answered within 30 seconds.",
        type: "warning",
        route: `/session/${sessionId}/message`
      });
      endCall(true);
    }, timeoutMs);
    return () => clearCallRingTimeout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState, canStartCall, livekitEnabled, sessionId]);

  useEffect(() => {
    const socket = acquireSignalingSocket(sessionId);
    socketRef.current = socket;

    socket.on("connect", () => {
      logCall("info", "Connected to signaling room");
      setConnected(true);
      connectedOnceRef.current = true;
      markNetworkReconnecting("Connected to signaling. Joining session room...");
      const visitorToken = getVisitorSessionToken(sessionId);
      socket.emit("session.join", { sessionId, displayName, visitorToken: visitorToken || undefined });
    });
    socket.on("disconnect", () => {
      logCall("warn", "Disconnected from signaling room");
      setConnected(false);
      setJoined(false);
      markNetworkReconnecting(
        connectedOnceRef.current ? "Connection lost. Reconnecting..." : "Connecting..."
      );
    });
    socket.on("connect_error", (error) => {
      logCall("error", "Socket connection failed", error?.message || error);
      setStatus(error?.message ?? "Socket connection failed");
      markNetworkSlow("Unable to reach signaling server. Retrying...");
      notifyWithCooldown("socket_connect_error", {
        title: "Connection Issue",
        message: "Realtime connection is unstable. Retrying...",
        type: "warning",
        duration: 2800
      });
    });
    socket.on("session.joined", (payload) => {
      if (!payload?.sid) return;
      logCall("info", "Joined session room", payload?.sid);
      setJoined(true);
      setStatus("Session connected");
      markNetworkGood("Session connected.");
      if (livekitEnabled && canStartCall && pendingLivekitStartRef.current) {
        const queued = pendingLivekitStartRef.current;
        pendingLivekitStartRef.current = null;
        setTimeout(() => {
          startLivekitCall(Boolean(queued?.requestVideo));
        }, 0);
      }
      if (legacyWebrtcEnabled && canStartCall && pendingStartCallRef.current) {
        const queued = pendingStartCallRef.current;
        pendingStartCallRef.current = null;
        setTimeout(() => {
          startCall({ video: Boolean(queued?.video) });
        }, 0);
      }
    });
    socket.on("session.participant_joined", async () => {
      logCall("info", "Participant joined session");
      if (canStartCall && callStateRef.current === "ringing") {
        socket.emit("call.invite", {
          sessionId,
          hasVideo: Boolean(lastInviteHasVideoRef.current),
          callSessionId: callSessionRef.current || undefined,
          visitorId: incomingCall.visitorId || undefined
        });
      }
      if (!legacyWebrtcEnabled) return;
      if (isMakingOfferRef.current) return;
      setStatus("Participant joined");
      if (localStreamRef.current && peerRef.current?.signalingState === "stable") {
        try {
          isMakingOfferRef.current = true;
          const offer = await peerRef.current.createOffer();
          await peerRef.current.setLocalDescription(offer);
          socket.emit("webrtc.offer", { sessionId, sdp: offer });
          setCallState("ringing");
        } catch {
        } finally {
          isMakingOfferRef.current = false;
        }
      }
    });
    socket.on("session.participant_left", () => {
      logCall("warn", "Participant left session");
      // Do not auto-end or mark session as left when users navigate across pages.
      // Session should remain active until homeowner explicitly ends it.
      if (callStateRef.current === "connected" || callStateRef.current === "ringing") {
        setStatus("Participant disconnected. Session remains active.");
      }
    });

    socket.on("call.invite", (payload) => {
      if (payload?.sessionId !== sessionId) return;
      if (callStateRef.current === "connecting" || callStateRef.current === "connected") return;
      if (callSessionRef.current && payload?.callSessionId && callSessionRef.current === payload.callSessionId) return;
      const hasVideo = Boolean(payload?.hasVideo);
      logCall("info", "Incoming call invite", payload);
      callVisitorIdRef.current = payload?.visitorId || "";
      playIncomingCallNotificationSound();
      setIncomingCall({
        pending: true,
        hasVideo,
        callSessionId: payload?.callSessionId || "",
        visitorId: payload?.visitorId || getVisitorIdentity()
      });
      setCallState("incoming");
      setStatus(hasVideo ? "Incoming video call" : "Incoming audio call");
      notifyWithCooldown("incoming_call", {
        title: "Incoming Call",
        message: hasVideo ? "Incoming video call is ready." : "Incoming audio call is ready.",
        type: "info",
        duration: 4000,
        route: `/session/${sessionId}/${hasVideo ? "video" : "audio"}`
      });
      if (participantType === "visitor") {
        grantSessionCallAccess(sessionId, "incoming");
      }
    });

    socket.on("call.accepted", (payload) => {
      if (payload?.sessionId !== sessionId) return;
      if (!canStartCall) return;
      logCall("info", "Call accepted", payload);
      clearInviteRetryTimer();
      setCallLaunchStage("idle");
      setCallLaunchStartedAt(null);
      setStatus("Participant joined the call.");
      markNetworkGood("Call connected.");
      if (payload?.joinedAt) {
        setCallConnectedAt(payload.joinedAt);
      } else {
        setCallConnectedAt(Date.now());
      }
      if (livekitEnabled) {
        const allowVideo = Boolean(pendingHomeownerVideoRef.current) && payload?.hasVideo !== false;
        setCallState("connecting");
        setStatus("Participant joined. Connecting call...");
        stopLocalPreview();
        connectLivekitRoom({ video: allowVideo }).then((connected) => {
          if (connected === false) return;
        }).catch((error) => {
          setStatus(error?.message || "Unable to connect call");
          setCallState("failed");
        });
        return;
      }
      setCallState("connected");
    });

    socket.on("call.rejected", (payload) => {
      if (payload?.sessionId !== sessionId) return;
      logCall("warn", "Call rejected", payload);
      clearInviteRetryTimer();
      setStatus("Call rejected");
      notifyWithCooldown("call_rejected", {
        title: "Call Rejected",
        message: "The participant rejected the call request.",
        type: "warning",
        route: `/session/${sessionId}/message`
      });
      endCall(false);
    });

    socket.on("call.ended", (payload) => {
      const endedCallSessionId = payload?.callSessionId || "";
      if (payload?.sessionId !== sessionId && (!endedCallSessionId || endedCallSessionId !== callSessionRef.current)) {
        return;
      }
      logCall("warn", "Call ended", payload);
      clearInviteRetryTimer();
      setStatus("Call ended by participant");
      notifyWithCooldown("call_ended", {
        title: "Call Ended",
        message: "The participant ended the call.",
        type: "warning",
        route: `/session/${sessionId}/message`
      });
      endCall(false);
    });

    socket.on("webrtc.offer", async (payload) => {
      if (!legacyWebrtcEnabled) return;
      if (payload?.sessionId !== sessionId) return;
      playIncomingCallNotificationSound();
      try {
        const wantsVideo =
          typeof payload?.sdp?.sdp === "string" && payload.sdp.sdp.includes("m=video");
        if (!canStartCall) {
          pendingOfferRef.current = payload;
          setIncomingCall({
            pending: true,
            hasVideo: wantsVideo,
            callSessionId: "",
            visitorId: getVisitorIdentity()
          });
          setCallState("incoming");
          setStatus(wantsVideo ? "Incoming video call" : "Incoming audio call");
          notifyWithCooldown("incoming_call", {
            title: "Incoming Call",
            message: wantsVideo ? "Incoming video call is ready." : "Incoming audio call is ready.",
            type: "info",
            duration: 4000,
            route: `/session/${sessionId}/${wantsVideo ? "video" : "audio"}`
          });
          if (participantType === "visitor") {
            grantSessionCallAccess(sessionId, "incoming");
          }
          return;
        }
        const allowVideo = wantsVideo && !lowBandwidthMode;
        if (wantsVideo && !allowVideo) {
          setStatus("Low bandwidth mode enabled. Joining with audio-only.");
        }
        await attachLocalStream({ video: allowVideo });
        await applyRemoteDescriptionAndDrain(payload.sdp);
        const pc = ensurePeer();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc.answer", { sessionId, sdp: answer });
        setCallState("connected");
        setCallLaunchStage("idle");
        setCallLaunchStartedAt(null);
      } catch (error) {
        setStatus(error?.message ?? "Failed to handle incoming call");
      }
    });

    socket.on("webrtc.answer", async (payload) => {
      if (!legacyWebrtcEnabled) return;
      if (payload?.sessionId !== sessionId) return;
      try {
        await applyRemoteDescriptionAndDrain(payload.sdp);
        setCallState("connected");
        setCallLaunchStage("idle");
        setCallLaunchStartedAt(null);
        clearOfferRetryTimer();
        lastOfferRef.current = null;
        offerRetryCountRef.current = 0;
        markNetworkGood("Call connected.");
      } catch (error) {
        setStatus(error?.message ?? "Failed to establish call");
        markNetworkSlow("Call signaling is unstable.");
      }
    });

    socket.on("webrtc.ice", async (payload) => {
      if (!legacyWebrtcEnabled) return;
      if (payload?.sessionId !== sessionId) return;
      const candidate = payload?.candidate;
      if (!candidate) return;
      const pc = ensurePeer();
      if (pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {}
      } else {
        pendingRemoteCandidates.current.push(candidate);
      }
    });

    socket.on("chat.message", (payload) => {
      if (payload?.sessionId !== sessionId) return;
      markNetworkGood("Realtime messages synced.");
      const incoming = normalizeMessage(payload);
      if (!incoming.mine) {
        playMessageNotificationSound();
        notifyWithCooldown(
          "incoming_message",
          {
            title: "New Message",
            message: `${incoming.displayName}: ${previewMessageText(incoming.text) || "Sent a message"}`,
            type: "info",
            route: `/session/${sessionId}/message`
          },
          1200
        );
      }
      setMessages((prev) => {
        const clientId = payload?.clientId;
        if (clientId && pendingLocalMessageIdsRef.current.has(clientId)) {
          pendingLocalMessageIdsRef.current.delete(clientId);
          return prev.map((item) =>
            item.id === clientId
              ? {
                  ...incoming,
                  id: incoming.id || clientId,
                  failed: false,
                  persistError: ""
                }
              : item
          );
        }
        if (incoming.id && prev.some((item) => item.id && item.id === incoming.id)) {
          return prev;
        }
        if (prev.some((item) => isLikelyDuplicateMessage(item, incoming))) {
          return prev;
        }
        if (incoming.mine) {
          const incomingTs = Date.parse(incoming.at || "");
          const optimisticIndex = prev.findIndex((item) => {
            if (!String(item.id ?? "").startsWith("local-")) return false;
            if ((item.text || "").trim() !== (incoming.text || "").trim()) return false;
            const localTs = Date.parse(item.at || "");
            if (Number.isNaN(localTs) || Number.isNaN(incomingTs)) return false;
            return Math.abs(incomingTs - localTs) < 15000;
          });
          if (optimisticIndex >= 0) {
            return prev.map((item, idx) =>
              idx === optimisticIndex
                ? {
                    ...incoming,
                    id: incoming.id || item.id
                  }
                : item
            );
          }
        }
        return [...prev, incoming];
      });
    });

    socket.on("chat.persisted", (payload) => {
      if (payload?.sessionId !== sessionId) return;
      const messageId = payload?.id;
      const clientId = payload?.clientId;
      setMessages((prev) =>
        prev.map((item) => {
          const matchesById = messageId && item.id === messageId;
          const matchesByClientId = clientId && (item.id === clientId || item.clientId === clientId);
          if (!matchesById && !matchesByClientId) return item;
          return {
            ...item,
            id: messageId || item.id,
            clientId: clientId || item.clientId || null,
            persisted: true,
            failed: false,
            persistError: ""
          };
        })
      );
    });

    socket.on("chat.persist_failed", (payload) => {
      if (payload?.sessionId !== sessionId) return;
      const messageId = payload?.id;
      const clientId = payload?.clientId;
      const error = payload?.error || "Failed to save message";
      setMessages((prev) =>
        prev.map((item) => {
          const matchesById = messageId && item.id === messageId;
          const matchesByClientId = clientId && (item.id === clientId || item.clientId === clientId);
          if (!matchesById && !matchesByClientId) return item;
          return {
            ...item,
            id: messageId || item.id,
            clientId: clientId || item.clientId || null,
            persisted: false,
            failed: true,
            persistError: error
          };
        })
      );
      setStatus("A message was delivered but not saved. Retry to persist.");
      notifyWithCooldown("message_not_saved", {
        title: "Message Not Saved",
        message: "Delivered in realtime, but storage failed. Tap Retry.",
        type: "warning",
        duration: 4200,
        route: `/session/${sessionId}/message`
      });
    });

    socket.on("session.control", (payload) => {
      if (payload?.sessionId !== sessionId) return;
      const action = payload?.action;
      if (action === "mute") {
        setRemoteMuted(true);
        setStatus("Other participant muted microphone");
      }
      if (action === "unmute") {
        setRemoteMuted(false);
        setStatus("Other participant unmuted microphone");
      }
      if (action === "end") {
        setStatus("Call ended by participant");
        notifyWithCooldown("call_ended", {
          title: "Call Ended",
          message: "The participant ended the call.",
          type: "warning",
          route: `/session/${sessionId}/message`
        });
        endCall(false);
      }
      if (action === "call_rejected") {
        setStatus("Call rejected by visitor");
        notifyWithCooldown("call_rejected", {
          title: "Call Rejected",
          message: "The visitor rejected the call request.",
          type: "warning",
          route: `/session/${sessionId}/message`
        });
        endCall(false);
      }
    });

    const manager = socket.io;
    const onReconnectAttempt = () => {
      markNetworkReconnecting("Reconnecting to signaling...");
    };
    const onReconnect = () => {
      markNetworkGood("Reconnected.");
    };
    const onReconnectError = () => {
      markNetworkSlow("Reconnect attempt failed. Retrying...");
    };
    const onReconnectFailed = () => {
      markNetworkSlow("Could not reconnect automatically.");
    };
    manager.on("reconnect_attempt", onReconnectAttempt);
    manager.on("reconnect", onReconnect);
    manager.on("reconnect_error", onReconnectError);
    manager.on("reconnect_failed", onReconnectFailed);

    return () => {
      clearOfferRetryTimer();
      stopDiagnosticsPolling();
      disconnectLivekitRoom();
      callSessionRef.current = "";
      callVisitorIdRef.current = "";
      pendingStartCallRef.current = null;
      pendingLivekitStartRef.current = null;
      clearInviteRetryTimer();
      manager.off("reconnect_attempt", onReconnectAttempt);
      manager.off("reconnect", onReconnect);
      manager.off("reconnect_error", onReconnectError);
      manager.off("reconnect_failed", onReconnectFailed);
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("session.joined");
      socket.off("session.participant_joined");
      socket.off("session.participant_left");
      socket.off("call.invite");
      socket.off("call.accepted");
      socket.off("call.rejected");
      socket.off("call.ended");
      socket.off("webrtc.offer");
      socket.off("webrtc.answer");
      socket.off("webrtc.ice");
      socket.off("chat.message");
      socket.off("session.control");
      socket.off("chat.persisted");
      socket.off("chat.persist_failed");
      releaseSignalingSocket(sessionId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, displayName, token, canStartCall, lowBandwidthMode]);

  useEffect(() => {
    if (canStartCall) return;
    const intent = consumeCallAcceptIntent();
    if (!intent) return;
    setIncomingCall(intent);
    setTimeout(() => {
      acceptIncomingCall(intent);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, canStartCall]);

  useEffect(() => {
    if (!canStartCall) return;
    const intent = consumeCallStartIntent();
    if (!intent?.pending) return;
    setTimeout(() => {
      if (intent.mode === "video") {
        startVideoCall();
        return;
      }
      startAudioCall();
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, canStartCall]);

  return {
    connected,
    joined,
    callState,
    muted,
    speakerOn,
    cameraOn,
    cameraFacing,
    messages,
    status,
    networkQuality,
    networkDetail,
    callLaunchStage,
    callLaunchStartedAt,
    callConnectedAt,
    featureError,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    localStreamRef,
    remoteMuted,
    audioPlaybackBlocked,
    localMicEnabled,
    callDiagnostics,
    incomingCall,
    acceptedCallMode,
    remoteVideoActive,
    lowBandwidthMode,
    autoLowBandwidthActive,
    isMobileWebView,
    setLowBandwidthMode,
    canStartCall,
    callLogs,
    sendMessage,
    retryFailedMessage,
    toggleMute,
    toggleSpeaker,
    toggleCamera,
    switchCamera,
    endCall,
    startAudioCall,
    startVideoCall,
    retryCallConnection,
    acceptIncomingCall,
    rejectIncomingCall,
    retryAudioPlayback
  };
}

function previewMessageText(text) {
  if (typeof text !== "string") return "";
  if (text.startsWith("voice_note_url:")) return "Voice note";
  if (text.startsWith("voice_note:")) return "Voice note";
  return text;
}
