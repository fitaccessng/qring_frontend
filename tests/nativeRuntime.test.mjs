import test from "node:test";
import assert from "node:assert/strict";
import { Capacitor } from "@capacitor/core";

const nativeRuntimeModuleUrl = new URL("../src/utils/nativeRuntime.js", import.meta.url);

function resetCapacitorMocks() {
  Capacitor.getPlatform = undefined;
  Capacitor.isNativePlatform = undefined;
}

test("shouldUseGoogleAuth enables Google auth for native app runtimes", async () => {
  resetCapacitorMocks();
  Capacitor.isNativePlatform = () => true;
  Capacitor.getPlatform = () => "android";

  const { shouldUseGoogleAuth } = await import(`${nativeRuntimeModuleUrl.href}?t=${Date.now()}`);
  assert.equal(shouldUseGoogleAuth(), true);
});

test("shouldUseGoogleAuth stays enabled for web runtimes", async () => {
  resetCapacitorMocks();
  Capacitor.isNativePlatform = () => false;
  Capacitor.getPlatform = () => "web";

  const { shouldUseGoogleAuth } = await import(`${nativeRuntimeModuleUrl.href}?t=${Date.now()}`);
  assert.equal(shouldUseGoogleAuth(), true);
});
