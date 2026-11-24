// 펫이 하는 일(펫 한 마리 = 기능 하나). 새 기능: 여기 함수 + shared/settings.ts 의 ACTION_IDS + i18n 의 action.<id>
import type { ActionId, MenuItem } from "@src/shared/settings";
import type { T } from "@src/shared/i18n";

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
  toast(at: Point, text: string): void;
  openMemo(at: Point, item: MenuItem): void;
}

type Action = (item: MenuItem, mods: Mods, host: ActionHost, at: Point) => void | Promise<void>;

export const ACTIONS: Record<ActionId, Action> = {
  link(item, mods, host, at) {
    const { t } = host;
    if (!item.url) return host.toast(at, t("toast.noUrl"));
    chrome.runtime.sendMessage({ type: "crew:open", url: item.url, sameTab: !!mods.shiftKey, background: !!(mods.ctrlKey || mods.metaKey) }, (res) => {
      if (chrome.runtime.lastError || !res || !res.ok) host.toast(at, t("toast.cantOpen"));
    });
    host.toast(at, mods.shiftKey ? t("toast.openingHere") : t("toast.opening", { name: item.name || t("action.link") }));
  },

  memo(item, mods, host, at) {
    host.openMemo(at, item);
  },

  async copy(item, mods, host, at) {
    let ok = false;
    try {
      await navigator.clipboard.writeText(location.href);
      ok = true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = location.href;
      ta.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.appendChild(ta);
      ta.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      ta.remove();
    }
    host.toast(at, host.t(ok ? "toast.copied" : "toast.copyFailed"));
  },

  top(item, mods, host, at) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    host.toast(at, host.t("toast.top"));
  },
};

/** 메뉴에 보일 이름(비어 있으면 기능 이름) */
export const itemName = (item: MenuItem, t: T) => item.name || t(`action.${item.action}` as const);

/** 메뉴 가운데에 보일 설명 */
export function itemHint(item: MenuItem, t: T): string {
  if (item.action === "link") {
    try {
      const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(item.url || "") ? item.url! : "https://" + item.url);
      return "↗ " + u.hostname.replace(/^www\./, "");
    } catch {
      return t("action.link");
    }
  }
  return t(`action.${item.action}Desc` as const);
}
