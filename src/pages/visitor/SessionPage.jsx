import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { env } from "../../config/env";
import { getVisitorSessionMessages } from "../../services/homeownerService";

const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

const sessionModes = [
  { key: "message", label: "Messages" },
  { key: "audio", label: "Audio" },
  { key: "video", label: "Video" }
];

export default function SessionPage({ mode = "message" }) {
  const { sessionId } = useParams();
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
  const [text, setText] = useState("");
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
        remoteVideoRef.current.play().catch(() => {
          // autoplay may require user interaction on some devices
        });
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
      localVideoRef.current.play().catch(() => {
        // ignore autoplay constraints
      });
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

  function startModeCall() {
    if (mode === "audio") {
      startCall({ video: false });
      return;
    }
    if (mode === "video") {
      startCall({ video: true });
    }
  }

  async function applyRemoteDescriptionAndDrain(desc) {
    const pc = ensurePeer();
    await pc.setRemoteDescription(new RTCSessionDescription(desc));
    for (const candidate of pendingRemoteCandidates.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // ignore invalid candidates
      }
    }
    pendingRemoteCandidates.current = [];
  }

  function sendMessage(event) {
    event.preventDefault();
    const body = text.trim();
    if (!body || !socketRef.current || !joined) return;
    socketRef.current.emit("chat.message", {
      sessionId,
      text: body,
      displayName
    });
    setText("");
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
        if (active) {
          setStatus((prev) => prev || "Unable to load message history");
        }
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
    socket.on("session.participant_joined", async (payload) => {
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
          // noop
        } finally {
          isMakingOfferRef.current = false;
        }
      }
    });
    socket.on("session.participant_left", () => setStatus("Participant left"));

    socket.on("webrtc.offer", async (payload) => {
      if (payload?.sessionId !== sessionId) return;
      try {
        const wantsVideo = typeof payload?.sdp?.sdp === "string" && payload.sdp.sdp.includes("m=video");
        try {
          await attachLocalStream({ video: wantsVideo });
        } catch {
          // fallback: answer without local media if permissions denied
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
        } catch {
          // ignore bad candidate
        }
      } else {
        pendingRemoteCandidates.current.push(candidate);
      }
    });

    socket.on("chat.message", (payload) => {
      if (payload?.sessionId !== sessionId) return;
      const incoming = normalizeMessage(payload);
      setMessages((prev) => {
        if (
          incoming.id &&
          prev.some((item) => item.id && item.id === incoming.id)
        ) {
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fef3c7_0,_#f8fafc_38%,_#e0f2fe_72%,_#dbeafe_100%)] p-4 text-slate-900">
      <div className="mx-auto w-full max-w-7xl py-6">
        <header className="mb-4 rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-soft backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Qring Live Session</p>
              <h1 className="font-heading text-2xl font-black md:text-3xl">Session {sessionId}</h1>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className={`rounded-full px-3 py-1 ${connected ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                {connected ? "Signaling Online" : "Connecting Signaling"}
              </span>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-white">Call: {callState}</span>
              <span className={`rounded-full px-3 py-1 ${joined ? "bg-cyan-100 text-cyan-800" : "bg-slate-200 text-slate-700"}`}>
                {joined ? "Room Joined" : "Waiting Room"}
              </span>
            </div>
          </div>
          {featureError ? <p className="mt-3 rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-700">{featureError}</p> : null}
          {status ? <p className="mt-3 rounded-xl bg-amber-100 px-3 py-2 text-sm text-amber-700">{status}</p> : null}
        </header>

        <div className="grid gap-4 lg:grid-cols-12">
          <aside className="hidden lg:col-span-3 lg:block">
            <section className="sticky top-6 rounded-3xl border border-slate-200/80 bg-white/85 p-4 shadow-soft backdrop-blur">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Session Pages</p>
              <nav className="space-y-2">
                {sessionModes.map((item) => (
                  <NavLink
                    key={item.key}
                    to={`/session/${sessionId}/${item.key}`}
                    className={({ isActive }) =>
                      `block rounded-xl px-3 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </section>
          </aside>

          <section className="space-y-4 lg:col-span-5">
            {mode !== "message" ? (
              <div className="rounded-3xl border border-slate-200/80 bg-white/85 p-4 shadow-soft backdrop-blur">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Remote Feed</p>
                  <p className="text-xs font-semibold text-slate-500">{mode === "video" ? "Video mode" : "Audio mode"}</p>
                </div>
                <video ref={remoteVideoRef} autoPlay playsInline className="h-[320px] w-full rounded-2xl bg-slate-950 object-cover" />
              </div>
            ) : null}

            {mode === "video" ? (
              <div className="rounded-3xl border border-slate-200/80 bg-white/85 p-4 shadow-soft backdrop-blur">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Local Preview</p>
                  <p className="text-xs font-semibold text-slate-500">{muted ? "Mic muted" : "Mic active"}</p>
                </div>
                <video ref={localVideoRef} autoPlay playsInline className="h-56 w-full rounded-2xl bg-slate-900 object-cover" />
              </div>
            ) : null}
          </section>

          <section className="space-y-4 lg:col-span-4">
            <section className="rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-soft backdrop-blur">
              <h2 className="font-heading text-lg font-black">
                {mode === "message" ? "Messaging" : "Call Controls"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {mode === "message"
                  ? "Live chat for this session."
                  : `Controls for ${mode} communication.`}
              </p>
              {mode !== "message" ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={startModeCall}
                    disabled={Boolean(featureError)}
                    className="col-span-2 rounded-2xl bg-cyan-600 px-3 py-3 text-sm font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {mode === "audio" ? "Start Audio Call" : "Start Video Call"}
                  </button>
                  <button
                    type="button"
                    onClick={toggleMute}
                    disabled={!localStreamRef.current}
                    className="rounded-2xl bg-amber-500 px-3 py-3 text-sm font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {muted ? "Unmute" : "Mute"}
                  </button>
                  <button
                    type="button"
                    onClick={endCall}
                    className="rounded-2xl bg-rose-600 px-3 py-3 text-sm font-bold text-white transition hover:bg-rose-700"
                  >
                    End Call
                  </button>
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-soft backdrop-blur">
              <h2 className="font-heading text-lg font-black">Session Chat</h2>
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-2xl bg-slate-100/90 p-3">
                {messages.map((message, index) => (
                  <div
                    key={`${message.at}-${index}`}
                    className={`rounded-xl px-3 py-2 text-xs ${
                      message.mine ? "bg-cyan-600 text-white" : "bg-white text-slate-700"
                    }`}
                  >
                    <p className="font-bold">{message.displayName}</p>
                    <p>{message.text}</p>
                  </div>
                ))}
                {messages.length === 0 ? <p className="text-xs text-slate-500">No messages yet.</p> : null}
              </div>
              <form onSubmit={sendMessage} className="mt-3 flex gap-2">
                <input
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder="Type a message"
                />
                <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
                  Send
                </button>
              </form>
            </section>
          </section>
        </div>

        <nav className="fixed bottom-3 left-1/2 z-30 w-[min(96vw,520px)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-soft backdrop-blur lg:hidden">
          <div className="grid grid-cols-3 gap-2">
            {sessionModes.map((item) => (
              <NavLink
                key={item.key}
                to={`/session/${sessionId}/${item.key}`}
                className={({ isActive }) =>
                  `rounded-xl px-2 py-2 text-center text-xs font-semibold ${
                    isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
