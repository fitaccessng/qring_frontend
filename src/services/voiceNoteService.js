import { buildApiUrl } from "./apiClient";
import { getAccessToken } from "./authStorage";
import { getVisitorSessionToken } from "./visitorSessionToken";

const VOICE_NOTE_TIMEOUT_MS = 45000;
const VOICE_NOTE_RETRY_COUNT = 2;

function buildUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return buildApiUrl(path);
}

function parseJsonSafely(value) {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

async function uploadVoiceNote({ url, token, file, headers: extraHeaders }, attempt = 0) {
  const form = new FormData();
  form.append("media", file);

  const headers = { ...(extraHeaders || {}) };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("POST", buildUrl(url), true);
      request.timeout = VOICE_NOTE_TIMEOUT_MS;
      Object.entries(headers).forEach(([key, value]) => {
        if (value != null && value !== "") {
          request.setRequestHeader(key, value);
        }
      });
      request.onload = () => {
        resolve({
          ok: request.status >= 200 && request.status < 300,
          status: request.status,
          payload: parseJsonSafely(request.responseText),
        });
      };
      request.onerror = () => reject(new Error("NetworkError"));
      request.ontimeout = () => {
        const timeoutError = new Error("AbortError");
        timeoutError.name = "AbortError";
        reject(timeoutError);
      };
      request.send(form);
    });

    if (!response.ok) {
      if (response.status >= 500 && attempt < VOICE_NOTE_RETRY_COUNT) {
        return uploadVoiceNote({ url, token, file, headers: extraHeaders }, attempt + 1);
      }
      const message = response.payload?.message ?? response.payload?.detail ?? "Unable to upload voice note";
      throw new Error(message);
    }

    return response.payload?.data ?? null;
  } catch (error) {
    if (attempt < VOICE_NOTE_RETRY_COUNT) {
      return uploadVoiceNote({ url, token, file, headers: extraHeaders }, attempt + 1);
    }
    if (error?.name === "AbortError") {
      throw new Error("Voice note upload timed out. Please try again.");
    }
    throw new Error("Voice note upload failed. Please check your connection and try again.");
  }
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
