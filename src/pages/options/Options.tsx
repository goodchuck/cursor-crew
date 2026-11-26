// 설정 창. 툴바 아이콘을 누르면 별도 창(540×720)으로 열린다. 바꾸면 바로 저장되고 열린 탭의 펫에도 반영된다.
// 탭: 펫(쓰는 법 + 펫별 기능) · 단축키 · 모양 · 메모 · 기타(테마·언어·끌 사이트)
import { useEffect, useState } from "react";
import { CUSTOM_IMAGES, FORMATIONS, HINT_SEEN_KEY, reorderImages, saveImage, type Formation, type LangPref, type MenuItem, type MenuKey, type Settings, type ThemePref } from "@src/shared/settings";
import { resolveLang, type MsgKey } from "@src/shared/i18n";
import { IS_MAC, codeLabel, menuKeyLabel } from "@src/shared/platform";
import { KeyRecorder } from "./components/KeyRecorder";
import { BackupButtons } from "./components/BackupButtons";
import { getSkin } from "@src/shared/skins";
import { itemName } from "@src/pages/content/actions";
import { useDocumentLang, useImages, useMemos, useSettings, useT, useThemeClass } from "./hooks";
import { prepareImage } from "./image";
import { Kbd, Range, Row, Section, Segmented, Select, Switch, Toggle, btnCls, inputCls } from "./components/ui";
import { SkinPicker } from "./components/SkinPicker";
import { ImageSlots, type Msg } from "./components/ImageSlots";
import { MenuEditor } from "./components/MenuEditor";
import { MemoList } from "./components/MemoList";

type Tab = "pets" | "keys" | "look" | "memos" | "more";
const TABS: Tab[] = ["pets", "keys", "look", "memos", "more"];
const tabFromHash = (): Tab => TABS.find((x) => "#" + x === location.hash) ?? "pets";

