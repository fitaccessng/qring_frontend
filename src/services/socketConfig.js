function isPrivateOrLocalHost(hostname) {
  if (!hostname) return false;
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  return false;
}

function shouldForceWebsocketInDev() {
  const importMetaEnv = (typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env : {};
  if (!importMetaEnv.DEV) return false;
  if (typeof window === "undefined") return false;
  if (window.location.protocol !== "http:") return false;
  return isPrivateOrLocalHost(window.location.hostname);
}

export const realtimeTransportOptions = shouldForceWebsocketInDev()
  ? {
      // On LAN dev, start with polling and upgrade when possible to avoid hard websocket failures.
      transports: ["polling", "websocket"],
      upgrade: true,
      rememberUpgrade: false
    }
  : {
      // In production, allow polling fallback first so websocket startup races or proxy quirks do not hard-fail calls/chat.
      transports: ["websocket", "polling"],
      upgrade: true,
      rememberUpgrade: true
    };
