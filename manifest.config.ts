import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

// 이름·설명·제목은 public/_locales/{ko,en}/messages.json 에서 브라우저 언어에 맞춰 고른다.
export default defineManifest({
  manifest_version: 3,
  name: "__MSG_extName__",
  description: "__MSG_extDescription__",
  default_locale: "en",
  version: pkg.version,
  // 내 이미지·GIF 기능(CUSTOM_IMAGES)을 다시 켜면 "unlimitedStorage" 도 다시 넣는다(큰 GIF 여러 장 저장용)
  permissions: ["storage"],
  background: { service_worker: "src/pages/background/index.ts", type: "module" },
  content_scripts: [
    {
      matches: ["http://*/*", "https://*/*", "file:///*"],
      js: ["src/pages/content/index.ts"],
      run_at: "document_idle",
    },
  ],
  action: {
    default_title: "__MSG_actionTitle__",
    default_icon: { 16: "icons/16.png", 32: "icons/32.png", 48: "icons/48.png", 128: "icons/128.png" },
  },
  icons: { 16: "icons/16.png", 32: "icons/32.png", 48: "icons/48.png", 128: "icons/128.png" },
  commands: {
    "toggle-crew": {
      suggested_key: { default: "Alt+Shift+C" },
      description: "__MSG_cmdToggle__",
    },
  },
});
