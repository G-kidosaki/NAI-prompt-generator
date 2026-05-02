import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./src/extension/manifest.config.js";

// Chrome 拡張ビルド用設定（vite-plugin-pwa は使わない）
export default defineConfig({
  plugins: [react(), crx({ manifest })],
  base: "",
  publicDir: "public",
  build: {
    outDir: "dist-ext",
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    strictPort: true,
  },
});
