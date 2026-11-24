import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.config";

// pnpm build → dist/ (크롬에서 압축해제 로드할 폴더)
// pnpm dev   → 파일이 바뀔 때마다 dist/ 를 다시 빌드
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  resolve: { alias: { "@src": resolve(__dirname, "src") } },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: mode === "development",
    rollupOptions: {
      // 설정 창은 manifest 에 없는 페이지라(아이콘을 누르면 창으로 연다) 따로 입력에 넣는다
      input: { options: resolve(__dirname, "src/pages/options/index.html") },
    },
  },
}));
