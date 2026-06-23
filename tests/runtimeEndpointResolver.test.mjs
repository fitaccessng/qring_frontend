import test from "node:test";
import assert from "node:assert/strict";
import {
  isProductionRuntimeBaseSafe,
  resolveApiBaseUrl,
  resolvePublicAppUrl,
  resolveSocketUrl
} from "../src/services/runtimeEndpointResolver.js";

test("production runtime URLs never fall back to localhost", () => {
  const apiBaseUrl = resolveApiBaseUrl("", "https://qring-backend-production.up.railway.app/api/v1");
  const socketUrl = resolveSocketUrl("", "https://qring-backend-production.up.railway.app");
  const publicAppUrl = resolvePublicAppUrl("", "https://www.useqring.online");

  assert.equal(apiBaseUrl.includes("localhost"), false);
  assert.equal(socketUrl.includes("localhost"), false);
  assert.equal(publicAppUrl.includes("localhost"), false);
  assert.equal(
    isProductionRuntimeBaseSafe({
      apiBaseUrl,
      socketUrl,
      productionBackendOrigin: "https://qring-backend-production.up.railway.app",
      productionFrontendOrigin: "https://www.useqring.online"
    }),
    true
  );
});
