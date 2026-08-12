import { test, expect } from "vitest";
import { Capacitor } from "@capacitor/core";

function resetCapacitorMocks() {
  Capacitor.getPlatform = undefined;
  Capacitor.isNativePlatform = undefined;
}

test("shouldUseGoogleAuth enables Google auth for native app runtimes", async () => {
  resetCapacitorMocks();
  Capacitor.isNativePlatform = () => true;
  Capacitor.getPlatform = () => "android";

  // Use a relative import specifier so the test runner resolves the module
  const { shouldUseGoogleAuth } = await import("../src/utils/nativeRuntime.js?t=" + Date.now());
  expect(shouldUseGoogleAuth()).toBe(true);
});

test("shouldUseGoogleAuth stays enabled for web runtimes", async () => {
  resetCapacitorMocks();
  Capacitor.isNativePlatform = () => false;
  Capacitor.getPlatform = () => "web";

  const { shouldUseGoogleAuth } = await import("../src/utils/nativeRuntime.js?t=" + Date.now());
  expect(shouldUseGoogleAuth()).toBe(true);
});
