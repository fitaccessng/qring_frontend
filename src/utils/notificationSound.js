let audioContext = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioContext) {
    audioContext = new Ctx();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

export function getNotificationAudioContextState() {
  if (typeof window === "undefined") return "unavailable";
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return "unavailable";
  if (!audioContext) return "not_created";
  return audioContext.state || "unknown";
}

export async function unlockNotificationAudio() {
  const ctx = getAudioContext();
  if (!ctx) return false;
  try {
    await ctx.resume();
  } catch {
    // Some browsers require a user gesture; keep this non-blocking.
  }

  if (ctx.state !== "running") return false;

  // A tiny near-silent tone helps "unlock" WebAudio on mobile after a gesture.
  playToneSequence([440], 0.02, 0, 0.0005);
  try {
    localStorage.setItem("qring_audio_unlocked", "true");
  } catch {
    // Ignore storage failures (private mode / quota).
  }
  return true;
}

function playToneSequence(frequencies, durationSeconds = 0.12, gapSeconds = 0.06, gainValue = 0.06) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const start = ctx.currentTime;
  frequencies.forEach((freq, index) => {
    const toneStart = start + index * (durationSeconds + gapSeconds);
    const toneEnd = toneStart + durationSeconds;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, toneStart);
    gain.gain.setValueAtTime(0.0001, toneStart);
    gain.gain.exponentialRampToValueAtTime(gainValue, toneStart + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, toneEnd);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(toneStart);
    osc.stop(toneEnd);
  });
}

export function playMessageNotificationSound() {
  playToneSequence([720, 880], 0.1, 0.05, 0.04);
}

export function playIncomingCallNotificationSound() {
  playToneSequence([660, 880, 660], 0.14, 0.05, 0.06);
}

export function playPanicAlertSound() {
  playToneSequence([880, 740, 880, 740, 990], 0.18, 0.06, 0.09);
}
