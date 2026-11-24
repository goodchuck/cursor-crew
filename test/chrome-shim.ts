// 개발용: 확장 없이 일반 페이지에서 콘텐츠 스크립트·설정 창을 돌려 보기 위한 최소 chrome.* 흉내.
// storage 는 localStorage 에 저장되고, 탭 열기는 window.open 으로 대신한다. (pnpm harness 에서만 쓰인다)
type Listener = (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, area: string) => void;

declare global {
  interface Window {
    __crewLog: unknown[];
    __crewNoOpen?: boolean;
  }
}

const listeners: Listener[] = [];

function area(name: "sync" | "local") {
  const KEY = "__crewShim:" + name;
  const read = (): Record<string, unknown> => JSON.parse(localStorage.getItem(KEY) || "{}");
  const write = (o: Record<string, unknown>) => localStorage.setItem(KEY, JSON.stringify(o));
  const emit = (changes: Parameters<Listener>[0]) => setTimeout(() => listeners.forEach((fn) => fn(changes, name)));
  return {
    async get(keys?: string | string[] | Record<string, unknown> | null) {
      const all = read();
      if (keys == null) return all;
      if (typeof keys === "string") return keys in all ? { [keys]: all[keys] } : {};
      if (Array.isArray(keys)) return Object.fromEntries(keys.filter((k) => k in all).map((k) => [k, all[k]]));
      const out: Record<string, unknown> = {};
      for (const k in keys) out[k] = k in all ? all[k] : keys[k];
      return out;
    },
    async set(obj: Record<string, unknown>) {
      const all = read();
      const changes: Parameters<Listener>[0] = {};
      for (const k in obj) {
        changes[k] = { oldValue: all[k], newValue: obj[k] };
        all[k] = obj[k];
      }
      write(all);
      emit(changes);
    },
    async remove(keys: string | string[]) {
      const all = read();
      const changes: Parameters<Listener>[0] = {};
      for (const k of ([] as string[]).concat(keys)) {
        changes[k] = { oldValue: all[k] };
        delete all[k];
      }
      write(all);
      emit(changes);
    },
  };
}

const real = (globalThis as { chrome?: { storage?: unknown } }).chrome;
if (!real?.storage) {
  window.__crewLog = [];
  const shim = {
    storage: {
      sync: area("sync"),
      local: area("local"),
      onChanged: {
        addListener: (fn: Listener) => listeners.push(fn),
        removeListener: (fn: Listener) => listeners.splice(listeners.indexOf(fn) >>> 0, 1),
      },
    },
    runtime: {
      lastError: undefined,
      getURL: (p: string) => "/" + p,
      sendMessage(msg: { type: string; url?: string }, cb?: (r: unknown) => void) {
        window.__crewLog.push(msg);
        console.log("[crew-shim] message", msg);
        if (msg.type === "crew:open" && !window.__crewNoOpen) window.open(/^[a-z]+:/i.test(msg.url || "") ? msg.url : "https://" + msg.url, "_blank");
        if (cb) setTimeout(() => cb({ ok: true }));
      },
    },
    i18n: { getUILanguage: () => new URLSearchParams(location.search).get("ui") || navigator.language },
    tabs: { create: ({ url }: { url: string }) => window.open(url, "_blank") },
  };
  (globalThis as unknown as { chrome: unknown }).chrome = shim;
}

export {};
