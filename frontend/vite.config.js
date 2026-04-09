import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        forecast: resolve(__dirname, "forecast.html"),
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});
