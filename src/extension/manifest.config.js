import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "../../package.json";

export default defineManifest({
  manifest_version: 3,
  name: "NAI Prompt Generator",
  version: pkg.version,
  description: "NovelAI 用プロンプト生成・カテゴリ管理ツール",
  permissions: ["sidePanel", "storage", "scripting"],
  host_permissions: ["https://novelai.net/*"],
  action: { default_title: "NAI Prompt Generator" },
  side_panel: { default_path: "sidepanel.html" },
  background: { service_worker: "src/extension/background.js", type: "module" },
  content_scripts: [
    {
      matches: ["https://novelai.net/*"],
      js: ["src/extension/content.js"],
      run_at: "document_idle",
      all_frames: false,
    },
  ],
  icons: {
    192: "icon-192.png",
    512: "icon-512.png",
  },
});
