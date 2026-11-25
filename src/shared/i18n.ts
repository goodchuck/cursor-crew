// UI 문자열 사전. 화면에 보이는 글자는 전부 여기서 가져온다(하드코딩 금지).
// 확장 이름·설명·명령 이름처럼 manifest 에 들어가는 것만 public/_locales 에 있다.
import type { LangPref } from "./settings";

const ko = {
  // 기능 이름(메뉴 항목 이름이 비어 있을 때도 쓴다)
  "action.link": "링크·검색",
  "action.memo": "메모",
  "action.copy": "URL 복사",
  "action.copyMd": "링크 복사",
  "action.top": "맨 위로",
  "action.bottom": "맨 아래로",
  "action.back": "뒤로",
  "action.reload": "새로고침",
  "action.dupTab": "탭 복제",
  "action.linkDesc": "링크·검색 열기",
  "action.memoDesc": "이 페이지 메모",
  "action.copyDesc": "현재 URL 복사",
  "action.copyMdDesc": "[제목](주소)로 복사",
  "action.topDesc": "맨 위로",
  "action.bottomDesc": "맨 아래로",
  "action.backDesc": "뒤로 가기",
  "action.reloadDesc": "새로고침",
  "action.dupTabDesc": "이 탭 복제",

  // 링크 프리셋(이름이 비어 있으면 이 이름이 이름표에 뜬다)
  "preset.google": "구글 검색",
  "preset.naver": "네이버 검색",
  "preset.youtube": "유튜브 검색",
  "preset.wiki": "위키백과",
  "preset.namu": "나무위키",
  "preset.endic": "영어사전",
  "preset.papago": "파파고 번역",
  "preset.gtrans": "이 페이지 번역",
  "preset.wayback": "예전 모습 (웨이백)",

  // 펫 위 말풍선·결과
  "toast.noUrl": "URL이 없어요 · 툴바 아이콘 → 설정",
  "toast.cantOpen": "열 수 없는 주소",
  "toast.openingHere": "↗ 이 탭에서 여는 중",
  "toast.opening": "↗ {name}",
  "toast.copied": "✓ URL 복사됨",
  "toast.copyFailed": "복사 실패",
  "toast.top": "↑ 맨 위로",
  "toast.line": "한 줄로 정렬 (한 번 더 누르면 풀림)",
  "toast.free": "자유롭게 따라다니기",
  "opt.formation": "따라오는 모양",
  "opt.formation.free": "자유롭게 (줄줄이 뒤따름)",
  "opt.formation.line": "한 줄 정렬 (서로 안 부딪힘)",
  "opt.formationHelp": "키를 누른 채 숫자 1 왼쪽 키(`)를 치면 페이지에서 바로 바꿀 수 있어요.",
  "toast.bottom": "↓ 맨 아래로",
  "toast.copiedMd": "✓ [제목](주소) 복사됨",
  "toast.noBack": "뒤로 갈 페이지가 없어요",
  "toast.dup": "⧉ 탭 복제",
  "toast.search": "🔍 {name}",

  // 검색어 입력창(선택한 글자가 없을 때)
  "ask.placeholder": "검색어 입력 후 Enter",
  "ask.hint": "글자를 드래그해 두고 누르면 바로 검색돼요",

  // 펫 메뉴(기능이 여러 개인 펫)
  "menu.hint": "숫자 키로도 골라요 · Esc 닫기",

  // 펫·이름표
  "memo.exists": "이 페이지에 메모가 있어요",
  "hint.key1": "{key}를 누른 채 나를 클릭하면 실행돼요",
  "hint.key2": "평소엔 클릭이 나를 통과해요",

  // 메모장
  "memo.placeholder": "이 페이지에 남길 메모… (자동 저장)",
  "memo.autosave": "자동 저장",
  "memo.saving": "저장 중…",
  "memo.saved": "저장됨 ✓",
  "memo.all": "모든 메모 보기",
  "memo.close": "닫기 (Esc)",

  // 스킨
  "skin.slime": "슬라임 (도트)",
  "skin.cursor": "커서",
  "skin.image": "내 이미지·GIF",

  // 배지·아이콘 제목
  "badge.off": "OFF",
  "icon.titleOn": "Cursor Crew 켜짐 · 클릭하면 설정 창 (켜기/끄기: Alt+Shift+C)",
  "icon.titleOff": "Cursor Crew 꺼짐 · 클릭하면 설정 창 (켜기/끄기: Alt+Shift+C)",

  // 설정 창
  "opt.title": "Cursor Crew 설정",
  "opt.saved": "저장됨 ✓",
  "opt.on": "켜짐",
  "opt.off": "꺼짐",
  "opt.toggleTitle": "켜기/끄기 (Alt+Shift+C)",
  "opt.topHelp": "이 창은 툴바 아이콘으로 열려요. 켜고 끄기는 위 스위치나 Alt+Shift+C.",
  "opt.shortcuts": "단축키 바꾸기",

  "opt.look": "모양",
  "opt.lookHelp": "마우스 옆을 따라다니는 펫의 겉모습이에요. 펫마다 하는 일은 아래 '펫과 기능'에서 정해요.",
  "opt.imageNeeded": "(아래에 올리기)",
  "opt.imageTitle": "내 이미지·GIF로 바꾸기",
  "opt.imageHelp": "칸에 파일을 끌어다 놓거나 클릭해서 골라요. 움직이는 GIF·WebP·PNG도 그대로 움직여요. 한 장 2MB까지.",
  "opt.imagePet": "{name}",
  "opt.imageDrop": "끌어다 놓기",
  "opt.imageSameAs1": "비우면 첫 그림",
  "opt.imageRemove": "이 이미지 지우기",
  "opt.imagePick": "{name} 펫 이미지 고르기",
  "opt.imageChange": "{name} 펫 이미지 바꾸기",
  "opt.pixelated": "도트(픽셀아트) 선명하게: 작은 도트 그림이 흐려지지 않게",
  "opt.imgNotImage": "이미지 파일만 쓸 수 있어요 (GIF·PNG·JPG·WebP).",
  "opt.imgTooBig": "파일이 {mb}MB예요. 2MB 이하로 줄여서 올려 주세요. GIF는 가로세로나 프레임 수를 줄이면 많이 작아져요.",
  "opt.imgDone": "{name} 펫 이미지를 바꿨어요 ({w}×{h}).",
  "opt.imgDoneAnimated": "{name} 펫 이미지를 바꿨어요 ({w}×{h}, 움직이는 이미지).",
  "opt.imgRemoved": "{name} 펫 이미지를 지웠어요.",
  "opt.imgFailed": "이미지를 읽지 못했어요: {err}",
  "opt.imgCantRead": "이미지를 읽을 수 없어요",
  "opt.imgUpload": "아래 칸에 이미지나 GIF를 올려 주세요.",
  "opt.size": "크기",
  "opt.opacity": "평소 투명도",

  "opt.openMenu": "쓰는 법",
  "opt.openMenuHelp": "평소에는 펫이 클릭을 가로채지 않아요(펫 위를 클릭해도 페이지가 눌려요). 이 키를 누르고 있으면 펫들이 커서 둘레로 겹치지 않게 모이고 이름표가 떠요. 그대로 펫을 클릭하면 그 펫의 기능이 실행돼요. 키를 떼면 아무 일도 없이 원래대로 돌아가요.",
  "opt.menuKey": "누르고 있을 키",
  "opt.keyAltShiftNote": "Alt+Shift (윈도우 입력 언어 전환과 겹칠 수 있어요)",
  "opt.hintAgain": "처음 안내 다시 보기",
  "opt.hintAgainDone": "다음에 페이지를 열면 안내가 다시 떠요",

  "opt.menu": "펫과 기능",
  "opt.menuHelp": "펫은 최대 3마리예요. 펫 하나에 기능을 여러 개 넣으면 클릭할 때 작은 메뉴가 펼쳐져요. 키를 누른 채 1·2·3을 치면 펫을 조준하지 않아도 되고, 숫자 1 왼쪽 키(`)를 치면 펫들이 한 줄로 정렬돼요(다시 치면 풀림). 링크는 Shift를 같이 누르면 지금 탭에서, Ctrl을 같이 누르면 뒤쪽 탭으로 열려요.",
  "opt.pet": "펫 {n}",
  "opt.preset": "바로 쓰기",
  "opt.presetCustom": "직접 입력",
  "opt.urlHelp": "주소에 {sel}(드래그한 글자), {url}(지금 페이지 주소)을 넣을 수 있어요.",
  "opt.addMore": "+ 이 펫에 기능 더하기",
  "opt.moreFull": "펫 하나에 기능은 6개까지예요",
  "opt.urlInvalid": "주소를 확인해 주세요",
  "opt.itemColor": "펫 색",
  "opt.itemName": "이름",
  "opt.itemNamePlaceholder": "이름 (선택)",
  "opt.itemAction": "기능",
  "opt.itemUrl": "링크 주소",
  "opt.up": "위로",
  "opt.down": "아래로",
  "opt.remove": "삭제",
  "opt.addItem": "+ 펫 추가",
  "opt.newLink": "새 링크",

  "opt.display": "화면·언어",
  "opt.theme": "테마",
  "opt.themeSystem": "시스템 따라가기",
  "opt.themeLight": "라이트",
  "opt.themeDark": "다크",
  "opt.lang": "언어",
  "opt.langAuto": "자동 (브라우저 언어)",

  "opt.excluded": "끌 사이트",
  "opt.excludedHelp": "한 줄에 하나씩, 도메인만 적어요(예: docs.google.com). 하위 도메인도 함께 꺼져요.",

  "opt.memos": "메모",
  "opt.memosEmpty": "아직 메모가 없어요. 페이지에서 키를 누른 채 메모 펫을 클릭해 보세요.",
  "opt.memoDelete": "삭제",
} as const;

