// Vitest setup: provide lightweight browser-like globals for tests
if (typeof globalThis.window === "undefined") globalThis.window = {};
if (!globalThis.window.location) globalThis.window.location = { origin: "http://localhost" };
if (!globalThis.window.matchMedia) globalThis.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });

class DummyObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
}

globalThis.ResizeObserver = globalThis.ResizeObserver || DummyObserver;
globalThis.IntersectionObserver = globalThis.IntersectionObserver || DummyObserver;

if (!globalThis.localStorage) {
  const store = {};
  globalThis.localStorage = {
    getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem(key, value) { store[key] = String(value); },
    removeItem(key) { delete store[key]; },
    clear() { Object.keys(store).forEach(k => delete store[k]); }
  };
}
if (!globalThis.sessionStorage) globalThis.sessionStorage = globalThis.localStorage;

if (!globalThis.crypto) globalThis.crypto = { randomUUID: () => `test-${Math.random().toString(36).slice(2)}` };

if (!globalThis.WebSocket) globalThis.WebSocket = function MockWebSocket() {};

// Minimal Capacitor shim to allow imports and runtime toggles in tests
if (typeof globalThis.Capacitor === "undefined") {
  globalThis.Capacitor = {
    isNativePlatform: () => false,
    getPlatform: () => "web"
  };
}
