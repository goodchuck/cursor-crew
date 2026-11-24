// background · content · options 가 함께 쓰는 설정 모양과 기본값.

export type ActionId = "link" | "memo" | "copy" | "top";
export type SkinId = "slime" | "cursor" | "image";
export type MenuKey = "Alt" | "Control" | "Shift" | "off";
export type ThemePref = "system" | "light" | "dark";
export type LangPref = "auto" | "ko" | "en";

/** 원형 메뉴의 항목 하나. name 이 비어 있으면 기능 이름(언어에 맞춰)을 보여 준다. */
export interface MenuItem {
  name: string;
  color: string;
  action: ActionId;
  url?: string;
}

/** chrome.storage.sync 에 저장되는 설정 */
export interface Settings {
  enabled: boolean;
  /** 누르고 있는 동안 원형 메뉴가 펼쳐지는 키 */
  menuKey: MenuKey;
  /** 펫을 띄우지 않을 사이트(hostname, 하위 도메인 포함) */
  excluded: string[];
  skin: SkinId;
  /** 화면에 보이는 펫 수(1~3) */
  pets: number;
  /** 펫 크기(px) */
  size: number;
  /** 평소 투명도(메뉴가 열리면 1) */
  opacity: number;
  petColors: string[];
  /** 내 이미지 스킨: 도트 그림을 흐리지 않고 또렷하게(image-rendering: pixelated) */
  imagePixelated: boolean;
  theme: ThemePref;
  lang: LangPref;
  /** 원형 메뉴 항목(12시 방향부터 시계 방향) */
  crew: MenuItem[];
}

export const DEFAULTS: Settings = {
  enabled: true,
  menuKey: "Alt",
  excluded: [],
  skin: "slime",
  pets: 1,
  size: 36,
  opacity: 0.9,
  petColors: ["#5BD16A", "#5AB8F0", "#F28AC0"],
  imagePixelated: false,
  theme: "system",
  lang: "auto",
  crew: [
    { name: "GitHub", color: "#0D99FF", action: "link", url: "https://github.com" },
    { name: "YouTube", color: "#F24E1E", action: "link", url: "https://www.youtube.com" },
    { name: "Gmail", color: "#0ACF83", action: "link", url: "https://mail.google.com" },
    { name: "", color: "#A259FF", action: "memo" },
  ],
};

/** 메뉴에 넣을 수 있는 기능. 새 기능: 여기 + content/actions.ts + i18n 의 action.<id> */
export const ACTION_IDS: ActionId[] = ["link", "memo", "copy", "top"];
export const ACTION_NEEDS_URL: Record<ActionId, boolean> = { link: true, memo: false, copy: false, top: false };

export const COLORS = ["#0D99FF", "#F24E1E", "#0ACF83", "#A259FF", "#FF7262", "#E8A100", "#E8467C", "#14AE5C", "#9747FF", "#00B5CE"];
export const MAX_CREW = 8;
export const MAX_PETS = 3;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** 펫마다 올린 이미지(chrome.storage.local). skinImage 는 v0.4 이전 키 */
export const IMAGE_KEYS = ["skinImage0", "skinImage1", "skinImage2"] as const;
const LEGACY_IMAGE_KEY = "skinImage";

export async function loadSettings(): Promise<Settings> {
  const got = (await chrome.storage.sync.get(DEFAULTS as unknown as Record<string, unknown>)) as unknown as Settings;
  return { ...DEFAULTS, ...got };
}

export function saveSettings(patch: Partial<Settings>): Promise<void> {
  return chrome.storage.sync.set(patch);
}

export async function loadImages(): Promise<(string | null)[]> {
  const got = (await chrome.storage.local.get([...IMAGE_KEYS, LEGACY_IMAGE_KEY])) as Record<string, string | undefined>;
  return [got.skinImage0 || got[LEGACY_IMAGE_KEY] || null, got.skinImage1 || null, got.skinImage2 || null];
}

export async function saveImage(i: number, url: string | null): Promise<void> {
  if (url) await chrome.storage.local.set({ [IMAGE_KEYS[i]]: url });
  else await chrome.storage.local.remove(IMAGE_KEYS[i]);
  await chrome.storage.local.remove(LEGACY_IMAGE_KEY);
}

export const isImageKey = (k: string) => k.startsWith("skinImage");

/** 페이지별 메모 키(주소의 경로까지) */
export const memoKey = (loc: { origin: string; pathname: string } = location) => "memo:" + loc.origin + loc.pathname;

export interface Memo {
  text: string;
  title?: string;
  url?: string;
  updated: number;
}

/** 첫 안내 말풍선을 이미 보여 줬는지(chrome.storage.local) */
export const HINT_SEEN_KEY = "crewHintSeen";
