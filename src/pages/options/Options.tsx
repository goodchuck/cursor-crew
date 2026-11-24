// 설정 창. 툴바 아이콘을 누르면 별도 창(540×720)으로 열린다. 바꾸면 바로 저장되고 열린 탭의 펫에도 반영된다.
import { useEffect, useState } from "react";
import { CUSTOM_IMAGES, HINT_SEEN_KEY, reorderImages, saveImage, type LangPref, type MenuItem, type MenuKey, type Settings, type ThemePref } from "@src/shared/settings";
import { resolveLang, type MsgKey } from "@src/shared/i18n";
import { getSkin } from "@src/shared/skins";
import { itemName } from "@src/pages/content/actions";
import { useDocumentLang, useHashJump, useImages, useMemos, useSettings, useT, useThemeClass } from "./hooks";
import { prepareImage } from "./image";
import { Range, Section, Select, Switch, btnCls, inputCls } from "./components/ui";
import { SkinPicker } from "./components/SkinPicker";
import { ImageSlots, type Msg } from "./components/ImageSlots";
import { MenuEditor } from "./components/MenuEditor";
import { MemoList } from "./components/MemoList";

export default function Options() {
  const { settings: s, update, savedAt } = useSettings();
  const t = useT(s);
  const [images, setImages] = useImages();
  const memos = useMemos();
  const [imgMsg, setImgMsg] = useState<Msg | null>(null);
  const [notice, setNotice] = useState<MsgKey | null>(null);
  useThemeClass(s);
  useDocumentLang(s, t);
  useHashJump(!!s);

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
    ["Alt", "Alt"],
    ["Control", "Ctrl"],
    ["Shift", "Shift"],
    ["AltShift", t("opt.keyAltShiftNote")],
  ];

  return (
    <main className="mx-auto max-w-[720px] px-3.5 pb-10">
      <header className="sticky top-0 z-10 -mx-3.5 mb-1.5 flex items-center gap-2.5 border-b border-zinc-200 bg-zinc-100/90 px-3.5 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <h1 className="m-0 text-lg font-bold">Cursor Crew</h1>
        <span aria-live="polite" className="text-[13px] text-ok">
          {notice && t(notice)}
        </span>
        <Switch checked={s.enabled} onChange={(enabled) => update({ enabled })} label={t(s.enabled ? "opt.on" : "opt.off")} title={t("opt.toggleTitle")} />
      </header>
      <p className="mx-0.5 mt-1 mb-3 text-[13px] text-zinc-500 dark:text-zinc-400">
        {t("opt.topHelp")}{" "}
        <a
          href="#"
          className="text-brand"
          onClick={(e) => {
            e.preventDefault();
            void chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
          }}
        >
          {t("opt.shortcuts")}
        </a>
      </p>

      <Section title={t("opt.openMenu")} help={t("opt.openMenuHelp")}>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 whitespace-nowrap">
            {t("opt.menuKey")}
            <Select<MenuKey> value={s.menuKey} onChange={(menuKey) => update({ menuKey })} options={keyOptions} className="w-auto" />
          </label>
          <button
            type="button"
            className={btnCls}
            onClick={async () => {
              await chrome.storage.local.remove(HINT_SEEN_KEY);
              setNotice("opt.hintAgainDone");
            }}
          >
            {t("opt.hintAgain")}
          </button>
        </div>
      </Section>

      <Section title={t("opt.menu")} help={t("opt.menuHelp")}>
        <MenuEditor items={s.crew} onChange={onCrewChange} t={t} />
      </Section>

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

      <Section title={t("opt.display")}>
        <div className="grid gap-2.5">
          <label className="flex items-center gap-3">
            <span className="w-20 shrink-0">{t("opt.theme")}</span>
            <Select<ThemePref>
              value={s.theme}
              onChange={(theme) => update({ theme })}
              options={[
                ["system", t("opt.themeSystem")],
                ["light", t("opt.themeLight")],
                ["dark", t("opt.themeDark")],
              ]}
            />
          </label>
          <label className="flex items-center gap-3">
            <span className="w-20 shrink-0">{t("opt.lang")}</span>
            <Select<LangPref>
              value={s.lang}
              onChange={(lang) => update({ lang })}
              options={[
                ["auto", t("opt.langAuto")],
                ["ko", "한국어"],
                ["en", "English"],
              ]}
            />
          </label>
        </div>
      </Section>

      <Section title={t("opt.excluded")} help={t("opt.excludedHelp")}>
        <ExcludedSites value={s.excluded} onChange={(excluded) => update({ excluded })} />
      </Section>

      <Section id="memos" title={t("opt.memos")}>
        <MemoList memos={memos} lang={resolveLang(s.lang)} t={t} />
      </Section>
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
