import { useEffect } from "react";
import { getDashboardSocket } from "../services/socketClient";

export function useSocketEvents(eventMap) {
  useEffect(() => {
    const socket = getDashboardSocket();
    const entries = Object.entries(eventMap ?? {});
    entries.forEach(([event, handler]) => socket.on(event, handler));
    return () => {
      entries.forEach(([event, handler]) => socket.off(event, handler));
    };
  }, [eventMap]);
}
