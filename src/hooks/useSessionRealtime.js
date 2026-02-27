import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { env } from "../config/env";
import { getVisitorSessionMessages } from "../services/homeownerService";
import {
  clearSessionCallAccess,
  grantSessionCallAccess
} from "../services/sessionCallAccess";
import {
  playIncomingCallNotificationSound,
  playMessageNotificationSound
} from "../utils/notificationSound";

const rtcConfig = {
  iceServers: env.webRtcIceServers,
  iceCandidatePoolSize: 8
};

const CALL_RETRY_DELAY_MS = 5000;
const CALL_RETRY_LIMIT = 2;
const LOW_BANDWIDTH_STORAGE_KEY = "qring_low_bandwidth_mode";
const SOCKET_RELEASE_GRACE_MS = 2 * 60 * 1000;
const signalingSocketPool = new Map();
const DIAGNOSTICS_POLL_MS = 3000;
const CONNECTION_RECOVERY_LIMIT = 2;

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
  duration = 3200
}) {
  if (typeof window === "undefined") return;
  const body = String(message || "").trim();
  if (!body) return;
  window.dispatchEvent(
    new CustomEvent("qring:flash", {
      detail: {
        title,
        message: body,
        type,
        duration
      }
    })
  );
  if (
    typeof document !== "undefined" &&
    document.visibilityState === "hidden" &&
    typeof window.Notification !== "undefined" &&
    window.Notification.permission === "granted"
  ) {
    try {
      new window.Notification(title, { body });
    } catch {
      // Keep alerts non-blocking.
    }
  }
}

