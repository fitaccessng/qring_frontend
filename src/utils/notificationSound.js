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

