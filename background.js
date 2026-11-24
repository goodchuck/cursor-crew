// 아이콘 클릭 → 설정 창, 단축키 → 켜기·끄기, 배지 표시, 콘텐츠 스크립트 대신 탭 열기.
importScripts("defaults.js");

const D = globalThis.CrewDefaults;

async function getSettings() {
  return chrome.storage.sync.get(D.settings);
}

async function updateBadge(enabled) {
  if (enabled === undefined) enabled = (await getSettings()).enabled;
  await chrome.action.setBadgeText({ text: enabled ? "" : "OFF" });
  await chrome.action.setBadgeBackgroundColor({ color: "#6B6B6B" });
  await chrome.action.setTitle({ title: `Cursor Crew ${enabled ? "켜짐" : "꺼짐"} · 클릭하면 설정 창 (켜기/끄기: Alt+Shift+C)` });
}

async function toggle() {
  const { enabled } = await getSettings();
  await chrome.storage.sync.set({ enabled: !enabled });
}

chrome.runtime.onInstalled.addListener(async () => {
  // 처음 설치하면 기본값을 저장해 둔다(이미 있는 값은 유지)
  const cur = await chrome.storage.sync.get(null);
  const fill = {};
  for (const k in D.settings) if (cur[k] === undefined) fill[k] = D.settings[k];
  if (Object.keys(fill).length) await chrome.storage.sync.set(fill);
  updateBadge();
});
chrome.runtime.onStartup.addListener(() => updateBadge());

// ---------------------------------------------------------------- 설정 창
// 웹 탭이 아니라 작은 별도 창(popup)으로 연다. 이미 열려 있으면 새로 만들지 않고 앞으로 가져온다.
const DASHBOARD = "options.html";
const DASH_SIZE = { width: 540, height: 720 };

async function findDashboardWindow() {
  const base = chrome.runtime.getURL(DASHBOARD);
  // getContexts 는 권한 없이 확장 자신의 페이지를 찾을 수 있다(Chrome 116+)
  if (chrome.runtime.getContexts) {
    const ctx = await chrome.runtime.getContexts({ contextTypes: ["TAB"] });
    const hit = ctx.find((c) => c.documentUrl && c.documentUrl.startsWith(base));
    if (hit && hit.windowId >= 0) return hit.windowId;
  }
  const wins = await chrome.windows.getAll({ populate: true });
  const win = wins.find((w) => (w.tabs || []).some((t) => (t.url || t.pendingUrl || "").startsWith(base)));
  return win ? win.id : null;
}

async function openDashboard(hash) {
  const url = chrome.runtime.getURL(DASHBOARD) + (hash ? "#" + hash : "");
  const id = await findDashboardWindow();
  if (id != null) {
    await chrome.windows.update(id, { focused: true });
    if (hash) {
      const [tab] = await chrome.tabs.query({ windowId: id });
      if (tab) await chrome.tabs.update(tab.id, { url });
    }
    return;
  }
  await chrome.windows.create({ url, type: "popup", ...DASH_SIZE });
}

chrome.action.onClicked.addListener(() => openDashboard());
chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === "toggle-crew") toggle();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.enabled) updateBadge(changes.enabled.newValue);
});

function normalizeUrl(u) {
  u = String(u || "").trim();
  if (!u) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = "https://" + u;
  try {
    const url = new URL(u);
    return /^(https?|file|chrome|chrome-extension):$/.test(url.protocol) ? url.href : null;
  } catch (_) {
    return null;
  }
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (!msg) return;
  if (msg.type === "crew:open") {
    const url = normalizeUrl(msg.url);
    if (!url) return reply({ ok: false, error: "bad-url" });
    if (msg.sameTab && sender.tab) {
      chrome.tabs.update(sender.tab.id, { url }).then(() => reply({ ok: true }));
    } else {
      const opts = { url, active: msg.background !== true };
      if (sender.tab) {
        opts.index = sender.tab.index + 1;
        opts.openerTabId = sender.tab.id;
        opts.windowId = sender.tab.windowId;
      }
      chrome.tabs.create(opts).then(() => reply({ ok: true }));
    }
    return true;
  }
  if (msg.type === "crew:options") {
    openDashboard(msg.hash);
  }
});
