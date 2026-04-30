import { io } from "socket.io-client";
import { env } from "../config/env";
import { realtimeTransportOptions } from "./socketConfig";
import { getAccessToken } from "./authStorage";

let socket;

export function getDashboardSocket() {
  if (!socket) {
    socket = io(`${env.socketUrl}${env.dashboardNamespace}`, {
      path: env.socketPath,
      ...realtimeTransportOptions,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 400,
      reconnectionDelayMax: 2000,
      timeout: 7000,
      auth: (cb) => {
        const token = getAccessToken();
        cb(token ? { token } : {});
      },
      withCredentials: true,
      autoConnect: true
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
