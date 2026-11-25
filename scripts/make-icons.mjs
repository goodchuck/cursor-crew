// 확장 아이콘을 다시 만든다: pnpm icons → public/icons/{16,32,48,128}.png
// 그림은 scripts/icon/icon.html(16×16 도트 격자)에 있고, 설치된 크롬을 headless 로 열어 PNG 로 뽑는다.
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const CHROME = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find((p) => p && existsSync(p));
if (!CHROME) throw new Error("크롬을 찾지 못했어요. CHROME_PATH 환경 변수로 경로를 알려 주세요.");

const page = pathToFileURL(root + "scripts/icon/icon.html").href;
const dom = execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--dump-dom", page], { encoding: "utf8" });
const json = dom.match(/<pre id="out">([^<]+)<\/pre>/)?.[1];
if (!json) throw new Error("아이콘을 뽑지 못했어요.");
for (const [size, b64] of Object.entries(JSON.parse(json))) {
  writeFileSync(root + `public/icons/${size}.png`, Buffer.from(b64, "base64"));
  console.log(`  public/icons/${size}.png`);
}
