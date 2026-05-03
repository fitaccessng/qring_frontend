const STORAGE_KEY = "qring_demo_requests";

function safeParse(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `demo_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function getDemoRequests() {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return safeParse(raw);
}

export function addDemoRequest(payload) {
  if (typeof window === "undefined") return null;
  const next = {
    id: makeId(),
    createdAt: new Date().toISOString(),
    ...payload
  };
  const current = getDemoRequests();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([next, ...current].slice(0, 250)));
  return next;
}

export function removeDemoRequest(id) {
  if (typeof window === "undefined") return;
  const current = getDemoRequests();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(current.filter((item) => item?.id !== id))
  );
}

export function clearDemoRequests() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

