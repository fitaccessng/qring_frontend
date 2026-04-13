import { useEffect, useRef, useState } from "react";
import { Siren } from "lucide-react";

const HOLD_MS = 2000;
const SLIDE_THRESHOLD = 0.88;

export default function PanicButton({ disabled = false, busy = false, onTrigger }) {
  const holdTimerRef = useRef(null);
  const holdStartedAtRef = useRef(0);
  const sliderRef = useRef(null);
  const slideProgressRef = useRef(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [slideProgress, setSlideProgress] = useState(0);

  useEffect(() => () => window.clearInterval(holdTimerRef.current), []);

  useEffect(() => {
    slideProgressRef.current = slideProgress;
  }, [slideProgress]);

  function stopHold() {
    window.clearInterval(holdTimerRef.current);
    holdTimerRef.current = null;
    holdStartedAtRef.current = 0;
    setHoldProgress(0);
  }

  function triggerOnce() {
    stopHold();
    setDragging(false);
    setSlideProgress(0);
    if (!disabled && !busy) {
      onTrigger?.();
    }
  }

  function startHold() {
    if (disabled || busy || holdTimerRef.current) return;
    holdStartedAtRef.current = Date.now();
    holdTimerRef.current = window.setInterval(() => {
      const next = Math.min(1, (Date.now() - holdStartedAtRef.current) / HOLD_MS);
      setHoldProgress(next);
      if (next >= 1) {
        triggerOnce();
      }
    }, 40);
  }

  function updateDrag(clientX) {
    const track = sliderRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const clamped = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const nextProgress = rect.width > 0 ? clamped / rect.width : 0;
    setSlideProgress(nextProgress);
  }

  function endDrag() {
    if (slideProgressRef.current >= SLIDE_THRESHOLD) {
      triggerOnce();
      return;
    }
    setDragging(false);
    setSlideProgress(0);
  }

  useEffect(() => {
    if (!dragging) return undefined;

    function handleMouseMove(event) {
      updateDrag(event.clientX);
    }

    function handleMouseUp() {
      endDrag();
    }

    function handleTouchMove(event) {
      updateDrag(event.touches[0]?.clientX ?? 0);
    }

    function handleTouchEnd() {
      endDrag();
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [dragging]);

  return (
    <div className="space-y-5">
      <div className="relative mx-auto flex h-64 w-64 items-center justify-center">
        <div
          className="absolute inset-0 rounded-full border border-rose-300/60"
          style={{ transform: `scale(${1 + holdProgress * 0.12})` }}
        />
        <div className="absolute inset-[10%] rounded-full border border-rose-200/70" />
        <button
          type="button"
          disabled={disabled || busy}
          onMouseDown={startHold}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          onTouchStart={startHold}
          onTouchEnd={stopHold}
          onTouchCancel={stopHold}
          className="relative flex h-56 w-56 flex-col items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#ff8a8a_0%,#d61f1f_38%,#680000_100%)] px-8 text-white shadow-[0_24px_80px_rgba(127,0,0,0.44)] transition active:scale-95 disabled:opacity-60"
        >
          <div className="absolute inset-0 rounded-full bg-white/10" style={{ clipPath: `inset(${(1 - holdProgress) * 100}% 0 0 0 round 999px)` }} />
          <Siren className="relative z-10 mb-4 h-14 w-14" />
          <span className="relative z-10 text-center font-semibold leading-tight">Hold 2 seconds</span>
          <span className="relative z-10 mt-1 text-center text-sm text-rose-100">or slide to activate</span>
        </button>
      </div>

      <div className="flex justify-center gap-2">
        {[0.2, 0.5, 0.8].map((threshold) => (
          <span
            key={threshold}
            className={`h-1.5 w-10 rounded-full ${holdProgress >= threshold ? "bg-rose-600" : "bg-rose-100"}`}
          />
        ))}
      </div>

      <div
        ref={sliderRef}
        className="relative mx-auto h-16 max-w-sm touch-none overflow-hidden rounded-full border border-black bg-black px-2 shadow-[0_20px_45px_rgba(15,23,42,0.18)]"
      >
        <div className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#7f0000_0%,#ef4444_100%)]" style={{ width: `${Math.max(18, slideProgress * 100)}%` }} />
        <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold uppercase tracking-[0.28em] text-white/78">
          Slide For Panic
        </div>
        <button
          type="button"
          disabled={disabled || busy}
          onMouseDown={(event) => {
            if (disabled || busy) return;
            setDragging(true);
            updateDrag(event.clientX);
          }}
          onTouchStart={(event) => {
            if (disabled || busy) return;
            setDragging(true);
            updateDrag(event.touches[0]?.clientX ?? 0);
          }}
          className="absolute top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white text-black shadow-lg transition"
          style={{ left: `calc(${Math.min(slideProgress, 0.9) * 100}% - 1.5rem)` }}
        >
          <Siren className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
