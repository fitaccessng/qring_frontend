import { test, expect } from "vitest";
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

  expect(apiBaseUrl.includes("localhost")).toBe(false);
  expect(socketUrl.includes("localhost")).toBe(false);
  expect(publicAppUrl.includes("localhost")).toBe(false);
  expect(
    isProductionRuntimeBaseSafe({
      apiBaseUrl,
      socketUrl,
      productionBackendOrigin: "https://qring-backend-production.up.railway.app",
      productionFrontendOrigin: "https://www.useqring.online"
    })
  ).toBe(true);
});
