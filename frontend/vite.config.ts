import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const sharedConfig = {
    plugins: [react()],
    server: {
      strictPort: true,
    },
  };

  if (mode === "development") {
    return {
      ...sharedConfig,
      plugins: [...sharedConfig.plugins, basicSsl()],
      server: {
        ...sharedConfig.server,
        port: parseInt(env.FRONTEND_PORT) || 3000,
        proxy: {
          "/api": {
            target: env.FRONTEND_API_URL,
            changeOrigin: true, // Required for virtual hosted sites
            rewrite: (path) => path.replace(/^\/api/, ""), // Optional: remove /api from the path
          },
          "/content": {
            target: env.FRONTEND_CONTENT_URL,
            changeOrigin: true, // Required for virtual hosted sites
            rewrite: (path) => path.replace(/^\/content/, ""), // Optional: remove /content from the path
          },
          "/sentry-api": {
            target: env.FRONTEND_GLITCHTIP_URL,
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path.replace(/^\/sentry-api/, ""),
          },
        },
      },
    };
    // mode === "production"
  } else {
    return {
      ...sharedConfig,
      port: 3000,
    };
  }
});
