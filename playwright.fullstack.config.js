import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const FRONTEND_PORT = Number(process.env.E2E_PORT || 4174);
const BACKEND_PORT = Number(process.env.E2E_API_PORT || 8102);
const ROOT = path.resolve(import.meta.dirname, "..");
const DB_PATH = path.join(import.meta.dirname, "test-results", "qring-fullstack-e2e.db");
const DATABASE_URL = `sqlite:///${DB_PATH}`;
const API_BASE = `http://127.0.0.1:${BACKEND_PORT}/api/v1`;
const backendEnv = `QRING_E2E_SEED=1 ENVIRONMENT=development DEBUG=false DATABASE_URL=${DATABASE_URL} PYTHONPATH=.`;

export default defineConfig({
  testDir: "./tests/e2e-full",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${FRONTEND_PORT}`,
    trace: "on-first-retry",
    extraHTTPHeaders: { "x-e2e-run": "launch-readiness" },
  },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"], permissions: ["notifications"] } },
    { name: "chromium-mobile", use: { ...devices["Pixel 5"], permissions: ["notifications"] } },
  ],
  webServer: [
    {
      command: `cd ${path.join(ROOT, "backend")} && ${backendEnv} ../.venv/bin/python scripts/seed_launch_e2e.py && ${backendEnv} ../.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port ${BACKEND_PORT}`,
      url: `${API_BASE}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `VITE_API_BASE_URL=${API_BASE} VITE_SOCKET_URL=http://127.0.0.1:${BACKEND_PORT} npm run build -- --logLevel error && VITE_API_BASE_URL=${API_BASE} VITE_SOCKET_URL=http://127.0.0.1:${BACKEND_PORT} npm run preview -- --host 127.0.0.1 --port ${FRONTEND_PORT}`,
      url: `http://127.0.0.1:${FRONTEND_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
