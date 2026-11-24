// 크롬 웹 스토어용 스크린샷·프로모션 이미지를 만든다.
// 사용: pnpm store:shots  →  store/en/*.png, store/ko/*.png
//
// 하는 일: 하네스(test/)를 정적으로 빌드 → 이 스크립트 안의 작은 HTTP 서버로 띄움 →
// 설치된 크롬을 headless 로 켜서 DevTools 프로토콜로 마우스·Alt 키를 흉내 내며 찍는다.
// 확장을 실제로 설치하지 않고 test/chrome-shim.ts 로 chrome.* 를 흉내 낸 페이지를 찍는다.
import { build } from "vite";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = join(root, "node_modules", ".store-shots");
const storeDir = join(root, "store");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------ 1. 하네스 빌드
await build({
  configFile: join(root, "vite.harness.config.ts"),
  logLevel: "warn",
  build: {
    outDir: out,
    emptyOutDir: true,
    rollupOptions: { input: { scene: join(root, "test/store-scene.html"), options: join(root, "test/options.html") } },
  },
});

// ------------------------------------------------------------ 2. 정적 서버
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".gif": "image/gif", ".json": "application/json", ".svg": "image/svg+xml" };
const server = createServer((req, res) => {
  const path = normalize(join(out, decodeURIComponent(new URL(req.url, "http://x").pathname)));
  if (!path.startsWith(out) || !existsSync(path)) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": TYPES[extname(path)] || "application/octet-stream" }).end(readFileSync(path));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
// 스크린샷 속 메모 창에 127.0.0.1 대신 가상의 주소가 보이도록 크롬에서 이 이름을 로컬 서버로 돌린다
const SCENE_HOST = "fieldnotes.example";
const base = `http://${SCENE_HOST}:${server.address().port}`;

// ------------------------------------------------------------ 3. 크롬(headless) + DevTools 프로토콜
const CHROME = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find((p) => p && existsSync(p));
if (!CHROME) throw new Error("크롬을 찾지 못했어요. CHROME_PATH 환경 변수로 경로를 알려 주세요.");

const profile = mkdtempSync(join(tmpdir(), "crew-shots-"));
const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--hide-scrollbars", "--force-device-scale-factor=1", "--lang=en-US", `--host-resolver-rules=MAP ${SCENE_HOST} 127.0.0.1`, "about:blank"], { stdio: "ignore" });

let port;
for (let i = 0; i < 100 && !port; i++) {
  await sleep(100);
  const f = join(profile, "DevToolsActivePort");
  if (existsSync(f)) port = readFileSync(f, "utf8").split("\n")[0];
}
if (!port) throw new Error("크롬 DevTools 포트를 열지 못했어요.");
const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => ((ws.onopen = r), (ws.onerror = j)));
let seq = 0;
const pending = new Map();
const waiters = [];
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    const { ok, fail } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? fail(new Error(msg.error.message)) : ok(msg.result);
  } else if (msg.method) for (const w of waiters.splice(0)) w(msg);
};
const send = (method, params = {}) =>
  new Promise((ok, fail) => {
    const id = ++seq;
    pending.set(id, { ok, fail });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result.value;

await send("Page.enable");
await send("Runtime.enable");

async function open(path, { w, h, sync = {}, local = {} }) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  // 하네스 저장소(localStorage)를 미리 채워 둔다: 첫 안내는 본 것으로, 언어·테마는 지정한 대로
  await send("Page.navigate", { url: base + path });
  await sleep(300);
  await evaluate(`localStorage.clear();
    localStorage.setItem("__crewShim:sync", ${JSON.stringify(JSON.stringify(sync))});
    localStorage.setItem("__crewShim:local", ${JSON.stringify(JSON.stringify({ crewHintSeen: 1, ...local }))}); true`);
  await send("Page.reload");
  await sleep(900);
  if (path === "/store-scene.html") await evaluate(`history.replaceState(null, "", "/essays/a-slower-way"); true`);
}

let mouse = { x: 0, y: 0 };
let mods = 0; // 1 = Alt
async function moveTo(x, y, steps = 24, ms = 16) {
  const from = { ...mouse };
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const e = t * t * (3 - 2 * t);
    mouse = { x: from.x + (x - from.x) * e, y: from.y + (y - from.y) * e };
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: mouse.x, y: mouse.y, modifiers: mods });
    await sleep(ms);
  }
}
const altDown = async () => {
  mods = 1;
  await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Alt", code: "AltLeft", windowsVirtualKeyCode: 18, modifiers: 1 });
};
const altUp = async () => {
  mods = 0;
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Alt", code: "AltLeft", windowsVirtualKeyCode: 18, modifiers: 0 });
};
async function click(x, y) {
  await moveTo(x, y, 8);
  for (const type of ["mousePressed", "mouseReleased"])
    await send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1, modifiers: mods });
}

