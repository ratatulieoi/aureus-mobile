import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    manifest: true,
    // Dynamic feature boundaries own the meaningful split points. Keep Vite's
    // deterministic shared-chunk extraction rather than package micro-chunks.
    chunkSizeWarningLimit: 600,
  },
}));
