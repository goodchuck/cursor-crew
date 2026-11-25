// 펫이 하는 일. 새 기능: 여기 함수 + shared/settings.ts 의 ACTION_IDS·ACTION_NEEDS_URL + i18n 의 action.<id>, action.<id>Desc
import type { ActionId, Task } from "@src/shared/settings";
import type { Lang, T } from "@src/shared/i18n";
import { PRESETS, fillTemplate, needsSelection, presetOf } from "@src/shared/presets";

export interface Mods {
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}
export interface Point {
  x: number;
  y: number;
}
/** 기능이 쓸 수 있는 펫 쪽 기능들 */
export interface ActionHost {
  t: T;
  lang: Lang;
  toast(at: Point, text: string): void;
  openMemo(at: Point, task: Task): void;
  /** 펫 옆에 한 줄 입력창을 띄워 글자를 받는다(취소하면 null) */
  askText(at: Point, title: string): Promise<string | null>;
}
/** 펫을 누른 순간의 상태(메뉴를 거쳐도 그대로 쓴다) */
export interface RunCtx {
  sel: string;
}

type Action = (task: Task, mods: Mods, host: ActionHost, at: Point, ctx: RunCtx) => void | Promise<void>;

/** 지금 선택한 글자(입력칸 안에서 고른 글자도). 너무 길면 자른다 */
export function selectedText(): string {
  const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
  let s = "";
  if (el && /^(INPUT|TEXTAREA)$/.test(el.tagName) && typeof el.selectionStart === "number" && el.selectionEnd !== el.selectionStart) {
    s = el.value.slice(el.selectionStart!, el.selectionEnd!);
  } else s = String(window.getSelection() || "");
  return s.replace(/\s+/g, " ").trim().slice(0, 500);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

function open(url: string, mods: Mods, host: ActionHost, at: Point, toast: string) {
  chrome.runtime.sendMessage({ type: "crew:open", url, sameTab: !!mods.shiftKey, background: !!(mods.ctrlKey || mods.metaKey) }, (res) => {
    if (chrome.runtime.lastError || !res || !res.ok) host.toast(at, host.t("toast.cantOpen"));
  });
  host.toast(at, mods.shiftKey ? host.t("toast.openingHere") : toast);
}

export const ACTIONS: Record<ActionId, Action> = {
  async link(task, mods, host, at, ctx) {
    const { t } = host;
    if (!task.url) return host.toast(at, t("toast.noUrl"));
    // 프리셋 주소면 지금 언어에 맞는 주소로(위키백과·번역)
    const preset = presetOf(task.url);
    const tpl = preset ? PRESETS[preset](host.lang) : task.url;
    const name = taskName(task, t);
    let sel = ctx.sel;
    if (needsSelection(tpl) && !sel) {
      // 드래그한 글자가 없으면 펫 옆에서 바로 입력받는다
      const typed = await host.askText(at, name);
      if (!typed) return;
      sel = typed;
    }
    const url = fillTemplate(tpl, { sel, url: location.href, title: document.title, host: location.hostname });
    open(url, mods, host, at, needsSelection(tpl) ? t("toast.search", { name }) : t("toast.opening", { name }));
  },

  memo(task, mods, host, at) {
    host.openMemo(at, task);
  },

  async copy(task, mods, host, at) {
    host.toast(at, host.t((await copyText(location.href)) ? "toast.copied" : "toast.copyFailed"));
  },

  async copyMd(task, mods, host, at) {
    const title = (document.title || location.hostname).replace(/[[\]]/g, "");
    host.toast(at, host.t((await copyText(`[${title}](${location.href})`)) ? "toast.copiedMd" : "toast.copyFailed"));
  },

  top(task, mods, host, at) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    host.toast(at, host.t("toast.top"));
  },

  bottom(task, mods, host, at) {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
    host.toast(at, host.t("toast.bottom"));
  },

  back(task, mods, host, at) {
    if (history.length <= 1) return host.toast(at, host.t("toast.noBack"));
    history.back();
  },

  reload() {
    location.reload();
  },

  dupTab(task, mods, host, at) {
    chrome.runtime.sendMessage({ type: "crew:dup" });
    host.toast(at, host.t("toast.dup"));
  },
};

/** 이름표에 보일 이름: 적은 이름 → 프리셋 이름 → 기능 이름 */
export function taskName(task: Task, t: T): string {
  if (task.name) return task.name;
  const preset = task.action === "link" ? presetOf(task.url) : null;
  return preset ? t(`preset.${preset}` as const) : t(`action.${task.action}` as const);
}
/** 예전 이름(설정 창에서 씀) */
export const itemName = taskName;

/** 마우스를 올렸을 때 보일 설명 */
export function itemHint(task: Task, t: T): string {
  if (task.action === "link") {
    try {
      const raw = task.url || "";
      const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : "https://" + raw);
      return (needsSelection(raw) ? "🔍 " : "↗ ") + u.hostname.replace(/^www\./, "");
    } catch {
      return t("action.link");
    }
  }
  return t(`action.${task.action}Desc` as const);
}