function acquireSignalingSocket(sessionId) {
  const key = String(sessionId || "");
  let entry = signalingSocketPool.get(key);
  if (!entry) {
    const socket = io(`${env.socketUrl}${env.signalingNamespace ?? "/realtime/signaling"}`, {
      path: env.socketPath,
      transports: ["websocket"],
      upgrade: false,
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
  const displayName = user?.fullName || "Visitor";
  const isHomeowner = user?.role === "homeowner";
  const isMobileWebView = isLikelyMobileWebView();

  const [connected, setConnected] = useState(false);
  const [joined, setJoined] = useState(false);
  const [callState, setCallState] = useState("idle");
  const [muted, setMuted] = useState(false);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("");
  const [networkQuality, setNetworkQuality] = useState("reconnecting");
  const [networkDetail, setNetworkDetail] = useState("Connecting...");
  const [callLaunchStage, setCallLaunchStage] = useState("idle");
  const [callLaunchStartedAt, setCallLaunchStartedAt] = useState(null);
  const [incomingCall, setIncomingCall] = useState({
    pending: false,
    hasVideo: false
  });
  const [acceptedCallMode, setAcceptedCallMode] = useState("");
  const [callDiagnostics, setCallDiagnostics] = useState(() => emptyDiagnostics());
  const [lowBandwidthMode, setLowBandwidthModeState] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LOW_BANDWIDTH_STORAGE_KEY) === "true";
  });

  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
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
  const diagnosticsTimerRef = useRef(null);
  const forceRelayRef = useRef(false);
  const pendingVideoUpgradeRef = useRef(false);
  const connectionRecoveryCountRef = useRef(0);
  const lastAlertAtRef = useRef(new Map());

  const supportsWebRTC =
    typeof window !== "undefined" && typeof window.RTCPeerConnection !== "undefined";
  const supportsUserMedia =
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function";
  const isSecureOrigin = typeof window === "undefined" ? true : window.isSecureContext;

  const featureError = useMemo(() => {
    if (!supportsWebRTC) return "This browser does not support WebRTC calls.";
    if (!isSecureOrigin) {
      return "Camera and microphone require HTTPS on network devices. Open the app with HTTPS or localhost.";
    }
    if (shouldForceSecureSocket(env.socketUrl)) {
      return "Insecure signaling URL detected. Use HTTPS/WSS backend for reliable calls.";
    }
    if (!supportsUserMedia) return "Camera/microphone APIs are unavailable in this browser.";
    return "";
  }, [isSecureOrigin, supportsUserMedia, supportsWebRTC]);
  const autoLowBandwidthActive = lowBandwidthMode || networkQuality === "slow";

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

  function setLowBandwidthMode(nextValue) {
    const normalized = Boolean(nextValue);
    setLowBandwidthModeState(normalized);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOW_BANDWIDTH_STORAGE_KEY, normalized ? "true" : "false");
    }
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
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play().catch(() => {});
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.volume = 1;
        remoteAudioRef.current.play().catch(() => {});
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
        if (!isHomeowner) {
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
          isHomeowner &&
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
  }

  function startDiagnosticsPolling() {
    stopDiagnosticsPolling();
    refreshPeerDiagnostics();
    diagnosticsTimerRef.current = setInterval(() => {
      refreshPeerDiagnostics();
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

  function markNetworkSlow(detail = "Network is unstable. Trying to keep the session active.") {
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
        setStatus("Network looks slow. Keep this page open while we continue trying.");
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
      setStatus(`Network is slow. Retrying call request (${offerRetryCountRef.current}/${CALL_RETRY_LIMIT})...`);
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

  function startAudioCall() {
    if (!isHomeowner) {
      setStatus("Only homeowner can start calls. Wait for incoming call.");
      return;
    }
    startCall({ video: false, forceRelay: autoLowBandwidthActive });
  }

  function startVideoCall() {
    if (!isHomeowner) {
      setStatus("Only homeowner can start calls. Wait for incoming call.");
      return;
    }
    if (lowBandwidthMode) {
      setStatus("Low bandwidth mode is enabled. Starting audio-only call.");
      startCall({ video: false, forceRelay: true });
      return;
    }
    if (isMobileWebView) {
      setStatus("Starting audio first for mobile stability, then upgrading to video.");
      startCall({
        video: false,
        forceRelay: autoLowBandwidthActive,
        requestVideoUpgrade: true
      });
      return;
    }
    startCall({ video: true, forceRelay: autoLowBandwidthActive });
  }

  function retryCallConnection() {
    if (!isHomeowner) {
      setStatus("Reconnect from homeowner side or re-open session.");
      return;
    }
    forceRelayRef.current = true;
    setStatus("Retrying call with relay and audio-only fallback...");
    startCall({ video: false, restart: true, forceRelay: true }).catch(() => {
      // status is handled in startCall
    });
  }

  async function acceptIncomingCall() {
    if (!incomingCall.pending) return;
    const pending = pendingOfferRef.current;
    if (!pending?.sdp) return;
    try {
      setStatus("");
      forceRelayRef.current = isMobileWebView && (lowBandwidthMode || networkQuality === "slow");
      const allowVideo = incomingCall.hasVideo && !lowBandwidthMode;
      if (incomingCall.hasVideo && !allowVideo) {
        setStatus("Low bandwidth mode enabled. Accepting call with audio-only.");
      }
      try {
        await attachLocalStream({ video: allowVideo });
      } catch (mediaError) {
        setStatus(mediaError?.message || "Media permission unavailable. Joining to receive remote stream.");
        ensurePeer();
      }
      await applyRemoteDescriptionAndDrain(pending.sdp);
      const pc = ensurePeer();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current?.emit("webrtc.answer", { sessionId, sdp: answer });
      setCallState("connected");
      setCallLaunchStage("idle");
      setCallLaunchStartedAt(null);
      clearOfferRetryTimer();
      grantSessionCallAccess(sessionId, "connected");
      setAcceptedCallMode(allowVideo ? "video" : "audio");
      setIncomingCall({ pending: false, hasVideo: false });
      pendingOfferRef.current = null;
    } catch (error) {
      setStatus(error?.message ?? "Failed to accept incoming call");
    }
  }

  function rejectIncomingCall() {
    if (!incomingCall.pending) return;
    socketRef.current?.emit("session.control", {
      sessionId,
      action: "call_rejected"
    });
    setStatus("Incoming call rejected");
    setCallState("idle");
    setCallLaunchStage("idle");
    setCallLaunchStartedAt(null);
    clearOfferRetryTimer();
    setAcceptedCallMode("");
    setIncomingCall({ pending: false, hasVideo: false });
    pendingOfferRef.current = null;
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
      clientId
    });
    return true;
  }

  function retryFailedMessage(messageId) {
    const target = messages.find((item) => item.id === messageId);
    if (!target?.mine || !target?.failed) return false;
    return sendMessage(target.text, { replaceMessageId: messageId });
  }

  function toggleMute() {
    if (!localStreamRef.current) return;
    const nextMuted = !muted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
    socketRef.current?.emit("session.control", {
      sessionId,
      action: nextMuted ? "mute" : "unmute"
    });
  }

  function endCall(broadcast = true) {
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
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    setCallState("ended");
    setCallLaunchStage("idle");
    setCallLaunchStartedAt(null);
    setCameraOn(false);
    setMuted(false);
    setRemoteMuted(false);
    setAcceptedCallMode("");
    forceRelayRef.current = false;
    pendingVideoUpgradeRef.current = false;
    connectionRecoveryCountRef.current = 0;
    setIncomingCall({ pending: false, hasVideo: false });
    pendingOfferRef.current = null;
    clearOfferRetryTimer();
    lastOfferRef.current = null;
    offerRetryCountRef.current = 0;
    clearSessionCallAccess(sessionId);
  }

  useEffect(() => {
    let active = true;
    const loadHistory = async () => {
      try {
        const rows = await getVisitorSessionMessages(sessionId);
        if (!active) return;
        setMessages(rows.map((row) => normalizeMessage(row)));
      } catch {
        if (active) setStatus((prev) => prev || "Unable to load message history");
      }
    };
    loadHistory();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    const socket = acquireSignalingSocket(sessionId);
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      connectedOnceRef.current = true;
      markNetworkReconnecting("Connected to signaling. Joining session room...");
      socket.emit("session.join", { sessionId, displayName });
    });
    socket.on("disconnect", () => {
      setConnected(false);
      setJoined(false);
      markNetworkReconnecting(
        connectedOnceRef.current ? "Connection lost. Reconnecting..." : "Connecting..."
      );
    });
    socket.on("connect_error", (error) => {
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
      setJoined(true);
      setStatus("Session connected");
      markNetworkGood("Session connected.");
      if (isHomeowner && pendingStartCallRef.current) {
        const queued = pendingStartCallRef.current;
        pendingStartCallRef.current = null;
        setTimeout(() => {
          startCall({ video: Boolean(queued?.video) });
        }, 0);
      }
    });
    socket.on("session.participant_joined", async () => {
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
      if (callStateRef.current === "connected") {
        setStatus("Participant connection changed. Waiting for reconnect...");
        notifyWithCooldown("participant_link_changed", {
          title: "Call Reconnecting",
          message: "Participant connection changed. Trying to reconnect...",
          type: "warning"
        });
        return;
      }
      setStatus("Participant left");
      notifyWithCooldown("participant_left", {
        title: "Participant Left",
        message: "The other participant left the session.",
        type: "warning"
      });
    });

    socket.on("webrtc.offer", async (payload) => {
      if (payload?.sessionId !== sessionId) return;
      playIncomingCallNotificationSound();
      try {
        const wantsVideo =
          typeof payload?.sdp?.sdp === "string" && payload.sdp.sdp.includes("m=video");
        if (!isHomeowner) {
          pendingOfferRef.current = payload;
          setIncomingCall({ pending: true, hasVideo: wantsVideo });
          setCallState("incoming");
          setStatus(wantsVideo ? "Incoming video call" : "Incoming audio call");
          notifyWithCooldown("incoming_call", {
            title: "Incoming Call",
            message: wantsVideo ? "Homeowner is calling you (video)." : "Homeowner is calling you (audio).",
            type: "info",
            duration: 4000
          });
          grantSessionCallAccess(sessionId, "incoming");
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
            message: `${incoming.displayName}: ${incoming.text || "Sent a message"}`,
            type: "info"
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
        duration: 4200
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
          type: "warning"
        });
        endCall(false);
      }
      if (action === "call_rejected") {
        setStatus("Call rejected by visitor");
        notifyWithCooldown("call_rejected", {
          title: "Call Rejected",
          message: "The visitor rejected the call request.",
          type: "warning"
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
      pendingStartCallRef.current = null;
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
  }, [sessionId, displayName, token, isHomeowner, lowBandwidthMode]);

  return {
    connected,
    joined,
    callState,
    muted,
    cameraOn,
    messages,
    status,
    networkQuality,
    networkDetail,
    callLaunchStage,
    callLaunchStartedAt,
    featureError,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    localStreamRef,
    remoteMuted,
    callDiagnostics,
    incomingCall,
    acceptedCallMode,
    lowBandwidthMode,
    autoLowBandwidthActive,
    isMobileWebView,
    setLowBandwidthMode,
    canStartCall: isHomeowner,
    sendMessage,
    retryFailedMessage,
    toggleMute,
    endCall,
    startAudioCall,
    startVideoCall,
    retryCallConnection,
    acceptIncomingCall,
    rejectIncomingCall
  };
}
