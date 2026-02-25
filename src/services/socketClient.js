import { io } from "socket.io-client";
import { env } from "../config/env";

let socket;

export function getDashboardSocket() {
  if (!socket) {
    socket = io(`${env.socketUrl}${env.dashboardNamespace}`, {
      path: env.socketPath,
      transports: ["websocket", "polling"],
      rememberUpgrade: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 400,
      reconnectionDelayMax: 2000,
      timeout: 7000,
      auth: (cb) => {
        const token = localStorage.getItem("qring_access_token");
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
