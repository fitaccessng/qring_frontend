import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";

const modes = [
  { key: "message", label: "Messages" },
  { key: "audio", label: "Audio" },
  { key: "video", label: "Video" }
];

export default function SessionModeNav({
  sessionId,
  disableCallModes = false,
  disabledCallTooltip = "Audio and Video are disabled until the homeowner starts a call."
}) {
  const [tooltipMode, setTooltipMode] = useState("");
  const tooltipTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
      }
    };
  }, []);

  function showTooltip(modeKey) {
    setTooltipMode(modeKey);
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
    }
    tooltipTimerRef.current = setTimeout(() => {
      setTooltipMode("");
    }, 2000);
  }

  function isCallMode(modeKey) {
    return modeKey === "audio" || modeKey === "video";
  }

  function itemClassName(isActive) {
    return `block rounded-xl px-3 py-2 text-sm font-semibold transition ${
      isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
    }`;
  }

  function mobileItemClassName(isActive) {
    return `rounded-xl px-2 py-2 text-center text-xs font-semibold ${
      isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
    }`;
  }

  function isModeDisabled(modeKey) {
    return disableCallModes && isCallMode(modeKey);
  }

  return (
    <>
      <aside className="hidden lg:col-span-3 lg:block">
        <section className="sticky top-6 rounded-3xl border border-slate-200/80 bg-white/85 p-4 shadow-soft backdrop-blur">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Session Pages</p>
          <nav className="space-y-2">
            {modes.map((item) =>
              isModeDisabled(item.key) ? (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => showTooltip(item.key)}
                  className="block w-full rounded-xl bg-slate-100 px-3 py-2 text-left text-sm font-semibold text-slate-400"
                >
                  {item.label}
                </button>
              ) : (
                <NavLink
                  key={item.key}
                  to={`/session/${sessionId}/${item.key}`}
                  className={({ isActive }) => itemClassName(isActive)}
                >
                  {item.label}
                </NavLink>
              )
            )}
          </nav>
          {tooltipMode ? (
            <p className="mt-3 rounded-xl bg-amber-100 px-3 py-2 text-xs text-amber-800">{disabledCallTooltip}</p>
          ) : null}
        </section>
      </aside>

      <nav className="fixed bottom-3 left-1/2 z-30 w-[min(96vw,520px)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-soft backdrop-blur lg:hidden">
        <div className="grid grid-cols-3 gap-2">
          {modes.map((item) =>
            isModeDisabled(item.key) ? (
              <button
                key={item.key}
                type="button"
                onClick={() => showTooltip(item.key)}
                className="rounded-xl bg-slate-100 px-2 py-2 text-center text-xs font-semibold text-slate-400"
              >
                {item.label}
              </button>
            ) : (
              <NavLink
                key={item.key}
                to={`/session/${sessionId}/${item.key}`}
                className={({ isActive }) => mobileItemClassName(isActive)}
              >
                {item.label}
              </NavLink>
            )
          )}
        </div>
        {tooltipMode ? (
          <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-center text-[11px] text-amber-800">
            {disabledCallTooltip}
          </p>
        ) : null}
      </nav>
    </>
  );
}