export type MsgKey = keyof typeof ko;
type Dict = Record<MsgKey, string>;

const en: Dict = {
  "action.link": "Link/search",
  "action.memo": "Memo",
  "action.copy": "Copy URL",
  "action.copyMd": "Copy link",
  "action.top": "Back to top",
  "action.bottom": "To bottom",
  "action.back": "Back",
  "action.reload": "Reload",
  "action.dupTab": "Duplicate tab",
  "action.linkDesc": "Open a link or search",
  "action.memoDesc": "Memo for this page",
  "action.copyDesc": "Copy page URL",
  "action.copyMdDesc": "Copy as [title](url)",
  "action.topDesc": "Scroll to top",
  "action.bottomDesc": "Scroll to bottom",
  "action.backDesc": "Go back",
  "action.reloadDesc": "Reload page",
  "action.dupTabDesc": "Duplicate this tab",

  "preset.google": "Google search",
  "preset.naver": "Naver search",
  "preset.youtube": "YouTube search",
  "preset.wiki": "Wikipedia",
  "preset.namu": "Namuwiki",
  "preset.endic": "English dictionary",
  "preset.papago": "Papago translate",
  "preset.gtrans": "Translate this page",
  "preset.wayback": "Past versions (Wayback)",

  "toast.noUrl": "No URL yet · toolbar icon → settings",
  "toast.cantOpen": "Can't open this address",
  "toast.openingHere": "↗ Opening in this tab",
  "toast.opening": "↗ {name}",
  "toast.copied": "✓ URL copied",
  "toast.copyFailed": "Couldn't copy",
  "toast.top": "↑ Back to top",
  "toast.line": "Lined up (press again to undo)",
  "toast.free": "Following freely",
  "opt.formation": "Following style",
  "opt.formation.free": "Free (trail behind each other)",
  "opt.formation.line": "Lined up (never bump)",
  "opt.formationHelp": "Hold the key and press ` (left of 1) to switch right on the page.",
  "toast.bottom": "↓ To bottom",
  "toast.copiedMd": "✓ Copied as [title](url)",
  "toast.noBack": "Nowhere to go back to",
  "toast.dup": "⧉ Tab duplicated",
  "toast.search": "🔍 {name}",

  "ask.placeholder": "Type and press Enter",
  "ask.hint": "Tip: select text first to search it right away",

  "menu.hint": "Number keys work too · Esc to close",
  "memo.exists": "This page has a memo",
  "hint.key1": "Hold {key} and click me to run my action",
  "hint.key2": "Clicks go right through me otherwise",

  "memo.placeholder": "A note for this page… (saved automatically)",
  "memo.autosave": "Autosave",
  "memo.saving": "Saving…",
  "memo.saved": "Saved ✓",
  "memo.all": "All memos",
  "memo.close": "Close (Esc)",

  "skin.slime": "Slime (pixel)",
  "skin.cursor": "Cursor",
  "skin.image": "My image/GIF",

  "badge.off": "OFF",
  "icon.titleOn": "Cursor Crew is on · click for settings (on/off: Alt+Shift+C)",
  "icon.titleOff": "Cursor Crew is off · click for settings (on/off: Alt+Shift+C)",

  "opt.title": "Cursor Crew settings",
  "opt.saved": "Saved ✓",
  "opt.on": "On",
  "opt.off": "Off",
  "opt.toggleTitle": "On/off (Alt+Shift+C)",
  "opt.topHelp": "This window opens from the toolbar icon. Turn the pet on or off with the switch above or Alt+Shift+C.",
  "opt.shortcuts": "Change shortcut",

  "opt.look": "Look",
  "opt.lookHelp": "How the pets that follow your mouse look. What each pet does is set under 'Pets & actions' below.",
  "opt.imageNeeded": "(upload below)",
  "opt.imageTitle": "Use my image or GIF",
  "opt.imageHelp": "Drop a file on a slot or click to choose one. Animated GIF, WebP and PNG keep moving. Up to 2 MB each.",
  "opt.imagePet": "{name}",
  "opt.imageDrop": "Drop here",
  "opt.imageSameAs1": "Empty = first image",
  "opt.imageRemove": "Remove this image",
  "opt.imagePick": "Choose an image for the {name} pet",
  "opt.imageChange": "Change the image for the {name} pet",
  "opt.pixelated": "Crisp pixel art: keep small pixel images sharp",
  "opt.imgNotImage": "Only image files work (GIF, PNG, JPG, WebP).",
  "opt.imgTooBig": "This file is {mb} MB. Please use one under 2 MB. Making a GIF smaller or using fewer frames shrinks it a lot.",
  "opt.imgDone": "The {name} pet now uses this image ({w}×{h}).",
  "opt.imgDoneAnimated": "The {name} pet now uses this image ({w}×{h}, animated).",
  "opt.imgRemoved": "Removed the image for the {name} pet.",
  "opt.imgFailed": "Couldn't read the image: {err}",
  "opt.imgCantRead": "the file isn't a readable image",
  "opt.imgUpload": "Upload an image or GIF in the slots below.",
  "opt.size": "Size",
  "opt.opacity": "Opacity",

  "opt.openMenu": "How to use",
  "opt.openMenuHelp": "Pets never catch your clicks (clicking on one clicks the page underneath). Hold this key and the pets gather around your cursor without overlapping and show name tags; click a pet to run its action. Releasing the key does nothing and puts everything back.",
  "opt.menuKey": "Key to hold",
  "opt.keyAltShiftNote": "Alt+Shift (may clash with the Windows input language switch)",
  "opt.hintAgain": "Show the first-time tip again",
  "opt.hintAgainDone": "The tip will show on the next page you open",

  "opt.menu": "Pets & actions",
  "opt.menuHelp": "Up to 3 pets. Give a pet several actions and clicking it opens a small menu. Hold the key and press 1, 2 or 3 to skip aiming, or ` (left of 1) to line the pets up (press again to undo). Add Shift to open a link in this tab, or Ctrl for a background tab.",
  "opt.pet": "Pet {n}",
  "opt.preset": "Quick pick",
  "opt.presetCustom": "Custom",
  "opt.urlHelp": "You can put {sel} (selected text) or {url} (this page's address) in the link.",
  "opt.addMore": "+ Add another action to this pet",
  "opt.moreFull": "A pet can hold up to 6 actions",
  "opt.urlInvalid": "Please check the address",
  "opt.itemColor": "Pet color",
  "opt.itemName": "Name",
  "opt.itemNamePlaceholder": "Name (optional)",
  "opt.itemAction": "Action",
  "opt.itemUrl": "Link address",
  "opt.up": "Move up",
  "opt.down": "Move down",
  "opt.remove": "Remove",
  "opt.addItem": "+ Add a pet",
  "opt.newLink": "New link",

  "opt.display": "Display & language",
  "opt.theme": "Theme",
  "opt.themeSystem": "Match system",
  "opt.themeLight": "Light",
  "opt.themeDark": "Dark",
  "opt.lang": "Language",
  "opt.langAuto": "Auto (browser language)",

  "opt.excluded": "Turn off on these sites",
  "opt.excludedHelp": "One domain per line (for example docs.google.com). Subdomains are included.",

  "opt.memos": "Memos",
  "opt.memosEmpty": "No memos yet. On a page, hold the key and click the Memo pet.",
  "opt.memoDelete": "Delete",
};

export type Lang = "ko" | "en";
const DICTS: Record<Lang, Dict> = { ko, en };

/** 설정값(auto/ko/en)을 실제 언어로. auto 면 브라우저 언어가 한국어일 때만 한국어 */
export function resolveLang(pref: LangPref | undefined): Lang {
  if (pref === "ko" || pref === "en") return pref;
  let ui = "en";
  try {
    ui = chrome.i18n?.getUILanguage?.() || navigator.language || "en";
  } catch {
    ui = navigator.language || "en";
  }
  return ui.toLowerCase().startsWith("ko") ? "ko" : "en";
}

export type T = (key: MsgKey, vars?: Record<string, string | number>) => string;

export function makeT(lang: Lang): T {
  const dict = DICTS[lang];
  return (key, vars) => (dict[key] ?? ko[key]).replace(/\{(\w+)\}/g, (_, k: string) => String(vars?.[k] ?? ""));
}

/** 메뉴 키 이름(화면 표시용) */
export const KEY_LABEL: Record<string, string> = { Alt: "Alt", Control: "Ctrl", Shift: "Shift", AltShift: "Alt+Shift" };
