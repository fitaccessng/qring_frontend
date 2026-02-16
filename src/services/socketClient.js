import { io } from "socket.io-client";
import { env } from "../config/env";

let socket;

export function getDashboardSocket() {
  if (!socket) {
    const token = localStorage.getItem("qring_access_token");
    socket = io(`${env.socketUrl}${env.dashboardNamespace}`, {
      path: env.socketPath,
      transports: ["websocket"],
      auth: token ? { token } : undefined,
      withCredentials: true
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
