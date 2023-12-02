/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: "esnext",
  },
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
        manifestTransforms: [
          async (manifestEntries) => {
            const manifest = manifestEntries.filter(
              (entry) => entry.url !== "index.html",
            );
            return { manifest, warnings: [] };
          },
        ],
      },
      manifest: {
        name: "Evidence Based Scheduling",
        short_name: "EBS",
        description:
          "Evidence based TODO app with DAG based dependency management",
        display: "standalone",
        theme_color: "#000000",
        background_color: "#000000",
        icons: [
          {
            src: "static/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "static/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "static/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      src: path.resolve("src"),
    },
  },
  server: {
    proxy: {
      "/api.v1.ApiService": {
        target: `http://${process.env.LOCALHOST || "localhost"}:${
          process.env.ENVOY_HTTP_PORT || 8080
        }`,
        changeOrigin: true,
        secure: false,
      },
      "/api/v2/": {
        target: `http://${process.env.LOCALHOST || "localhost"}:${
          process.env.ENVOY_HTTP_PORT || 8080
        }`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  base: "./",
  define: {
    "import.meta.vitest": "undefined",
  },
  test: {
    includeSource: ["src/**/*.{js,ts,jsx,tsx}"],
    browser: {
      enabled: true,
      headless: true,
      name: "firefox",
      provider: "playwright",
    },
    coverage: {
      provider: "istanbul",
    },
    testTimeout: process.env.CI ? 40_000 : 10_000,
  },
});
