import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const sharedConfig = {
    plugins: [react()],
    server: {
      port: parseInt(env.PORT) || 3000,
      strictPort: true,
    },
  };

  if (mode === "development") {
    return {
      ...sharedConfig,
      plugins: [...sharedConfig.plugins, basicSsl()],
      server: {
        ...sharedConfig.server,
        proxy: {
          "/api": {
            target: env.VITE_APP_SERVER,
            changeOrigin: true, // Required for virtual hosted sites
            rewrite: (path) => path.replace(/^\/api/, ""), // Optional: remove /api from the path
          },
          "/content": {
            target: env.VITE_APP_CONTENT,
            changeOrigin: true, // Required for virtual hosted sites
            rewrite: (path) => path.replace(/^\/content/, ""), // Optional: remove /api from the path
          },
        },
      },
    };
    // mode === "production"
  } else {
    return {
      ...sharedConfig,
    };
  }
});
