import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
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
