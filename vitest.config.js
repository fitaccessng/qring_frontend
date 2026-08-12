import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: "./vitest.setup.js",
    globals: true,
    include: ["tests/**/*.test.*", "tests/**/*.spec.*", "src/**/*.test.*", "src/**/*.spec.*"],
    exclude: ["**/.gradle-home/**", "**/node_modules/**", "**/android/**", "**/ios/**", "tests/e2e/**", "tests/e2e-full/**"],
    threads: false
  }
});
