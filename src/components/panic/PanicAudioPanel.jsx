import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Radio } from "lucide-react";
import { buildLivekitConnectOptions, buildLivekitRoomOptions } from "../../services/livekitConnection";
import { endPanicAudio, joinPanicAudio } from "../../services/safetyService";

function buildParticipantCount(room) {
  if (!room) return 0;
  return Number(room.remoteParticipants?.size || 0) + (room.localParticipant ? 1 : 0);
}

export default function PanicAudioPanel({ alert, canEnd = false, compact = false }) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [participantCount, setParticipantCount] = useState(0);
  const [muted, setMuted] = useState(false);
  const roomRef = useRef(null);
  const localTrackRef = useRef(null);
  const remoteTracksRef = useRef(new Map());

  const audioActive = Boolean(alert?.audio?.active);
  const buttonLabel = useMemo(() => {
    if (status === "connecting") return "Joining audio...";
    if (status === "connected") return muted ? "Mic muted" : "Live audio connected";
    return audioActive ? "Join live audio" : "Start live audio";
  }, [audioActive, muted, status]);

  useEffect(() => {
    return () => {
      disconnectRoom();
    };
  }, []);

  async function disconnectRoom() {
    try {
      localTrackRef.current?.stop?.();
      localTrackRef.current = null;
      for (const node of remoteTracksRef.current.values()) {
        try {
          node.remove();
        } catch {
          // Ignore detached audio cleanup failures.
        }
      }
      remoteTracksRef.current.clear();
      roomRef.current?.disconnect?.();
    } catch {
      // Ignore disconnect cleanup failures.
    } finally {
      roomRef.current = null;
      setParticipantCount(0);
      setMuted(false);
      setStatus("idle");
    }
  }

  async function handleJoin() {
    if (!alert?.id || status === "connecting") return;
    setError("");
    setStatus("connecting");
    try {
      const auth = await joinPanicAudio(alert.id);
      const livekit = await import("livekit-client");
      const room = new livekit.Room(buildLivekitRoomOptions({ lowBandwidth: true }));
      roomRef.current = room;

      const syncParticipants = () => setParticipantCount(buildParticipantCount(room));
      const attachTrack = (track) => {
        if (track?.kind !== "audio") return;
        const element = track.attach();
        element.autoplay = true;
        element.playsInline = true;
        element.style.display = "none";
        document.body.appendChild(element);
        remoteTracksRef.current.set(track.sid || `${Date.now()}`, element);
        syncParticipants();
      };
      const detachTrack = (track) => {
        const key = track?.sid;
        const element = key ? remoteTracksRef.current.get(key) : null;
        if (element) {
          element.remove();
          remoteTracksRef.current.delete(key);
        }
        syncParticipants();
      };

      room.on(livekit.RoomEvent.TrackSubscribed, attachTrack);
      room.on(livekit.RoomEvent.TrackUnsubscribed, detachTrack);
      room.on(livekit.RoomEvent.ParticipantConnected, syncParticipants);
      room.on(livekit.RoomEvent.ParticipantDisconnected, syncParticipants);
      room.on(livekit.RoomEvent.Disconnected, () => {
        setStatus("idle");
        setParticipantCount(0);
      });

      await room.connect(auth.url, auth.token, buildLivekitConnectOptions());
      const localTrack = await livekit.createLocalAudioTrack();
      localTrackRef.current = localTrack;
      await room.localParticipant.publishTrack(localTrack);
      setParticipantCount(buildParticipantCount(room));
      setStatus("connected");
    } catch (nextError) {
      await disconnectRoom();
      setError(nextError?.message || "Unable to join panic audio.");
    }
  }

  async function handleLeave() {
    await disconnectRoom();
  }

  async function handleToggleMute() {
    if (!localTrackRef.current) return;
    if (muted) {
      await localTrackRef.current.unmute?.();
      setMuted(false);
      return;
    }
    await localTrackRef.current.mute?.();
    setMuted(true);
  }

  async function handleEndAudio() {
    if (!alert?.id) return;
    try {
      await endPanicAudio(alert.id);
      await disconnectRoom();
    } catch (nextError) {
      setError(nextError?.message || "Unable to end panic audio.");
    }
  }

  return (
    <div className={`rounded-[1.5rem] border border-white/10 bg-black/20 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">Panic Live Audio</p>
          <p className="mt-1 text-sm text-white/90">
            {status === "connected"
              ? `${participantCount} participant${participantCount === 1 ? "" : "s"} connected`
              : audioActive
                ? "Open the live panic audio room."
                : "Create the live panic audio room for responders."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {status === "connected" ? (
            <>
              <button
                type="button"
                onClick={handleToggleMute}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white px-4 py-2 text-xs font-semibold text-black"
              >
                {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {muted ? "Unmute" : "Mute"}
              </button>
              <button
                type="button"
                onClick={handleLeave}
                className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white"
              >
                <PhoneOff className="h-4 w-4" />
                Leave
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleJoin}
              disabled={status === "connecting"}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black disabled:opacity-60"
            >
              <Radio className="h-4 w-4" />
              {buttonLabel}
            </button>
          )}
          {canEnd && audioActive ? (
            <button
              type="button"
              onClick={handleEndAudio}
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white"
            >
              End audio
            </button>
          ) : null}
        </div>
      </div>
      {error ? <p className="mt-3 text-xs text-rose-200">{error}</p> : null}
    </div>
  );
}
