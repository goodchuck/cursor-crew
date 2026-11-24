import type { ThemePref } from "./settings";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** 설정값(system/light/dark)을 지금 다크인지로 */
export function isDark(pref: ThemePref | undefined): boolean {
  if (pref === "dark") return true;
  if (pref === "light") return false;
  return typeof matchMedia === "function" && matchMedia(DARK_QUERY).matches;
}

/** 시스템 다크 모드가 바뀌면 알려 준다. 반환값을 부르면 그만 듣는다. */
export function onSystemThemeChange(fn: () => void): () => void {
  if (typeof matchMedia !== "function") return () => {};
  const mq = matchMedia(DARK_QUERY);
  mq.addEventListener("change", fn);
  return () => mq.removeEventListener("change", fn);
}
