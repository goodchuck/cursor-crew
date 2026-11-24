// 개발용: 확장 없이 일반 페이지에서 content.js / options.js 를 돌려 보기 위한 최소 chrome.* 흉내.
// storage 는 localStorage 에 저장되고, 탭 열기는 window.open 으로 대신한다.
(() => {
  if (globalThis.chrome && chrome.storage && chrome.storage.sync) return; // 진짜 확장 안이면 그대로
  const listeners = [];
  const area = (name) => {
    const KEY = "__crewShim:" + name;
    const read = () => JSON.parse(localStorage.getItem(KEY) || "{}");
    const write = (o) => localStorage.setItem(KEY, JSON.stringify(o));
    const emit = (changes) => listeners.forEach((fn) => fn(changes, name));
    return {
      async get(keys) {
        const all = read();
        if (keys == null) return all;
        if (typeof keys === "string") return keys in all ? { [keys]: all[keys] } : {};
        if (Array.isArray(keys)) return Object.fromEntries(keys.filter((k) => k in all).map((k) => [k, all[k]]));
        const out = {};
        for (const k in keys) out[k] = k in all ? all[k] : keys[k];
        return out;
      },
      async set(obj) {
        const all = read();
        const changes = {};
        for (const k in obj) {
          changes[k] = { oldValue: all[k], newValue: obj[k] };
          all[k] = obj[k];
        }
        write(all);
        setTimeout(() => emit(changes));
      },
      async remove(keys) {
        const all = read();
        const changes = {};
        for (const k of [].concat(keys)) {
          changes[k] = { oldValue: all[k] };
          delete all[k];
        }
        write(all);
        setTimeout(() => emit(changes));
      },
    };
  };
  const log = (globalThis.__crewLog = []);
  globalThis.chrome = {
    storage: { sync: area("sync"), local: area("local"), onChanged: { addListener: (fn) => listeners.push(fn) } },
    runtime: {
      lastError: undefined,
      sendMessage(msg, cb) {
        log.push(msg);
        console.log("[crew-shim] message", msg);
        if (msg.type === "crew:open" && !globalThis.__crewNoOpen) window.open(/^[a-z]+:/i.test(msg.url) ? msg.url : "https://" + msg.url, "_blank");
        if (cb) setTimeout(() => cb({ ok: true }));
      },
    },
    tabs: { create: ({ url }) => window.open(url, "_blank") },
  };
})();
