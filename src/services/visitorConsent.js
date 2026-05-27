const CONSENT_STORAGE_KEY = "qring_visitor_consent";
const CONSENT_MAX_AGE_HOURS = Number.parseInt(import.meta.env.VITE_VISITOR_CONSENT_MAX_AGE_HOURS || "24", 10);
const CONSENT_MAX_AGE_MS = Number.isFinite(CONSENT_MAX_AGE_HOURS) && CONSENT_MAX_AGE_HOURS > 0
  ? CONSENT_MAX_AGE_HOURS * 60 * 60 * 1000
  : 24 * 60 * 60 * 1000;

function getStorage(storageType) {
  if (typeof window === "undefined") return null;
  try {
    return window[storageType] || null;
  } catch {
    return null;
  }
}

function parseConsentRecord(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.consentAccepted) return null;
    const acceptedAt = new Date(parsed.consentAcceptedAt || 0);
    if (!acceptedAt.getTime()) return null;
    return {
      consentAccepted: true,
      consentAcceptedAt: acceptedAt.toISOString(),
      consentStorage: String(parsed.consentStorage || "session").toLowerCase(),
      expiresAt: parsed.expiresAt || null
    };
  } catch {
    return null;
  }
}

function isExpired(record) {
  if (!record?.consentAcceptedAt) return true;
  const acceptedAt = new Date(record.consentAcceptedAt).getTime();
  if (!Number.isFinite(acceptedAt)) return true;
  return Date.now() - acceptedAt > CONSENT_MAX_AGE_MS;
}

export function getVisitorConsent() {
  const sessionStorageRef = getStorage("sessionStorage");
  const localStorageRef = getStorage("localStorage");
  const sessionRecord = parseConsentRecord(sessionStorageRef?.getItem(CONSENT_STORAGE_KEY));
  if (sessionRecord && !isExpired(sessionRecord)) return sessionRecord;

  const localRecord = parseConsentRecord(localStorageRef?.getItem(CONSENT_STORAGE_KEY));
  if (localRecord && !isExpired(localRecord)) return localRecord;

  try {
    sessionStorageRef?.removeItem(CONSENT_STORAGE_KEY);
    localStorageRef?.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    // ignore storage cleanup errors
  }
  return null;
}

export function hasVisitorConsent() {
  return Boolean(getVisitorConsent());
}

export function recordVisitorConsent({ persist = false } = {}) {
  const acceptedAt = new Date().toISOString();
  const record = {
    consentAccepted: true,
    consentAcceptedAt: acceptedAt,
    consentStorage: persist ? "localStorage" : "sessionStorage",
    expiresAt: new Date(Date.now() + CONSENT_MAX_AGE_MS).toISOString()
  };
  const serialized = JSON.stringify(record);
  const sessionStorageRef = getStorage("sessionStorage");
  const localStorageRef = getStorage("localStorage");
  try {
    sessionStorageRef?.setItem(CONSENT_STORAGE_KEY, serialized);
    if (persist) {
      localStorageRef?.setItem(CONSENT_STORAGE_KEY, serialized);
    } else {
      localStorageRef?.removeItem(CONSENT_STORAGE_KEY);
    }
  } catch {
    // ignore storage failures
  }
  return record;
}

export function buildVisitorConsentPayload(record) {
  if (!record?.consentAccepted) return null;
  return {
    consentAccepted: true,
    consentAcceptedAt: record.consentAcceptedAt,
    consentStorage: record.consentStorage || "sessionStorage"
  };
}
