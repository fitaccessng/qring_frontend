import { io } from "socket.io-client";
import { env } from "../config/env";
import { realtimeTransportOptions } from "./socketConfig";
import { getAccessToken } from "./authStorage";

let socket;

export function createRealtimeSocket(namespace, options = {}) {
  const {
    authBuilder,
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 10,
    reconnectionDelay = 400,
    reconnectionDelayMax = 2000,
    timeout = 7000,
    withCredentials = true,
    ...rest
  } = options;

  return io(`${env.socketUrl}${namespace}`, {
    path: env.socketPath,
    ...realtimeTransportOptions,
    reconnection,
    reconnectionAttempts,
    reconnectionDelay,
    reconnectionDelayMax,
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
