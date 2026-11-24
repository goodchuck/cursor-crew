// 설정 창을 웹 탭이 아니라 작은 별도 창(popup)으로 연다. 이미 열려 있으면 새로 만들지 않고 앞으로 가져온다.
export const DASHBOARD_PATH = "src/pages/options/index.html";
const SIZE = { width: 540, height: 720 };

async function findDashboardWindow(): Promise<number | null> {
  const base = chrome.runtime.getURL(DASHBOARD_PATH);
  // getContexts 는 권한 없이 확장 자신의 페이지를 찾을 수 있다(Chrome 116+)
  if (chrome.runtime.getContexts) {
    const ctx = await chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.TAB] });
    const hit = ctx.find((c) => c.documentUrl?.startsWith(base));
    if (hit && hit.windowId >= 0) return hit.windowId;
  }
  const wins = await chrome.windows.getAll({ populate: true });
  const win = wins.find((w) => (w.tabs || []).some((t) => (t.url || t.pendingUrl || "").startsWith(base)));
  return win?.id ?? null;
}

export async function openDashboard(hash?: string): Promise<void> {
  const url = chrome.runtime.getURL(DASHBOARD_PATH) + (hash ? "#" + hash : "");
  const id = await findDashboardWindow();
  if (id != null) {
    await chrome.windows.update(id, { focused: true });
    if (hash) {
      const [tab] = await chrome.tabs.query({ windowId: id });
      if (tab?.id != null) await chrome.tabs.update(tab.id, { url });
    }
    return;
  }
  await chrome.windows.create({ url, type: "popup", ...SIZE });
}
