const KEY_PREFIX = "qring_visitor_session_token:";

export function storeVisitorSessionToken(sessionId, token) {
  const sid = String(sessionId || "").trim();
  const raw = String(token || "").trim();
  if (!sid || !raw) return;
  try {
    localStorage.setItem(`${KEY_PREFIX}${sid}`, raw);
  } catch {
    // ignore storage failures (private mode)
  }
}

export function getVisitorSessionToken(sessionId) {
  const sid = String(sessionId || "").trim();
  if (!sid) return "";
  try {
    return localStorage.getItem(`${KEY_PREFIX}${sid}`) || "";
  } catch {
    return "";
  }
}

export function clearVisitorSessionToken(sessionId) {
  const sid = String(sessionId || "").trim();
  if (!sid) return;
  try {
    localStorage.removeItem(`${KEY_PREFIX}${sid}`);
  } catch {
    // ignore
  }
}

