import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // registerType: "autoUpdate",
      strategies: "injectManifest",
      filename: "sw.ts",
      srcDir: "src",
      devOptions: { enabled: true },
      injectManifest: {
        globPatterns: ["**"],
      },
      manifest: {
        name: "Evidence Based Scheduling",
        short_name: "EBS",
        description:
          "Evidence based TODO app with DAG based dependency management",
        display: "standalone",
        theme_color: "#000000",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      "/api_v1.Api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  base: "./",
});
