import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5174,
    proxy: {
      // Dev: proxy API calls to the backend container/host.
      // Use 127.0.0.1 (not "localhost") so Node doesn't resolve to IPv6 ::1
      // when the backend listens on IPv4 only.
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:8001",
        changeOrigin: true,
      },
    },
  },
});