export default function Options() {
  const { settings: s, update, savedAt } = useSettings();
  const t = useT(s);
  const [images, setImages] = useImages();
  const memos = useMemos();
  const [imgMsg, setImgMsg] = useState<Msg | null>(null);
  const [notice, setNotice] = useState<MsgKey | null>(null);
  useThemeClass(s);
  useDocumentLang(s, t);

  // 탭은 주소 #으로도 연다(페이지 메모장의 '전체 메모' → #memos)
  const [tab, setTab] = useState<Tab>(tabFromHash);
  useEffect(() => {
    const on = () => setTab(tabFromHash());
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  const go = (x: Tab) => {
    history.replaceState(null, "", "#" + x);
    setTab(x);
    scrollTo(0, 0);
  };

  // 저장될 때마다 헤더에 잠깐 "저장됨"
  useEffect(() => {
    if (!savedAt) return;
    setNotice("opt.saved");
    const id = setTimeout(() => setNotice(null), 1200);
    return () => clearTimeout(id);
  }, [savedAt]);

  if (!s) return null;

  const onFile = async (i: number, file: File) => {
    const r = await prepareImage(file);
    if (!r.ok) {
      if (r.reason === "notImage") setImgMsg({ key: "opt.imgNotImage", kind: "err" });
      else if (r.reason === "tooBig") setImgMsg({ key: "opt.imgTooBig", vars: { mb: r.mb! }, kind: "err" });
      else setImgMsg({ key: "opt.imgFailed", vars: { err: t("opt.imgCantRead") }, kind: "err" });
      return;
    }
    await saveImage(i, r.url);
    setImages((prev) => prev.map((u, j) => (j === i ? r.url : u)));
    const patch: Partial<Settings> = { skin: "image" }; // 이미지를 올리면 바로 그 모양으로
    if (Math.max(r.width, r.height) <= 64) patch.imagePixelated = true; // 작은 그림은 대개 도트
    update(patch);
    setImgMsg({ key: r.animated ? "opt.imgDoneAnimated" : "opt.imgDone", vars: { name: names[i], w: r.width, h: r.height }, kind: "ok" });
  };

  const onClear = async (i: number) => {
    await saveImage(i, null);
    const next = images.map((u, j) => (j === i ? null : u));
    setImages(next);
    if (!next.some(Boolean) && s.skin === "image") update({ skin: "slime" });
    setImgMsg({ key: "opt.imgRemoved", vars: { name: names[i] } });
  };

  // 펫 순서를 바꾸거나 지우면 펫마다 올린 이미지도 같이 옮긴다
  const onCrewChange = async (crew: MenuItem[], order: number[]) => {
    update({ crew });
    const moved = order.length !== s.crew.length || order.some((o, j) => o !== j);
    if (moved && images.some(Boolean)) setImages(await reorderImages(images, order));
  };

  const firstImage = images.find(Boolean) || null;
  const names = s.crew.map((item) => itemName(item, t));
  const keyOptions: [MenuKey, string][] = [
    ["Alt", menuKeyLabel("Alt")],
    ["Control", menuKeyLabel("Control")],
    ["Shift", menuKeyLabel("Shift")],
    ["AltShift", IS_MAC ? menuKeyLabel("AltShift") : t("opt.keyAltShiftNote")],
  ];
  const lang = resolveLang(s.lang);
  const keyName = menuKeyLabel(s.menuKey).replace(/^[⌥⌃⇧]+ /, "");
  const [step1a, step1b] = t("guide.step1", { key: "\u0000" }).split("\u0000");
  const themeNames: Record<ThemePref, string> = { system: t("opt.themeSystem"), light: t("opt.themeLight"), dark: t("opt.themeDark") };
  const themeIcon: Record<ThemePref, string> = { system: "🖥️", light: "☀️", dark: "🌙" };
  const nextTheme: Record<ThemePref, ThemePref> = { system: "light", light: "dark", dark: "system" };
  const tabs: [Tab, string][] = [
    ["pets", t("tab.pets")],
    ["keys", t("tab.keys")],
    ["look", t("tab.look")],
    ["memos", t("tab.memos") + (memos.length ? ` ${memos.length}` : "")],
    ["more", t("tab.more")],
  ];

  return (
    <main className="mx-auto max-w-[720px] pb-10">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-100/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="flex items-center gap-2 px-3.5 pt-3 pb-1.5">
          <img src="/icons/32.png" alt="" width={24} height={24} />
          <h1 className="m-0 text-lg font-bold">Cursor Crew</h1>
          <span aria-live="polite" className="text-[13px] text-ok">
            {notice && t(notice)}
          </span>
          <span className="ml-auto" />
          <button
            type="button"
            className="cursor-pointer rounded-lg px-2 py-1 text-base leading-none hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title={t("opt.themeToggle", { name: themeNames[s.theme] })}
            aria-label={t("opt.themeToggle", { name: themeNames[s.theme] })}
            onClick={() => update({ theme: nextTheme[s.theme] })}
          >
            {themeIcon[s.theme]}
          </button>
          <Switch checked={s.enabled} onChange={(enabled) => update({ enabled })} label={t(s.enabled ? "opt.on" : "opt.off")} title={t("opt.toggleTitle")} />
        </div>
        <nav role="tablist" className="flex gap-0.5 overflow-x-auto px-2">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => go(id)}
              className={`cursor-pointer border-b-2 px-3 pt-1 pb-2 text-[13px] whitespace-nowrap ${
                tab === id ? "border-brand font-bold text-zinc-900 dark:text-white" : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <div className="px-3.5 pt-3">
        {!s.enabled && (
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900">
            <span className="flex-1">{t("opt.offBanner")}</span>
            <button type="button" className="cursor-pointer rounded-lg bg-amber-500 px-3 py-1 font-semibold text-white hover:bg-amber-600" onClick={() => update({ enabled: true })}>
              {t("opt.turnOn")}
            </button>
          </div>
        )}

        {tab === "pets" && (
          <>
            {/* 쓰는 법: 긴 글 대신 3단계 */}
            <section className="mb-3 rounded-2xl bg-gradient-to-br from-sky-50 to-white p-4 ring-1 ring-sky-100 dark:from-sky-950/50 dark:to-zinc-900 dark:ring-sky-900/50">
              <h2 className="m-0 mb-2.5 text-[13px] font-bold text-sky-700 dark:text-sky-300">{t("guide.title")}</h2>
              <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0 text-[13px] font-semibold">
                <li className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 shadow-sm dark:bg-zinc-800">
                  <span className="text-sky-500">1</span>
                  {step1a}
                  <Kbd>{keyName}</Kbd>
                  {step1b}
                </li>
                <li aria-hidden className="text-zinc-300 dark:text-zinc-600">
                  →
                </li>
                <li className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 shadow-sm dark:bg-zinc-800">
                  <span className="text-sky-500">2</span> {t("guide.step2")}
                </li>
                <li aria-hidden className="text-zinc-300 dark:text-zinc-600">
                  →
                </li>
                <li className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 shadow-sm dark:bg-zinc-800">
                  <span className="text-sky-500">3</span> {t("guide.step3")}
                </li>
              </ol>
              <ul className="m-0 mt-2.5 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-xs text-zinc-500 dark:text-zinc-400">
                {s.numberKeys && <li>· {t("guide.tipNum", { key: keyName })}</li>}
                {s.lineKey && <li>· {t("guide.tipLine", { key: keyName, line: codeLabel(s.lineKey) })}</li>}
                <li>· {t("guide.tipFree")}</li>
              </ul>
            </section>
            <Section title={t("opt.menu")} help={t("opt.petsHelp")}>
              <MenuEditor items={s.crew} onChange={onCrewChange} lang={lang} t={t} skin={s.skin} />
            </Section>
          </>
        )}

        {tab === "keys" && (
          <Section title={t("tab.keys")}>
            <Row title={t("opt.menuKey")} help={t("opt.menuKeyHelp")}>
              <div className="w-44">
                <Select<MenuKey> label={t("opt.menuKey")} value={s.menuKey} onChange={(menuKey) => update({ menuKey })} options={keyOptions} />
              </div>
            </Row>
            <Row title={t("opt.numberKeysRow")} help={`${t("guide.tipNum", { key: keyName })}. ${t("opt.numberKeysHelp")}`}>
              <Toggle checked={s.numberKeys} onChange={(numberKeys) => update({ numberKeys })} label={t("opt.numberKeys")} />
            </Row>
            <Row title={t("opt.lineKey")} help={t("opt.lineKeyHelp")}>
              <KeyRecorder value={s.lineKey} onChange={(lineKey) => update({ lineKey })} prefix={keyName} t={t} />
            </Row>
            <Row title={t("opt.formation")} help={t("opt.formationRowHelp")}>
              <Segmented<Formation>
                label={t("opt.formation")}
                value={s.formation}
                onChange={(formation) => update({ formation })}
                options={FORMATIONS.map((f) => [f, t(`opt.formation.${f}` as const).replace(/\s*\(.*\)$/, "")])}
              />
            </Row>
            <Row title={t("opt.toggleKey")} help={t("opt.toggleKeyHelp")}>
              <Kbd>{IS_MAC ? "⌥⇧C" : "Alt+Shift+C"}</Kbd>
              <a
                href="#"
                className="text-[13px] text-brand"
                onClick={(e) => {
                  e.preventDefault();
                  void chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
                }}
              >
                {t("opt.shortcuts")}
              </a>
            </Row>
            <Row title={t("opt.hintRow")} help={t("opt.hintRowHelp")}>
              <button
                type="button"
                className={btnCls}
                onClick={async () => {
                  await chrome.storage.local.remove(HINT_SEEN_KEY);
                  setNotice("opt.hintAgainDone");
                }}
              >
                {t("opt.hintShow")}
              </button>
            </Row>
          </Section>
        )}

        {tab === "look" && (
          <Section title={t("opt.look")} help={t("opt.lookHelp")}>
            <SkinPicker
              value={s.skin}
              onChange={(skin) => {
                update({ skin });
                if (getSkin(skin).needsImage && !firstImage) setImgMsg({ key: "opt.imgUpload" });
              }}
              color={s.crew[0]?.color || "#5BD16A"}
              image={firstImage}
              pixelated={s.imagePixelated}
              t={t}
            />
            {/* 내 이미지·GIF 올리기: CUSTOM_IMAGES 가 꺼져 있으면 숨김(코드는 유지) */}
            {CUSTOM_IMAGES && <ImageSlots names={names} images={images} pixelated={s.imagePixelated} active={s.skin === "image"} msg={imgMsg} onFile={onFile} onClear={onClear} onPixelated={(imagePixelated) => update({ imagePixelated })} t={t} />}
            <div className="grid gap-2.5">
              <Range label={t("opt.size")} value={s.size} min={24} max={64} step={2} onChange={(size) => update({ size })} display={s.size + "px"} />
              <Range label={t("opt.opacity")} value={s.opacity} min={0.3} max={1} step={0.05} onChange={(opacity) => update({ opacity })} display={Math.round(s.opacity * 100) + "%"} />
            </div>
          </Section>
        )}

        {tab === "memos" && (
          <Section id="memos" title={t("opt.memos")} help={memos.length ? t("opt.memoCount", { n: memos.length }) : undefined}>
            <MemoList memos={memos} lang={lang} t={t} />
          </Section>
        )}

        {tab === "more" && (
          <>
            <Section title={t("opt.display")}>
              <Row title={t("opt.theme")}>
                <Segmented<ThemePref>
                  label={t("opt.theme")}
                  value={s.theme}
                  onChange={(theme) => update({ theme })}
                  options={(["system", "light", "dark"] as ThemePref[]).map((x) => [x, `${themeIcon[x]} ${themeNames[x]}`])}
                />
              </Row>
              <Row title={t("opt.lang")}>
                <Segmented<LangPref>
                  label={t("opt.lang")}
                  value={s.lang}
                  onChange={(l) => update({ lang: l })}
                  options={[
                    ["auto", t("opt.langAuto")],
                    ["ko", "한국어"],
                    ["en", "English"],
                  ]}
                />
              </Row>
            </Section>
            <Section title={t("guide.title")}>
              <Row title={t("opt.welcomeRow")} help={t("opt.welcomeRowHelp")}>
                <button type="button" className={btnCls} onClick={() => void chrome.runtime.sendMessage({ type: "crew:welcome" })}>
                  {t("opt.welcomeOpen")}
                </button>
              </Row>
            </Section>
            <Section title={t("opt.backup")} help={t("opt.backupHelp")}>
              <BackupButtons t={t} />
            </Section>
            <Section title={t("opt.excluded")} help={t("opt.excludedHelp")}>
              <ExcludedSites value={s.excluded} onChange={(excluded) => update({ excluded })} />
            </Section>
          </>
        )}
      </div>
    </main>
  );
}

// 줄 단위로 편집하는 동안 빈 줄이 지워지지 않게 글자는 따로 들고 있는다
function ExcludedSites({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(value.join("\n"));
  return (
    <textarea
      rows={4}
      placeholder="figma.com"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value.split(/\s+/).map((x) => x.trim()).filter(Boolean));
      }}
      className={`${inputCls} resize-y`}
    />
  );
}
