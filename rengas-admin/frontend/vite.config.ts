import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  const backendUrl =
    env.VITE_BACKEND_URL || "http://127.0.0.1:3002";

  return {
    plugins: [react()],

    server: {
      port: 5174,
      strictPort: true,

      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },

        "/uploads": {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});