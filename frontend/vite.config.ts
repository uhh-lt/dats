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
    };
    // mode === "production"
  } else {
    return {
      ...sharedConfig,
    };
  }
});
