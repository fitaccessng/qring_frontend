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
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ],
  iceCandidatePoolSize: 8
};

const CALL_RETRY_DELAY_MS = 5000;
const CALL_RETRY_LIMIT = 2;
const LOW_BANDWIDTH_STORAGE_KEY = "qring_low_bandwidth_mode";

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
    return {
      id: payload?.id || null,
      text: payload?.text || "",
      displayName: payload?.displayName || "Participant",
      senderType,
      at: payload?.at || new Date().toISOString(),
      mine:
        senderType !== null
          ? isMineBySenderType(senderType)
          : payload?.displayName === displayName
    };
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
    const pc = new RTCPeerConnection(rtcConfig);
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
      if (state === "connected") {
        setCallState("connected");
        setCallLaunchStage("idle");
        setCallLaunchStartedAt(null);
        if (!isHomeowner) {
          grantSessionCallAccess(sessionId, "connected");
        }
      }
      if (state === "failed" || state === "disconnected" || state === "closed") {
        setCallState("ended");
        setCallLaunchStage("idle");
        setCallLaunchStartedAt(null);
        clearSessionCallAccess(sessionId);
      }
    };
    peerRef.current = pc;
    return pc;
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
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: videoConstraints
    });
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

  async function startCall({ video }) {
    try {
      setStatus("");
      setCallLaunchStage("preparing");
      setCallLaunchStartedAt(Date.now());
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
        return;
      }
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
    } finally {
      isMakingOfferRef.current = false;
    }
  }

  function startAudioCall() {
    if (!isHomeowner) {
      setStatus("Only homeowner can start calls. Wait for incoming call.");
      return;
    }
    startCall({ video: false });
  }

  function startVideoCall() {
    if (!isHomeowner) {
      setStatus("Only homeowner can start calls. Wait for incoming call.");
      return;
    }
    if (lowBandwidthMode) {
      setStatus("Low bandwidth mode is enabled. Starting audio-only call.");
      startCall({ video: false });
      return;
    }
    startCall({ video: true });
  }

  async function acceptIncomingCall() {
    if (!incomingCall.pending) return;
    const pending = pendingOfferRef.current;
    if (!pending?.sdp) return;
    try {
      setStatus("");
      const allowVideo = incomingCall.hasVideo && !lowBandwidthMode;
      if (incomingCall.hasVideo && !allowVideo) {
        setStatus("Low bandwidth mode enabled. Accepting call with audio-only.");
      }
      await attachLocalStream({ video: allowVideo });
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

  function sendMessage(text) {
    const body = (text || "").trim();
    if (!body || !socketRef.current || !joined) return false;
    const clientId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    pendingLocalMessageIdsRef.current.add(clientId);
    setMessages((prev) => [
      ...prev,
      normalizeMessage({
        id: clientId,
        clientId,
        text: body,
        displayName,
        senderType: user?.role || "visitor",
        at: new Date().toISOString()
      })
    ]);
    socketRef.current.emit("chat.message", {
      sessionId,
      text: body,
      displayName,
      clientId
    });
    return true;
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
    const socket = io(`${env.socketUrl}${env.signalingNamespace ?? "/realtime/signaling"}`, {
      path: env.socketPath,
      transports: ["websocket", "polling"],
      rememberUpgrade: true,
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
    });
    socket.on("session.joined", (payload) => {
      if (!payload?.sid) return;
      setJoined(true);
      setStatus("Session connected");
      markNetworkGood("Session connected.");
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
    socket.on("session.participant_left", () => setStatus("Participant left"));

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
      }
      setMessages((prev) => {
        const clientId = payload?.clientId;
        if (clientId && pendingLocalMessageIdsRef.current.has(clientId)) {
          pendingLocalMessageIdsRef.current.delete(clientId);
          return prev.map((item) =>
            item.id === clientId
              ? {
                  ...incoming,
                  id: incoming.id || clientId
                }
              : item
          );
        }
        if (incoming.id && prev.some((item) => item.id && item.id === incoming.id)) {
          return prev;
        }
        if (incoming.mine) {
          const incomingTs = new Date(incoming.at).getTime();
          const optimisticIndex = prev.findIndex((item) => {
            if (!String(item.id ?? "").startsWith("local-")) return false;
            if ((item.text || "").trim() !== (incoming.text || "").trim()) return false;
            const localTs = new Date(item.at).getTime();
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
        endCall(false);
      }
      if (action === "call_rejected") {
        setStatus("Call rejected by visitor");
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
      manager.off("reconnect_attempt", onReconnectAttempt);
      manager.off("reconnect", onReconnect);
      manager.off("reconnect_error", onReconnectError);
      manager.off("reconnect_failed", onReconnectFailed);
      socket.disconnect();
      endCall(false);
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
    incomingCall,
    lowBandwidthMode,
    autoLowBandwidthActive,
    setLowBandwidthMode,
    canStartCall: isHomeowner,
    sendMessage,
    toggleMute,
    endCall,
    startAudioCall,
    startVideoCall,
    acceptIncomingCall,
    rejectIncomingCall
  };
}
