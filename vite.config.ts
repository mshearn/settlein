import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Served from https://<user>.github.io/settlein/ — keep base in sync with the repo name.
const BASE = "/settlein/";

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "SettleIn — Your Moving Companion",
        short_name: "SettleIn",
        description:
          "A gentle, room-by-room helper for sorting your belongings when downsizing: keep, donate, gift, or sell.",
        theme_color: "#2F5D45",
        background_color: "#F6F2EA",
        display: "standalone",
        orientation: "portrait",
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // The app is local-first; only the Anthropic API needs the network.
        navigateFallback: `${BASE}index.html`,
      },
    }),
  ],
});