// 헤드리스 화면에는 진짜 마우스 커서가 안 찍히므로, 스크린샷용 화살표를 페이지에 그려 둔다
const FAKE_CURSOR = `(() => {
  const c = document.createElement("div");
  c.innerHTML = '<svg width="22" height="30" viewBox="0 0 22 30"><path d="M2 2 L2 24 L8 18.5 L12 28 L16 26.3 L12 17 L20 17 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  c.style.cssText = "position:fixed;left:0;top:0;z-index:2147483646;pointer-events:none;transform:translate(-2px,-2px)";
  document.documentElement.appendChild(c);
  addEventListener("mousemove", (e) => { c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px"; }, true);
  return true;
})()`;

async function shot(file, clip) {
  const { data } = await send("Page.captureScreenshot", { format: "png", ...(clip ? { clip: { ...clip, scale: clip.scale || 1 } } : {}) });
  const buf = Buffer.from(data, "base64");
  if (file) {
    writeFileSync(file, buf);
    console.log("  " + file.slice(root.length));
  }
  return buf;
}
const petRects = () =>
  evaluate(`[...document.querySelector("[data-cursor-crew]").shadowRoot.querySelectorAll(".pet .hit")].map((el) => {
    const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  })`);

// 이미지 여러 장을 한 화면에 배치해서 찍는다(설정 창 2장, 프로모션 타일)
async function compose(file, w, h, html) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  const { frameTree } = await send("Page.getFrameTree");
  await send("Page.navigate", { url: "about:blank" });
  await sleep(200);
  await send("Page.setDocumentContent", { frameId: frameTree.frame.id, html });
  await sleep(400);
  return shot(file);
}
const png = (buf) => "data:image/png;base64," + buf.toString("base64");

const TEXT = {
  en: {
    memo: "Come back to the part about bookmarks.",
    settings: "Pick your pets, their shortcuts, skins, language and theme",
    light: "Light",
    dark: "Dark",
    tagline: "Tiny pixel pets that follow your mouse",
    sub: "Hold Alt, click a pet, and it opens your link, copies the URL or saves a memo.",
  },
  ko: {
    memo: "북마크 이야기 부분 다시 읽기",
    settings: "펫 개수, 기능, 모양, 언어, 테마를 내 마음대로",
    light: "라이트",
    dark: "다크",
    tagline: "마우스를 따라다니는 작은 도트 펫",
    sub: "Alt를 누른 채 펫을 클릭하면 링크 열기, URL 복사, 메모가 바로 실행돼요.",
  },
};

