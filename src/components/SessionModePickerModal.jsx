import { useMemo } from "react";

const options = [
  {
    key: "message",
    title: "Messages",
    description: "Open chat first, then move to call when ready.",
    buttonClass: "bg-slate-900 text-white hover:bg-slate-800"
  },
  {
    key: "audio",
    title: "Audio Call",
    description: "Start voice session with microphone only.",
    buttonClass: "bg-emerald-600 text-white hover:bg-emerald-700"
  },
  {
    key: "video",
    title: "Video Call",
    description: "Start live video and audio session.",
    buttonClass: "bg-cyan-600 text-white hover:bg-cyan-700"
  }
];

export default function SessionModePickerModal({ open, sessionId, onClose, onSelect }) {
  const heading = useMemo(
    () => (sessionId ? `Choose Session Mode (${sessionId.slice(0, 8)}...)` : "Choose Session Mode"),
    [sessionId]
  );

  if (!open || !sessionId) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <h3 className="font-heading text-lg font-bold">{heading}</h3>
        <p className="mt-1 text-sm text-slate-500">Pick where you want to enter this session.</p>
        <div className="mt-4 space-y-3">
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onSelect(option.key)}
              className={`w-full rounded-xl px-4 py-3 text-left transition ${option.buttonClass}`}
            >
              <p className="text-sm font-semibold">{option.title}</p>
              <p className="text-xs opacity-85">{option.description}</p>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
