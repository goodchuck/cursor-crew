// background · content · options 가 함께 쓰는 설정 모양과 기본값.

export type ActionId = "link" | "memo" | "copy" | "top";
export type SkinId = "slime" | "cursor" | "image";
/** 누르고 있는 동안만 펫이 멈추고 클릭되는 키(조합) */
export type MenuKey = "Alt" | "Control" | "Shift" | "AltShift";
export const MENU_KEYS: MenuKey[] = ["Alt", "Control", "Shift", "AltShift"];

/** 메뉴 키가 요구하는 조합키 */
export const MENU_KEY_SPEC: Record<MenuKey, { alt: boolean; ctrl: boolean; shift: boolean }> = {
  Alt: { alt: true, ctrl: false, shift: false },
  Control: { alt: false, ctrl: true, shift: false },
  Shift: { alt: false, ctrl: false, shift: true },
  AltShift: { alt: true, ctrl: false, shift: true },
};
export type ThemePref = "system" | "light" | "dark";
export type LangPref = "auto" | "ko" | "en";

/** 펫 한 마리 = 기능 하나. color 는 펫 색, name 이 비어 있으면 기능 이름(언어에 맞춰)을 보여 준다. */
export interface MenuItem {
  name: string;
  color: string;
  action: ActionId;
  url?: string;
}

/** chrome.storage.sync 에 저장되는 설정 */
export interface Settings {
  enabled: boolean;
  /** 누르고 있는 동안만 펫이 멈추고 이름표가 뜨며 클릭할 수 있는 키. 평소에는 펫이 클릭을 가로채지 않는다 */
  menuKey: MenuKey;
  /** 펫을 띄우지 않을 사이트(hostname, 하위 도메인 포함) */
  excluded: string[];
  skin: SkinId;
  /** 펫 크기(px) */
  size: number;
  /** 평소 투명도(메뉴 키를 누르면 1) */
  opacity: number;
  /** 내 이미지 스킨: 도트 그림을 흐리지 않고 또렷하게(image-rendering: pixelated) */
  imagePixelated: boolean;
  theme: ThemePref;
  lang: LangPref;
  /** 펫들(펫 한 마리 = 기능 하나, 최대 MAX_CREW) */
  crew: MenuItem[];
}

export const DEFAULTS: Settings = {
  enabled: true,
  menuKey: "Alt",
  excluded: [],
  skin: "slime",
  size: 36,
  opacity: 0.9,
  imagePixelated: false,
  theme: "system",
  lang: "auto",
  // 기본은 3마리: 화면을 덜 가리게
  crew: [
    { name: "GitHub", color: "#5AB8F0", action: "link", url: "https://github.com" },
    { name: "YouTube", color: "#F2766B", action: "link", url: "https://www.youtube.com" },
    { name: "", color: "#5BD16A", action: "memo" },
  ],
};

/** 메뉴에 넣을 수 있는 기능. 새 기능: 여기 + content/actions.ts + i18n 의 action.<id> */
export const ACTION_IDS: ActionId[] = ["link", "memo", "copy", "top"];
export const ACTION_NEEDS_URL: Record<ActionId, boolean> = { link: true, memo: false, copy: false, top: false };

/** 새 펫에 줄 색(아직 안 쓴 것부터) */
export const COLORS = ["#5AB8F0", "#F2766B", "#5BD16A", "#B48CF2", "#F2B84B", "#F28AC0", "#4CC9C0", "#8C9BF2"];
/** 펫(=기능) 최대 수 */
export const MAX_CREW = 3; // 화면을 덜 가리도록 3마리까지
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * 내 이미지·GIF 스킨(펫마다 그림 올리기) 켜기/끄기.
 * 지금은 꺼 둔다: 저장 공간 관리가 복잡해져서 첫 출시에서는 뺐다. 코드는 그대로 남아 있어서 true 로 바꾸면 다시 살아난다.
 * 다시 켤 때는 manifest.config.ts 의 unlimitedStorage 권한, README·store 문서의 GIF 설명도 함께 되살린다.
 */
export const CUSTOM_IMAGES = false;

/** 펫마다 올린 이미지(chrome.storage.local, 펫 순서와 같은 번호). skinImage 는 v0.4 이전 키 */
export const IMAGE_KEYS = Array.from({ length: MAX_CREW }, (_, i) => "skinImage" + i);
const LEGACY_IMAGE_KEY = "skinImage";

export async function loadSettings(): Promise<Settings> {
  const got = (await chrome.storage.sync.get(DEFAULTS as unknown as Record<string, unknown>)) as unknown as Settings;
  const s = { ...DEFAULTS, ...got };
  // v0.6 이전의 "off"(키로 열지 않기)는 이제 없다: 펫을 쓰려면 키가 필요하므로 기본 키로
  if (!MENU_KEYS.includes(s.menuKey)) s.menuKey = DEFAULTS.menuKey;
  // 예전(최대 6마리)에 더 많이 저장해 둔 경우 설정 창에서도 3마리까지만 보이게
  if (Array.isArray(s.crew) && s.crew.length > MAX_CREW) s.crew = s.crew.slice(0, MAX_CREW);
  // 내 이미지 스킨을 꺼 둔 동안은 예전에 골라 둔 사람도 슬라임으로(올려 둔 그림은 지우지 않음)
  if (!CUSTOM_IMAGES && s.skin === "image") s.skin = DEFAULTS.skin;
  return s;
}

export function saveSettings(patch: Partial<Settings>): Promise<void> {
  return chrome.storage.sync.set(patch);
}

export async function loadImages(): Promise<(string | null)[]> {
  const got = (await chrome.storage.local.get([...IMAGE_KEYS, LEGACY_IMAGE_KEY])) as Record<string, string | undefined>;
  return IMAGE_KEYS.map((k, i) => got[k] || (i === 0 ? got[LEGACY_IMAGE_KEY] : null) || null);
}

export async function saveImage(i: number, url: string | null): Promise<void> {
  if (url) await chrome.storage.local.set({ [IMAGE_KEYS[i]]: url });
  else await chrome.storage.local.remove(IMAGE_KEYS[i]);
  await chrome.storage.local.remove(LEGACY_IMAGE_KEY);
}

/** 펫 순서가 바뀌면 이미지도 같이 옮긴다. order[j] = 새 j번째 펫의 예전 번호(새 펫은 -1) */
export async function reorderImages(images: (string | null)[], order: number[]): Promise<(string | null)[]> {
  const next = IMAGE_KEYS.map((_, j) => (order[j] != null && order[j] >= 0 ? images[order[j]] : null) ?? null);
  const set: Record<string, string> = {};
  const remove: string[] = [];
  next.forEach((url, j) => (url ? (set[IMAGE_KEYS[j]] = url) : remove.push(IMAGE_KEYS[j])));
  if (Object.keys(set).length) await chrome.storage.local.set(set);
  if (remove.length) await chrome.storage.local.remove(remove);
  return next;
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
