import fs from "node:fs";
import path from "node:path";

const required = ["VITE_LIVEKIT_URL"];

function parseEnvFile(source) {
  const env = {};
  const lines = source.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) env[key] = value;
  }
  return env;
}

function hydrateEnvFromFile(filename) {
  const filePath = path.resolve(process.cwd(), filename);
  if (!fs.existsSync(filePath)) return;
  const parsed = parseEnvFile(fs.readFileSync(filePath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (!process.env[key] && typeof value === "string") {
      process.env[key] = value;
    }
  }
}

// Load production env template for CI/builds where env vars are not injected.
hydrateEnvFromFile(".env.production");
hydrateEnvFromFile(".env");

const missing = required.filter((name) => {
  const value = process.env[name];
  return !value || !String(value).trim();
});

if (missing.length > 0) {
  console.error(
      `[prebuild] Missing required environment variable(s): ${missing.join(", ")}.\n` +
      "[prebuild] Set them in your deploy provider environment settings or in .env.production/.env before building.\n" +
      "[prebuild] Example:\n" +
      "[prebuild] VITE_LIVEKIT_URL=wss://qring-yovnizqn.livekit.cloud"
  );
  process.exit(1);
}

const url = String(process.env.VITE_LIVEKIT_URL || "").trim();
const looksValid = /^wss?:\/\//i.test(url) || /^https?:\/\//i.test(url);
const isLocalhostLike = /:\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/i.test(url);
const isProductionBuild =
  String(process.env.NODE_ENV || "").trim().toLowerCase() === "production" ||
  String(process.env.RENDER || "").trim() === "true";

if (!looksValid) {
  console.error(
    `[prebuild] VITE_LIVEKIT_URL must start with wss://, ws://, https://, or http://. Received: ${url}`
  );
  process.exit(1);
}

if (isProductionBuild && !isLocalhostLike && !/^wss:\/\//i.test(url)) {
  console.error(
    `[prebuild] Production LiveKit URL must use wss://. Received: ${url}`
  );
  process.exit(1);
}

console.log("[prebuild] LiveKit env check passed.");
