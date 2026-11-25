// 맥/윈도우·리눅스 차이(키 이름, 단축키 표시)
import type { MenuKey } from "./settings";

const nav = typeof navigator !== "undefined" ? navigator : undefined;
const plat = (nav as (Navigator & { userAgentData?: { platform?: string } }) | undefined)?.userAgentData?.platform || nav?.platform || nav?.userAgent || "";
export const IS_MAC = /mac/i.test(plat);

/** 메뉴 키 이름(화면 표시용). 맥은 Option·Control 기호로 */
export function menuKeyLabel(k: MenuKey): string {
  const mac: Record<MenuKey, string> = { Alt: "⌥ Option", Control: "⌃ Control", Shift: "⇧ Shift", AltShift: "⌥⇧ Option+Shift" };
  const pc: Record<MenuKey, string> = { Alt: "Alt", Control: "Ctrl", Shift: "Shift", AltShift: "Alt+Shift" };
  return (IS_MAC ? mac : pc)[k] || k;
}

/** KeyboardEvent.code → 짧은 이름: Backquote → `, Digit0 → 0, KeyQ → Q */
export function codeLabel(code: string): string {
  const named: Record<string, string> = {
    Backquote: "`",
    Minus: "-",
    Equal: "=",
    BracketLeft: "[",
    BracketRight: "]",
    Backslash: "\\",
    Semicolon: ";",
    Quote: "'",
    Comma: ",",
    Period: ".",
    Slash: "/",
    Space: "Space",
    IntlBackslash: "§",
  };
  return named[code] ?? code.replace(/^(Key|Digit)/, "");
}

/** 정렬 전환 키로 쓸 수 없는 키: 조합키, Esc, 숫자 패드(윈도우 Alt 코드 입력), F키·방향키, 편집 키 */
export function isUsableToggleCode(code: string): boolean {
  if (!code) return false;
  if (/^(Alt|Control|Shift|Meta|OS|Numpad|F\d|Arrow)/.test(code)) return false;
  return !["Escape", "Enter", "Backspace", "Delete", "Tab", "CapsLock", "ContextMenu", "Home", "End", "PageUp", "PageDown", "Insert"].includes(code);
}

/** 문장 속 윈도우식 키 이름을 맥식으로 */
export function forPlatform(text: string): string {
  if (!IS_MAC) return text;
  return text.replace(/Alt\+Shift\+C/g, "⌥⇧C").replace(/\bAlt\b/g, "Option").replace(/\bCtrl\b/g, "Control");
}
