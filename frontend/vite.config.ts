import { tanstackRouter } from "@tanstack/router-plugin/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const sharedConfig = {
    plugins: [
      tanstackRouter({
        target: "react",
        autoCodeSplitting: true,
      }),
      react(),
    ],
    server: {
      strictPort: true,
    },
    resolve: {
      alias: {
        "@api": path.resolve(__dirname, "./src/api"),
        "@core": path.resolve(__dirname, "./src/core"),
        "@features": path.resolve(__dirname, "./src/features"),
        "@components": path.resolve(__dirname, "./src/components"),
        "@routes": path.resolve(__dirname, "./src/routes"),
      },
    },
  };

  if (mode === "development") {
    return {
      ...sharedConfig,
      plugins: [...sharedConfig.plugins, basicSsl()],
      server: {
        ...sharedConfig.server,
        port: parseInt(env.PORT) || 3000,
        proxy: {
          "/api": {
            target: env.VITE_APP_SERVER,
            changeOrigin: true, // Required for virtual hosted sites
            rewrite: (path) => path.replace(/^\/api/, ""), // Optional: remove /api from the path
          },
          "/content": {
            target: env.VITE_APP_CONTENT,
            changeOrigin: true, // Required for virtual hosted sites
            rewrite: (path) => path.replace(/^\/content/, ""), // Optional: remove /content from the path
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
