const required = ["VITE_LIVEKIT_URL"];

const missing = required.filter((name) => {
  const value = process.env[name];
  return !value || !String(value).trim();
});

if (missing.length > 0) {
  console.error(
    `[prebuild] Missing required environment variable(s): ${missing.join(", ")}. ` +
      "Set them before building."
  );
  process.exit(1);
}

const url = String(process.env.VITE_LIVEKIT_URL || "").trim();
const looksValid = /^wss?:\/\//i.test(url) || /^https?:\/\//i.test(url);

if (!looksValid) {
  console.error(
    `[prebuild] VITE_LIVEKIT_URL must start with wss://, ws://, https://, or http://. Received: ${url}`
  );
  process.exit(1);
}

console.log("[prebuild] LiveKit env check passed.");
