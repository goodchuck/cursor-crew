// 아이콘 클릭 → 설정 창, 단축키 → 켜기·끄기, 꺼짐 배지, 콘텐츠 스크립트 대신 탭 열기.
import { DEFAULTS, loadSettings } from "@src/shared/settings";
import { makeT, resolveLang } from "@src/shared/i18n";
import { openDashboard } from "./open-dashboard";

async function updateBadge() {
  const cfg = await loadSettings();
  const t = makeT(resolveLang(cfg.lang));
  await chrome.action.setBadgeText({ text: cfg.enabled ? "" : t("badge.off") });
  await chrome.action.setBadgeBackgroundColor({ color: "#6B6B6B" });
  await chrome.action.setTitle({ title: t(cfg.enabled ? "icon.titleOn" : "icon.titleOff") });
}

async function toggle() {
  const { enabled } = await loadSettings();
  await chrome.storage.sync.set({ enabled: !enabled });
}

export const WELCOME_PATH = "src/pages/welcome/index.html";

chrome.runtime.onInstalled.addListener(async (details) => {
  // 처음 설치하면 기본값을 저장해 둔다(이미 있는 값은 유지)
  const cur = await chrome.storage.sync.get(null);
  const fill: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(DEFAULTS)) if (cur[k] === undefined) fill[k] = v;
  if (Object.keys(fill).length) await chrome.storage.sync.set(fill);
  void updateBadge();
  // 처음 설치했을 때만 30초 사용법 페이지(업데이트 때는 열지 않음)
  if (details.reason === "install") void chrome.tabs.create({ url: chrome.runtime.getURL(WELCOME_PATH) });
});
chrome.runtime.onStartup.addListener(() => void updateBadge());

chrome.action.onClicked.addListener(() => void openDashboard());
chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === "toggle-crew") void toggle();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && (changes.enabled || changes.lang)) void updateBadge();
});

function normalizeUrl(raw: unknown): string | null {
  let u = String(raw || "").trim();
  if (!u) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = "https://" + u;
  try {
    const url = new URL(u);
    return /^(https?|file|chrome|chrome-extension):$/.test(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

type Msg = { type: "crew:open"; url: string; sameTab?: boolean; background?: boolean } | { type: "crew:options"; hash?: string } | { type: "crew:dup" } | { type: "crew:welcome" };

chrome.runtime.onMessage.addListener((msg: Msg, sender, reply) => {
  if (msg?.type === "crew:open") {
    const url = normalizeUrl(msg.url);
    if (!url) {
      reply({ ok: false, error: "bad-url" });
      return;
    }
    const tab = sender.tab;
    const done = () => reply({ ok: true });
    if (msg.sameTab && tab?.id != null) chrome.tabs.update(tab.id, { url }).then(done);
    else
      chrome.tabs
        .create({ url, active: !msg.background, ...(tab ? { index: tab.index + 1, openerTabId: tab.id, windowId: tab.windowId } : {}) })
        .then(done);
    return true; // 비동기 응답
  }
  if (msg?.type === "crew:options") void openDashboard(msg.hash);
  if (msg?.type === "crew:welcome") void chrome.tabs.create({ url: chrome.runtime.getURL(WELCOME_PATH) });
  // 탭 복제: 보낸 탭을 그대로 복제(tabs 권한 없이 됨)
  if (msg?.type === "crew:dup" && sender.tab?.id != null) void chrome.tabs.duplicate(sender.tab.id);
});
