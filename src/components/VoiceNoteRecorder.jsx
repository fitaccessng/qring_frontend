import { useEffect, useRef, useState } from "react";

const MAX_RECORD_MS = 20000;
const MAX_BYTES = 1.6 * 1024 * 1024;
const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg"
];

export default function VoiceNoteRecorder({ onSend, disabled = false }) {
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("");
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    };
  }, []);

  async function startRecording() {
    if (disabled || recording) return;
    setStatus("");
    if (typeof window === "undefined" || typeof window.MediaRecorder === "undefined") {
      setStatus("Voice notes are not supported on this device.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Microphone access is unavailable on this device.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported?.(type));
      const recorder = preferredType ? new MediaRecorder(stream, { mimeType: preferredType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
        try {
          const mime = recorder.mimeType || preferredType || "audio/webm";
          const blob = new Blob(chunksRef.current, { type: mime });
          if (!blob.size) {
            setStatus("No audio captured.");
            return;
          }
          if (blob.size > MAX_BYTES) {
            setStatus("Voice note too large. Keep it under 20 seconds.");
            return;
          }
          const file = new File([blob], `voice-note${extensionForMime(mime)}`, { type: mime });
          const result = await onSend?.(file);
          if (result === true) {
            setStatus("");
            return;
          }
          if (typeof result === "string" && result.trim()) {
            setStatus(result.trim());
            return;
          }
          setStatus("Unable to send voice note. Try again.");
        } catch (error) {
          setStatus(error?.message || "Unable to process voice note.");
        }
      };

      recorder.start();
      setRecording(true);
      timerRef.current = setTimeout(() => stopRecording(), MAX_RECORD_MS);
    } catch {
      setStatus("Microphone access denied.");
    }
  }

  function stopRecording() {
    if (!recorderRef.current || recorderRef.current.state === "inactive") return;
    recorderRef.current.stop();
    setRecording(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={recording ? stopRecording : startRecording}
        className={`grid h-10 w-10 place-items-center rounded-xl border text-sm font-semibold transition ${
          recording
            ? "border-rose-400 bg-rose-500 text-white"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        } disabled:opacity-60`}
        aria-label={recording ? "Stop recording voice note" : "Record voice note"}
        title={recording ? "Stop recording" : "Record voice note"}
      >
        {recording ? "Stop" : "Mic"}
      </button>
      {status ? <span className="text-xs text-rose-500">{status}</span> : null}
    </div>
  );
}

function extensionForMime(mime) {
  if (mime.includes("ogg")) return ".ogg";
  if (mime.includes("wav")) return ".wav";
  if (mime.includes("mpeg")) return ".mp3";
  if (mime.includes("mp4") || mime.includes("m4a")) return ".m4a";
  return ".webm";
}
