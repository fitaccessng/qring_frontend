import { io } from "socket.io-client";
import { env } from "../config/env";
import { realtimeTransportOptions } from "./socketConfig";
import { getAccessToken } from "./authStorage";

let socket;
const namespaceSockets = new Map();

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

  const key = JSON.stringify([namespace, Boolean(autoConnect), Boolean(withCredentials), Boolean(reconnection)]);
  const existing = namespaceSockets.get(key);
  if (existing?.connected || existing?.active) {
    return existing;
  }

  const nextSocket = io(`${env.socketUrl}${namespace}`, {
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
  namespaceSockets.set(key, nextSocket);
  nextSocket.on("disconnect", () => {
    if (!nextSocket.active) {
      namespaceSockets.delete(key);
    }
  });
  return nextSocket;
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
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = undefined;
  }
}
