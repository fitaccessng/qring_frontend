import { test, expect } from "vitest";

globalThis.window = globalThis.window || {
  clearTimeout,
  setTimeout
};

const socketFactoryCalls = [];
globalThis.__QRING_SOCKET_IO_FACTORY__ = (target, options) => {
  const listeners = new Map();
  const socket = {
    target,
    options,
    active: true,
    id: `socket-${socketFactoryCalls.length + 1}`,
    disconnect() {
      this.active = false;
    },
    on(event, handler) {
      listeners.set(event, handler);
      return this;
    },
    off(event, handler) {
      if (listeners.get(event) === handler) listeners.delete(event);
      return this;
    },
    io: {
      on(event, handler) {
        listeners.set(`io:${event}`, handler);
        return this;
      },
      off(event, handler) {
        if (listeners.get(`io:${event}`) === handler) listeners.delete(`io:${event}`);
        return this;
      }
    }
  };
  socketFactoryCalls.push({ target, options, socket });
  return socket;
};

const socketClient = await import("../src/services/socketClient.js");

test("reusing the same namespace socket does not create duplicate listeners", () => {
  socketClient.__resetRealtimeSocketCacheForTests();
  socketFactoryCalls.length = 0;

  const first = socketClient.createRealtimeSocket("/realtime/signaling", {
    autoConnect: true,
    reconnection: true,
    withCredentials: true
  });
  const second = socketClient.createRealtimeSocket("/realtime/signaling", {
    autoConnect: true,
    reconnection: true,
    withCredentials: true
  });

  expect(first).toBe(second);
  expect(socketFactoryCalls.length).toBe(1);
  expect(
    socketClient.buildNamespaceSocketKey("/realtime/signaling", { autoConnect: true, reconnection: true, withCredentials: true })
  ).toBe(
    socketClient.buildNamespaceSocketKey("/realtime/signaling", { autoConnect: true, reconnection: true, withCredentials: true })
  );
});
