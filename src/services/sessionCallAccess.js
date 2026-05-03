const STORAGE_KEY = "qring_session_call_access";
const ACTIVE_STATES = new Set(["incoming", "connected"]);
const ACCESS_TTL_MS = 5 * 60 * 1000;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function readStore() {
  if (!canUseStorage()) return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store) {
  if (!canUseStorage()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore storage write failures
  }
}

export function grantSessionCallAccess(sessionId, state = "incoming") {
  if (!sessionId || !ACTIVE_STATES.has(state)) return;
  const store = readStore();
  store[sessionId] = {
    state,
    expiresAt: Date.now() + ACCESS_TTL_MS
  };
  writeStore(store);
}

export function clearSessionCallAccess(sessionId) {
  if (!sessionId) return;
  const store = readStore();
  if (!store[sessionId]) return;
  delete store[sessionId];
  writeStore(store);
}

export function hasSessionCallAccess(sessionId) {
  if (!sessionId) return false;
  const store = readStore();
  const entry = store[sessionId];
  if (!entry) return false;
  const valid = ACTIVE_STATES.has(entry.state) && Number(entry.expiresAt) > Date.now();
  if (!valid) {
    delete store[sessionId];
    writeStore(store);
    return false;
  }
  return true;
}
