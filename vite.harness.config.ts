import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// pnpm harness → 확장 없이 브라우저에서 펫(콘텐츠 스크립트)과 설정 창을 미리 보는 개발 서버.
// chrome.* 는 test/chrome-shim.ts 가 흉내 낸다(저장은 그 페이지의 localStorage).
//   http://localhost:5181/harness.html   펫
//   http://localhost:5181/options.html   설정 창
export default defineConfig({
  root: resolve(__dirname, "test"),
  publicDir: resolve(__dirname, "public"),
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@src": resolve(__dirname, "src") } },
  server: { port: 5181, strictPort: true },
});
