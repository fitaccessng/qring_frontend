import { env } from "../config/env";

function buildUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${env.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

async function uploadVoiceNote({ url, token, file }) {
  const form = new FormData();
  form.append("media", file);

  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(url), {
    method: "POST",
    headers,
    body: form
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.message ?? payload?.detail ?? "Unable to upload voice note";
    throw new Error(message);
  }
  return payload?.data ?? null;
}

export async function uploadVisitorVoiceNote(sessionId, file) {
  return uploadVoiceNote({
    url: `/visitor/sessions/${encodeURIComponent(sessionId)}/voice-notes`,
    token: "",
    file
  });
}

export async function uploadHomeownerVoiceNote(sessionId, file) {
  const token = localStorage.getItem("qring_access_token");
  return uploadVoiceNote({
    url: `/homeowner/messages/${encodeURIComponent(sessionId)}/voice-notes`,
    token,
    file
  });
}

export function resolveVoiceNoteUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${env.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
