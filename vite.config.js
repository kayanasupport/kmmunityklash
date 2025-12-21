import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    hmr: { overlay: true }, // keep overlay visible while debugging
  },
  preview: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: "dist",
  },
});
