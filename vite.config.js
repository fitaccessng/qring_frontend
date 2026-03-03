import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || "https://qring-backend-1.onrender.com";

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true
        },
        "/socket.io": {
          target: proxyTarget,
          changeOrigin: true,
          ws: true
        }
      }
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            firebase: ["firebase/app", "firebase/auth"],
            router: ["react-router-dom"],
            socket: ["socket.io-client"]
          }
        }
      }
    }
  };
});
