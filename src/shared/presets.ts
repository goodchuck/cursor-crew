// 링크 기능에 바로 넣을 수 있는 검색·주소 템플릿. 설정 창의 '바로 쓰기' 목록과, 이름이 비었을 때의 이름표에 쓴다.
// {sel} = 선택한 글자, {url} = 지금 페이지 주소. 새 프리셋: 여기 + i18n 의 preset.<id>
import type { Lang } from "./i18n";

export type PresetId = "google" | "naver" | "youtube" | "wiki" | "namu" | "endic" | "papago" | "gtrans" | "wayback";

/** lang 에 따라 주소가 달라지는 것(위키백과·번역)은 함수로 */
export const PRESETS: Record<PresetId, (lang: Lang) => string> = {
  google: () => "https://www.google.com/search?q={sel}",
  naver: () => "https://search.naver.com/search.naver?query={sel}",
  youtube: () => "https://www.youtube.com/results?search_query={sel}",
  wiki: (lang) => `https://${lang}.wikipedia.org/w/index.php?search={sel}`,
  namu: () => "https://namu.wiki/w/{sel}",
  endic: () => "https://en.dict.naver.com/#/search?query={sel}",
  papago: (lang) => `https://papago.naver.com/?sk=auto&tk=${lang}&st={sel}`,
  gtrans: (lang) => `https://translate.google.com/translate?sl=auto&tl=${lang}&u={url}`,
  wayback: () => "https://web.archive.org/web/*/{url}",
};
export const PRESET_IDS = Object.keys(PRESETS) as PresetId[];

/** 주소가 어떤 프리셋과 같은지(언어별 주소도 모두 비교) */
export function presetOf(url: string | undefined): PresetId | null {
  if (!url) return null;
  for (const id of PRESET_IDS) if (PRESETS[id]("ko") === url || PRESETS[id]("en") === url) return id;
  return null;
}

/** 주소에 선택한 글자가 필요한지({sel} 또는 %s) */
export const needsSelection = (url: string | undefined) => /\{sel\}|%s/.test(url || "");

/**
 * 템플릿을 실제 주소로. 선택한 글자는 항상 인코딩하고,
 * {url} 은 ? 뒤(쿼리)에 있으면 인코딩, 경로에 있으면 그대로 둔다(웨이백 머신 주소처럼).
 */
export function fillTemplate(tpl: string, v: { sel: string; url: string; title: string; host: string }): string {
  const q = tpl.indexOf("?");
  return tpl.replace(/\{sel\}|%s|\{url\}|\{title\}|\{host\}/g, (tok, off: number) => {
    if (tok === "{sel}" || tok === "%s") return encodeURIComponent(v.sel);
    if (tok === "{url}") return q >= 0 && off > q ? encodeURIComponent(v.url) : v.url;
    if (tok === "{title}") return encodeURIComponent(v.title);
    return v.host;
  });
}
