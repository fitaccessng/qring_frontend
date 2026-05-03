import { actOnSecurityRequest } from "./securityService";

const STORAGE_KEY = "qring_security_offline_queue_v1";

function readQueue() {
  try {
    const rows = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function writeQueue(rows) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // ignore storage failures
  }
}

export function listQueuedSecurityActions() {
  return readQueue();
}

export function enqueueSecurityAction(sessionId, action) {
  const next = [
    ...readQueue(),
    {
      id: `${sessionId}:${action}:${Date.now()}`,
      sessionId,
      action,
      queuedAt: new Date().toISOString()
    }
  ];
  writeQueue(next);
  return next;
}

export async function flushQueuedSecurityActions() {
  const rows = readQueue();
  if (!rows.length) return { flushed: 0, remaining: 0 };
  const remaining = [];
  let flushed = 0;
  for (const row of rows) {
    try {
      await actOnSecurityRequest(row.sessionId, row.action);
      flushed += 1;
    } catch (error) {
      if (Number(error?.status ?? 0) === 0) {
        remaining.push(row);
      }
    }
  }
  writeQueue(remaining);
  return { flushed, remaining: remaining.length };
}
