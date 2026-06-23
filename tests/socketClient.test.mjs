import test from "node:test";
import assert from "node:assert/strict";

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

  assert.equal(first, second);
  assert.equal(socketFactoryCalls.length, 1);
  assert.equal(
    socketClient.buildNamespaceSocketKey("/realtime/signaling", { autoConnect: true, reconnection: true, withCredentials: true }),
    socketClient.buildNamespaceSocketKey("/realtime/signaling", { autoConnect: true, reconnection: true, withCredentials: true })
  );
});
