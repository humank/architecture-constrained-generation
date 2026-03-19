/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api/orders": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
      "/api/preparations": {
        target: "http://localhost:8082",
        changeOrigin: true,
      },
      "/api/inventory": {
        target: "http://localhost:8083",
        changeOrigin: true,
      },
      "/api/reporting": {
        target: "http://localhost:8084",
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
  },
});
