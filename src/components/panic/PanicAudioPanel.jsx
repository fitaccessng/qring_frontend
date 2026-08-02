import React, { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Pause, Play, Radio } from "lucide-react";
import { downloadPanicAudioSegment, listPanicAudioSegments, uploadPanicAudioSegment } from "../../services/safetyService";
import { showError, showSuccess } from "../../utils/flash";

export default function PanicAudioPanel({ alert, compact = false }) {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState("");
  const [activeSegmentId, setActiveSegmentId] = useState(null);
  const [playbackQueue, setPlaybackQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [queuePlaying, setQueuePlaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const recorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const segmentIndexRef = useRef(0);
  const segmentTimerRef = useRef(null);

  const panicId = String(alert?.id || "");

  const isActive = alert?.status === "active";
  const userCanRecord = !alert?.acknowledged;
  const canPlaySegments = Boolean(segments.length);

  const panelTitle = compact ? "SOS audio" : "Secure SOS audio capture";
  const description = isActive
    ? "Record segmented audio during an active alert and let authorized responders play back incident segments."
    : "Audio recording is available only while a panic alert is active.";

  const segmentCount = segments.length;
  const nextSegmentIndex = useMemo(() => segmentCount, [segmentCount]);

  useEffect(() => {
    async function loadSegments() {
      if (!panicId) return;
      setLoading(true);
      try {
        const rows = await listPanicAudioSegments(panicId);
        setSegments(Array.isArray(rows) ? rows : []);
        segmentIndexRef.current = rows?.length || 0;
      } catch (err) {
        console.error("Failed to load panic audio segments", err);
      } finally {
        setLoading(false);
      }
    }
    loadSegments();
  }, [panicId]);

  useEffect(() => {
    return () => {
      if (playbackUrl) {
        URL.revokeObjectURL(playbackUrl);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (segmentTimerRef.current) {
        clearTimeout(segmentTimerRef.current);
      }
    };
  }, [playbackUrl]);

  async function requestMicrophoneAccess() {
    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error("Microphone access is unavailable in this environment.");
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setPermissionGranted(true);
    setPermissionDenied(false);
    stream.getTracks().forEach((track) => track.stop());
    return true;
  }

  async function beginRecording() {
    if (!panicId) return;
    try {
      if (!permissionGranted) {
        await requestMicrophoneAccess();
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        if (!chunks.length) {
          setRecording(false);
          return;
        }

        setUploading(true);
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], `panic-${panicId}-segment-${nextSegmentIndex}.webm`, { type: "audio/webm" });
        try {
          await uploadPanicAudioSegment({ panicId, segmentIndex: nextSegmentIndex, file, filenameHint: file.name });
          await refreshSegments();
          segmentIndexRef.current += 1;
          showSuccess("Audio segment uploaded.");
        } catch (err) {
          setErrorMessage(err?.message || "Unable to upload audio segment.");
          showError(err?.message || "Unable to upload audio segment.");
        } finally {
          setUploading(false);
          setRecording(false);
          recorderRef.current = null;
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
          }
        }
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      scheduleSegmentStop();
    } catch (err) {
      const denied = err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError" || err?.message?.toLowerCase().includes("permission");
      if (denied) {
        setPermissionDenied(true);
        setPermissionGranted(false);
      }
      setErrorMessage(err?.message || "Microphone permission denied.");
      showError(err?.message || "Microphone permission denied.");
      setRecording(false);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    }
  }

  function scheduleSegmentStop() {
    if (segmentTimerRef.current) {
      clearTimeout(segmentTimerRef.current);
    }
    segmentTimerRef.current = window.setTimeout(() => {
      if (recorderRef.current && recorderRef.current.state === "recording") {
        recorderRef.current.stop();
      }
    }, 8000);
  }

  async function stopRecording() {
    if (segmentTimerRef.current) {
      clearTimeout(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setRecording(false);
  }

  async function refreshSegments() {
    if (!panicId) return;
    setLoading(true);
    try {
      const rows = await listPanicAudioSegments(panicId);
      setSegments(Array.isArray(rows) ? rows : []);
      segmentIndexRef.current = rows?.length || 0;
    } catch (err) {
      console.error("Failed to refresh panic audio segments", err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePlayQueue() {
    if (!segments.length) return;
    try {
      setLoading(true);
      await playQueuedSegment(segments, 0);
    } catch (err) {
      showError(err?.message || "Unable to play audio queue.");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleRecording() {
    if (!isActive) return;
    if (recording) {
      await stopRecording();
      return;
    }
    await beginRecording();
  }

  async function handlePlaySegment(segment) {
    try {
      setLoading(true);
      setPlaybackQueue([segment]);
      setQueueIndex(0);
      setQueuePlaying(true);
      await playQueuedSegment([segment], 0);
    } catch (err) {
      showError(err?.message || "Unable to play audio segment.");
    } finally {
      setLoading(false);
    }
  }

  async function playQueuedSegment(queue, index) {
    const segment = queue[index];
    if (!segment) {
      setQueuePlaying(false);
      setPlaybackQueue([]);
      setActiveSegmentId(null);
      return;
    }

    if (playbackUrl) {
      URL.revokeObjectURL(playbackUrl);
      setPlaybackUrl("");
    }
    const blob = await downloadPanicAudioSegment(segment.id);
    const url = URL.createObjectURL(blob);
    setPlaybackUrl(url);
    setActiveSegmentId(segment.id);
    setPlaybackQueue(queue);
    setQueueIndex(index);
    setQueuePlaying(true);

    await new Promise((resolve) => {
      const player = document.getElementById(`panic-audio-player-${segment.id}`);
      if (!player) {
        resolve();
        return;
      }
      player.onended = () => resolve();
      player.onplay = () => {};
      player.play().catch(() => resolve());
    });

    const nextIndex = index + 1;
    if (nextIndex < queue.length) {
      await playQueuedSegment(queue, nextIndex);
    } else {
      setQueuePlaying(false);
      setPlaybackQueue([]);
      setActiveSegmentId(null);
    }
  }

  return (
    <div className={`rounded-[1.5rem] border border-white/10 bg-black/20 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">{panelTitle}</p>
          <p className="mt-1 text-sm text-white/90">{description}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-100">
          <Radio className="h-4 w-4" />
          {segmentCount > 0 ? `${segmentCount} saved segment${segmentCount === 1 ? "" : "s"}` : "No recorded segments"}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {isActive && userCanRecord ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <button
              type="button"
              onClick={handleToggleRecording}
              disabled={uploading}
              className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold uppercase transition ${recording ? "bg-rose-600 text-white" : "bg-white text-slate-900 hover:bg-slate-100"}`}
            >
              {recording ? <Pause size={16} /> : <Mic size={16} />}
              {recording ? "Stop recording" : "Start recording"}
            </button>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-xs text-slate-300">
              <div className="font-semibold text-slate-100">Segment upload</div>
              <div>{uploading ? "Uploading..." : "Segments upload automatically."}</div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-xs text-slate-300">
            {!isActive ? "Recording is only available while a panic alert is active." : "Recording is disabled once the alert has been acknowledged."}
          </div>
        )}

        <div className="space-y-3">
          {permissionDenied ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              <div className="font-semibold">Microphone access denied</div>
              <p className="text-xs text-amber-100/80">Please allow microphone permission in your browser or device settings and retry recording.</p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await requestMicrophoneAccess();
                    setErrorMessage("");
                    showSuccess("Microphone access granted.");
                  } catch (err) {
                    setErrorMessage(err?.message || "Microphone permission denied.");
                    showError(err?.message || "Microphone permission denied.");
                  }
                }}
                className="mt-3 inline-flex items-center justify-center rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100"
              >
                Retry microphone permission
              </button>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{errorMessage}</div>
          ) : null}

          {loading && !segments.length ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">Loading audio segments…</div>
          ) : null}

          {segments.length ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
                <div>
                  <div className="font-semibold text-white">Responder playback queue</div>
                  <p className="text-xs text-slate-400">Play all recorded segments in order for responder review.</p>
                </div>
                <button
                  type="button"
                  onClick={handlePlayQueue}
                  className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                >
                  <Play size={14} />
                  Play queue
                </button>
                {queuePlaying ? (
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">Playing segment {queueIndex + 1} / {segments.length}</span>
                ) : null}
              </div>
              {segments.map((segment) => (
                <div key={segment.id} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">Segment {segment.segmentIndex + 1}</div>
                      <p className="text-xs text-slate-400">{new Date(segment.createdAt).toLocaleString()}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePlaySegment(segment)}
                      className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                    >
                      <Play size={14} />
                      Play
                    </button>
                  </div>
                  <audio
                    id={`panic-audio-player-${segment.id}`}
                    src={playbackUrl && activeSegmentId === segment.id ? playbackUrl : undefined}
                    controls
                    className="mt-3 w-full"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">No audio segments have been recorded for this alert yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
