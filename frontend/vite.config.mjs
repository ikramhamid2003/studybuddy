import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Migrated from Create React App. Two choices keep deployments unchanged:
//  - outDir stays "build" (Vercel, the Dockerfile and .gitignore all expect it);
//  - REACT_APP_* variables are still exposed, so existing Vercel and Docker
//    settings (REACT_APP_API_URL, REACT_APP_GLITCHTIP_DSN) keep working.
export default defineConfig({
  plugins: [react()],
  envPrefix: ["VITE_", "REACT_APP_"],
  server: { port: 3000 },
  build: { outDir: "build", sourcemap: false },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
    css: false,
    restoreMocks: false,
  },
});
