import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const appBuildTarget = String(process.env.VITE_APP_BUILD_TARGET ?? env.VITE_APP_BUILD_TARGET ?? "").trim().toLowerCase();

  return {
    plugins: [react()],
    define: {
      "process.env.NEXT_PUBLIC_API_BASE_URL": JSON.stringify(process.env.NEXT_PUBLIC_API_BASE_URL ?? env.NEXT_PUBLIC_API_BASE_URL ?? ""),
      "process.env.NEXT_PUBLIC_NATIVE_API_BASE_URL": JSON.stringify(process.env.NEXT_PUBLIC_NATIVE_API_BASE_URL ?? env.NEXT_PUBLIC_NATIVE_API_BASE_URL ?? "")
    },
    resolve: {
      alias: appBuildTarget === "mobile"
        ? {
            "./App": "./AppMobile"
          }
        : undefined
    },
    server: {
      host: "0.0.0.0"
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('firebase/app') || id.includes('firebase/auth')) {
              return 'firebase';
            }
            if (id.includes('react-router-dom')) {
              return 'router';
            }
            if (id.includes('socket.io-client')) {
              return 'socket';
            }
          }
        }
      }
    }
  };
});
