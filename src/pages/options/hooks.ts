import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULTS, loadImages, loadSettings, saveSettings, type Memo, type Settings } from "@src/shared/settings";
import { makeT, resolveLang, type T } from "@src/shared/i18n";
import { isDark, onSystemThemeChange } from "@src/shared/theme";

/** 설정을 읽고, 바꾸면 잠깐 모았다가 chrome.storage.sync 에 저장한다. */
export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [savedAt, setSavedAt] = useState(0);
  const pending = useRef<Partial<Settings>>({});
  const timer = useRef(0);

  useEffect(() => {
    void loadSettings().then(setSettings);
    // 아이콘·단축키로 켜고 끈 것을 반영
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === "sync" && changes.enabled) setSettings((s) => (s ? { ...s, enabled: changes.enabled.newValue as boolean } : s));
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => (s ? { ...s, ...patch } : s));
    pending.current = { ...pending.current, ...patch };
    clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      const p = pending.current;
      pending.current = {};
      await saveSettings(p);
      setSavedAt(Date.now());
    }, 250);
  }, []);

  return { settings, update, savedAt };
}

/** 설정의 언어로 t() 를 만든다 */
export function useT(settings: Settings | null): T {
  return useMemo(() => makeT(resolveLang(settings?.lang ?? DEFAULTS.lang)), [settings?.lang]);
}

/** 테마 설정에 맞춰 <html> 에 dark 클래스를 단다(시스템 테마가 바뀌어도 따라간다) */
export function useThemeClass(settings: Settings | null) {
  const pref = settings?.theme ?? DEFAULTS.theme;
  useEffect(() => {
    const applyTheme = () => document.documentElement.classList.toggle("dark", isDark(pref));
    applyTheme();
    return onSystemThemeChange(applyTheme);
  }, [pref]);
}

/** 언어에 맞춰 <html lang> 과 창 제목을 바꾼다 */
export function useDocumentLang(settings: Settings | null, t: T) {
  const lang = resolveLang(settings?.lang ?? DEFAULTS.lang);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t("opt.title");
  }, [lang, t]);
}

export function useImages() {
  const [images, setImages] = useState<(string | null)[]>([null, null, null]);
  useEffect(() => {
    void loadImages().then(setImages);
  }, []);
  return [images, setImages] as const;
}

export function useMemos() {
  const [memos, setMemos] = useState<[string, Memo][]>([]);
  const reload = useCallback(async () => {
    const all = await chrome.storage.local.get(null);
    setMemos(
      Object.entries(all)
        .filter((e): e is [string, Memo] => e[0].startsWith("memo:") && !!(e[1] as Memo)?.text)
        .sort((a, b) => b[1].updated - a[1].updated),
    );
  }, []);
  useEffect(() => {
    void reload();
    const onChange = (changes: Record<string, unknown>, area: string) => {
      if (area === "local" && Object.keys(changes).some((k) => k.startsWith("memo:"))) void reload();
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, [reload]);
  return memos;
}

/** "모든 메모 보기"로 열리면 #memos 로 이동 */
export function useHashJump(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const jump = () => {
      const el = location.hash && document.getElementById(location.hash.slice(1));
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const id = setTimeout(jump, 200);
    addEventListener("hashchange", jump);
    return () => {
      clearTimeout(id);
      removeEventListener("hashchange", jump);
    };
  }, [ready]);
}
