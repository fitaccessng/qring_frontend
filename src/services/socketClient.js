import { io } from "socket.io-client";
import { env } from "../config/env";
import { realtimeTransportOptions } from "./socketConfig";
import { getAccessToken } from "./authStorage";

let socket;
const namespaceSockets = new Map();
const SOCKET_RELEASE_GRACE_MS = 1500;

function buildNamespaceSocketKey(namespace, options = {}) {
  const {
    autoConnect = true,
    reconnection = true,
    withCredentials = true
  } = options;
  return JSON.stringify([namespace, Boolean(autoConnect), Boolean(withCredentials), Boolean(reconnection)]);
}

export function createRealtimeSocket(namespace, options = {}) {
  const {
    authBuilder,
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = Infinity,
    reconnectionDelay = 700,
    reconnectionDelayMax = 10000,
    timeout = 7000,
    withCredentials = true,
    ...rest
  } = options;

  const key = buildNamespaceSocketKey(namespace, {
    autoConnect,
    reconnection,
    withCredentials
  });
  const existing = namespaceSockets.get(key);
  if (existing?.releaseTimer) {
    window.clearTimeout(existing.releaseTimer);
    existing.releaseTimer = null;
  }
  if (existing?.socket) {
    existing.refCount += 1;
    return existing.socket;
  }

  const socketTarget = `${env.socketUrl}${namespace}`;
  // eslint-disable-next-line no-console
  console.info("qring.socket.connect", {
    namespace,
    socketUrl: env.socketUrl,
    path: env.socketPath,
    target: socketTarget
  });

  const nextSocket = io(socketTarget, {
    path: env.socketPath,
    ...realtimeTransportOptions,
    reconnection,
    reconnectionAttempts,
    reconnectionDelay,
    reconnectionDelayMax,
    randomizationFactor: 0.6,
    timeout,
    auth: (cb) => {
      if (typeof authBuilder === "function") {
        cb(authBuilder() ?? {});
        return;
      }
      const token = getAccessToken();
      cb(token ? { token } : {});
    },
    withCredentials,
    autoConnect,
    ...rest
  });
  namespaceSockets.set(key, {
    key,
    socket: nextSocket,
    refCount: 1,
    releaseTimer: null
  });
  nextSocket.on("disconnect", () => {
    // eslint-disable-next-line no-console
    console.info("qring.socket.disconnect", { namespace, target: socketTarget });
    if (!nextSocket.active) {
      namespaceSockets.delete(key);
    }
  });
  nextSocket.on("connect", () => {
    // eslint-disable-next-line no-console
    console.info("qring.socket.connected", { namespace, id: nextSocket.id, target: socketTarget });
  });
  nextSocket.io.on("reconnect_attempt", (attempt) => {
    // eslint-disable-next-line no-console
    console.info("qring.socket.reconnect_attempt", { namespace, attempt, target: socketTarget });
  });
  return nextSocket;
}

export function releaseRealtimeSocket(namespace, options = {}) {
  const key = buildNamespaceSocketKey(namespace, options);
  const entry = namespaceSockets.get(key);
  if (!entry) return;
  entry.refCount = Math.max(0, Number(entry.refCount || 0) - 1);
  if (entry.refCount > 0) return;
  if (entry.releaseTimer) {
    window.clearTimeout(entry.releaseTimer);
  }
  entry.releaseTimer = window.setTimeout(() => {
    const latest = namespaceSockets.get(key);
    if (!latest || latest.refCount > 0) return;
    latest.socket.disconnect();
    namespaceSockets.delete(key);
  }, SOCKET_RELEASE_GRACE_MS);
}

export function getDashboardSocket() {
  if (!socket) {
    socket = createRealtimeSocket(env.dashboardNamespace, {
      authBuilder: () => {
        const token = getAccessToken();
        return token ? { token } : {};
      }
    });
  }
  return socket;
}

export function closeDashboardSocket() {
  socket = undefined;
}
