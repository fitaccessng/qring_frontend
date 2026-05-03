import { buildApiUrl } from "./apiClient";
import { getAccessToken } from "./authStorage";
import { getVisitorSessionToken } from "./visitorSessionToken";

const VOICE_NOTE_TIMEOUT_MS = 20000;
const VOICE_NOTE_RETRY_COUNT = 1;

function buildUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return buildApiUrl(path);
}

async function uploadVoiceNote({ url, token, file, headers: extraHeaders }, attempt = 0) {
  const form = new FormData();
  form.append("media", file);

  const headers = { ...(extraHeaders || {}) };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VOICE_NOTE_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(buildUrl(url), {
      method: "POST",
      headers,
      body: form,
      signal: controller.signal
    });
  } catch (error) {
    if (attempt < VOICE_NOTE_RETRY_COUNT) {
      return uploadVoiceNote({ url, token, file, headers: extraHeaders }, attempt + 1);
    }
    if (error?.name === "AbortError") {
      throw new Error("Voice note upload timed out. Please try again.");
    }
    throw new Error("Voice note upload failed. Please check your connection and try again.");
  } finally {
    clearTimeout(timeoutId);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status >= 500 && attempt < VOICE_NOTE_RETRY_COUNT) {
      return uploadVoiceNote({ url, token, file, headers: extraHeaders }, attempt + 1);
    }
    const message = payload?.message ?? payload?.detail ?? "Unable to upload voice note";
    throw new Error(message);
  }
  return payload?.data ?? null;
}

export async function uploadVisitorVoiceNote(sessionId, file) {
  const token = getVisitorSessionToken(sessionId);
  return uploadVoiceNote({
    url: `/visitor/sessions/${encodeURIComponent(sessionId)}/voice-notes`,
    token: "",
    headers: token ? { "X-Visitor-Token": token } : {},
    file
  });
}

export async function uploadHomeownerVoiceNote(sessionId, file) {
  const token = getAccessToken();
  return uploadVoiceNote({
    url: `/homeowner/messages/${encodeURIComponent(sessionId)}/voice-notes`,
    token,
    file
  });
}

export function resolveVoiceNoteUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return buildApiUrl(path);
}
