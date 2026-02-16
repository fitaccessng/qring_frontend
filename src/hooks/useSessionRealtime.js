import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { env } from "../config/env";
import { getVisitorSessionMessages } from "../services/homeownerService";

const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

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

  const [connected, setConnected] = useState(false);
  const [joined, setJoined] = useState(false);
  const [callState, setCallState] = useState("idle");
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("");

  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pendingRemoteCandidates = useRef([]);
  const isMakingOfferRef = useRef(false);

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

  function ensurePeer() {
    if (peerRef.current) return peerRef.current;
    const pc = new RTCPeerConnection(rtcConfig);
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        remoteVideoRef.current.play().catch(() => {});
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
      if (state === "connected") setCallState("connected");
      if (state === "failed" || state === "disconnected" || state === "closed") {
        setCallState("ended");
      }
    };
    peerRef.current = pc;
    return pc;
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
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: Boolean(video)
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
    setCameraOn(Boolean(video));
    setCallState("ready");
    return stream;
  }

  async function startCall({ video }) {
    try {
      setStatus("");
      if (featureError) {
        setStatus(featureError);
        return;
      }
      if (!joined) {
        setStatus("Joining session room...");
        return;
      }
      await attachLocalStream({ video });
      const pc = ensurePeer();
      isMakingOfferRef.current = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current?.emit("webrtc.offer", {
        sessionId,
        sdp: offer
      });
      setCallState("ringing");
    } catch (error) {
      setStatus(error?.message ?? "Unable to start call");
    } finally {
      isMakingOfferRef.current = false;
    }
  }

  function startAudioCall() {
    startCall({ video: false });
  }

  function startVideoCall() {
    startCall({ video: true });
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
    socketRef.current.emit("chat.message", {
      sessionId,
      text: body,
      displayName
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
    setCallState("ended");
    setCameraOn(false);
    setMuted(false);
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
      auth: token ? { token } : undefined,
      withCredentials: true
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("session.join", { sessionId, displayName });
    });
    socket.on("disconnect", () => {
      setConnected(false);
      setJoined(false);
    });
    socket.on("connect_error", (error) => {
      setStatus(error?.message ?? "Socket connection failed");
    });
    socket.on("session.joined", (payload) => {
      if (!payload?.sid) return;
      setJoined(true);
      setStatus("Session connected");
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
      try {
        const wantsVideo =
          typeof payload?.sdp?.sdp === "string" && payload.sdp.sdp.includes("m=video");
        try {
          await attachLocalStream({ video: wantsVideo });
        } catch {
          ensurePeer();
        }
        await applyRemoteDescriptionAndDrain(payload.sdp);
        const pc = ensurePeer();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc.answer", { sessionId, sdp: answer });
        setCallState("connected");
      } catch (error) {
        setStatus(error?.message ?? "Failed to handle incoming call");
      }
    });

    socket.on("webrtc.answer", async (payload) => {
      if (payload?.sessionId !== sessionId) return;
      try {
        await applyRemoteDescriptionAndDrain(payload.sdp);
        setCallState("connected");
      } catch (error) {
        setStatus(error?.message ?? "Failed to establish call");
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
      const incoming = normalizeMessage(payload);
      setMessages((prev) => {
        if (incoming.id && prev.some((item) => item.id && item.id === incoming.id)) {
          return prev;
        }
        return [...prev, incoming];
      });
    });

    socket.on("session.control", (payload) => {
      if (payload?.sessionId !== sessionId) return;
      const action = payload?.action;
      if (action === "mute") setStatus("Other participant muted microphone");
      if (action === "unmute") setStatus("Other participant unmuted microphone");
      if (action === "end") {
        setStatus("Call ended by participant");
        endCall(false);
      }
    });

    return () => {
      socket.disconnect();
      endCall(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, displayName, token]);

  return {
    connected,
    joined,
    callState,
    muted,
    cameraOn,
    messages,
    status,
    featureError,
    localVideoRef,
    remoteVideoRef,
    localStreamRef,
    sendMessage,
    toggleMute,
    endCall,
    startAudioCall,
    startVideoCall
  };
}
