// 콘텐츠 스크립트 진입점. 모든 페이지에 들어가므로 React 없이 가볍게(바닐라 TS + Shadow DOM).
// 설정을 읽어 펫(Crew)을 띄우고, 설정·이미지·테마가 바뀌면 다시 만든다.
import { loadImages, loadSettings, memoKey, isImageKey } from "@src/shared/settings";
import { makeT, resolveLang } from "@src/shared/i18n";
import { isDark, onSystemThemeChange } from "@src/shared/theme";
import { getSkin } from "@src/shared/skins";
import { Crew } from "./crew";
import type { Point } from "./actions";

declare global {
  interface Window {
    __cursorCrew?: boolean;
  }
}

function start() {
  if (window.top !== window || window.__cursorCrew) return;
  window.__cursorCrew = true;

  let crew: Crew | null = null;
  let lastMouse: Point | null = null;
  let themePref: Parameters<typeof isDark>[0] = "system";
  addEventListener("mousemove", (e) => (lastMouse = { x: e.clientX, y: e.clientY }), { passive: true, capture: true });

  const excluded = (list: string[]) => {
    const host = location.hostname;
    return (list || []).some((raw) => {
      const s = String(raw).trim().toLowerCase().replace(/^\*\./, "");
      return !!s && (host === s || host.endsWith("." + s));
    });
  };

  async function apply() {
    const cfg = await loadSettings();
    themePref = cfg.theme;
    const on = cfg.enabled && !excluded(cfg.excluded);
    const images = on && getSkin(cfg.skin).needsImage ? await loadImages() : null;
    if (crew) {
      lastMouse = crew.mouse || lastMouse;
      crew.destroy();
      crew = null;
    }
    if (!on) return;
    crew = new Crew({ cfg, mouse: lastMouse, images, t: makeT(resolveLang(cfg.lang)), dark: isDark(cfg.theme) });
    if (lastMouse) void crew.maybeHint();
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" || (area === "local" && Object.keys(changes).some(isImageKey))) void apply();
    else if (area === "local" && crew && changes[memoKey()]) void crew.refreshMemo();
  });
  onSystemThemeChange(() => crew?.setDark(isDark(themePref)));
  void apply();
}

start();