try {
  for (const lang of ["en", "ko"]) {
    const T = TEXT[lang];
    const dir = join(storeDir, lang);
    mkdirSync(dir, { recursive: true });
    console.log(`[${lang}]`);
    const sync = { lang, theme: "light", size: 44 };

    // 1) 따라다니기
    await open("/store-scene.html", { w: 1280, h: 800, sync });
    await evaluate(FAKE_CURSOR);
    mouse = { x: 180, y: 640 };
    await moveTo(420, 470, 30);
    await moveTo(700, 360, 40);
    await moveTo(760, 380, 8, 30);
    await sleep(120);
    await shot(join(dir, "screenshot-1-follow.png"));

    // 2) Alt 를 누르고 있으면 펫이 멈추고 하는 일이 보인다
    await sleep(900);
    await altDown();
    await moveTo(770, 386, 4);
    await sleep(500);
    const pets = await petRects();
    await moveTo(pets[0].x - 4, pets[0].y - 4, 16);
    await sleep(350);
    await shot(join(dir, "screenshot-2-alt.png"));

    // 프로모션 타일용으로 펫 부분만 크게 잘라 둔다
    const xs = pets.map((p) => p.x);
    const ys = pets.map((p) => p.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    await evaluate(`document.body.style.visibility = "hidden"; document.body.style.background = "transparent"; document.documentElement.style.background = "transparent"; document.querySelectorAll("svg").forEach((s) => s.parentElement.style.display = "none"); true`);
    await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
    const petsCrop = await shot(null, { x: Math.max(0, cx - 190), y: Math.max(0, cy - 90), width: 380, height: 170, scale: 2 });
    await send("Emulation.setDefaultBackgroundColorOverride", {});
    await evaluate(`document.body.style.visibility = ""; document.body.style.background = ""; document.documentElement.style.background = ""; true`);

    // 3) 메모 펫을 Alt+클릭 → 페이지 메모
    const memoAt = pets[pets.length - 1];
    await click(memoAt.x, memoAt.y);
    await altUp();
    await sleep(400);
    await send("Input.insertText", { text: T.memo });
    await sleep(1200); // 자동 저장 표시가 "저장됨"이 될 때까지
    await shot(join(dir, "screenshot-3-memo.png"));

    // 4) 설정 창(라이트·다크 나란히)
    const opts = [];
    for (const theme of ["light", "dark"]) {
      await open("/options.html", { w: 540, h: 720, sync: { ...sync, theme } });
      opts.push(await shot(null));
    }
    await compose(
      join(dir, "screenshot-4-settings.png"),
      1280,
      800,
      `<html><body style="margin:0;height:800px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;background:linear-gradient(135deg,#fff4e6,#f3f0ff);font-family:system-ui,'Malgun Gothic',sans-serif">
        <div style="font-size:26px;font-weight:700;color:#1f2430">${T.settings}</div>
        <div style="display:flex;gap:40px">${opts
          .map(
            (b, i) => `<figure style="margin:0;text-align:center"><img src="${png(b)}" width="432" height="576" style="border-radius:14px;box-shadow:0 18px 50px rgba(30,20,60,.22);display:block"/>
            <figcaption style="margin-top:12px;color:#6b7280;font-size:15px">${i ? T.dark : T.light}</figcaption></figure>`,
          )
          .join("")}</div></body></html>`,
    );

    // 5) 프로모션 타일 440×280, 마키 1400×560
    const promo = (w, h, big) => `<html><body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;display:flex;align-items:center;justify-content:center;gap:${big ? 60 : 0}px;flex-direction:${big ? "row" : "column"};
        background:linear-gradient(135deg,#ffd8a8,#ffa8a8 50%,#b197fc);font-family:system-ui,'Malgun Gothic',sans-serif;color:#1f2430">
        <div style="text-align:${big ? "left" : "center"};max-width:${big ? 560 : 400}px">
          <div style="font-size:${big ? 72 : 40}px;font-weight:800;letter-spacing:-.02em">Cursor Crew</div>
          <div style="font-size:${big ? 26 : 16}px;font-weight:600;margin-top:${big ? 8 : 2}px">${T.tagline}</div>
          ${big ? `<div style="font-size:19px;margin-top:14px;opacity:.8">${T.sub}</div>` : ""}
        </div>
        <img src="${png(petsCrop)}" style="width:${big ? 560 : 300}px;margin-top:${big ? 0 : 6}px"/>
      </body></html>`;
    await compose(join(dir, "promo-tile-440x280.png"), 440, 280, promo(440, 280, false));
    await compose(join(dir, "marquee-1400x560.png"), 1400, 560, promo(1400, 560, true));
  }
} finally {
  ws.close();
  chrome.kill();
  server.close();
  await sleep(300);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {}
}
console.log("끝. store/en, store/ko 를 확인하세요.");
