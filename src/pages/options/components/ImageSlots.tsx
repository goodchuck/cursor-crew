// 내 이미지·GIF 칸(펫마다 한 장). 끌어다 놓기·클릭해서 고르기·지우기
import { useEffect, useRef, useState, type DragEvent } from "react";
import type { MsgKey, T } from "@src/shared/i18n";

/** 상태 문구는 글자 대신 키로 들고 있어서 언어를 바꿔도 다시 번역된다 */
export type Msg = { key: MsgKey; vars?: Record<string, string | number>; kind?: "ok" | "err" };

function Slot({ i, url, pixelated, fallbackToFirst, onFile, onClear, t }: { i: number; url: string | null; pixelated: boolean; fallbackToFirst: boolean; onFile: (i: number, f: File) => void; onClear: (i: number) => void; t: T }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const n = i + 1;
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(i, f);
  };
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={url ? t("opt.imageChange", { n }) : t("opt.imagePick", { n })}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), input.current?.click())}
      onDragOver={(e) => (e.preventDefault(), setDrag(true))}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className={`relative flex h-26 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-1.5 text-center text-xs outline-none hover:border-brand hover:text-brand focus-visible:border-brand ${
        drag ? "border-brand bg-sky-50 dark:bg-sky-950/40" : "border-zinc-300 bg-white text-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
      }`}
    >
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(i, e.target.files[0])} />
      {url ? (
        <>
          <img src={url} alt="" className="size-14 object-contain" style={{ imageRendering: pixelated ? "pixelated" : "auto" }} />
          <span>{t("opt.imagePet", { n })}</span>
          <button
            type="button"
            title={t("opt.imageRemove")}
            aria-label={t("opt.imageRemove")}
            onClick={(e) => (e.stopPropagation(), onClear(i))}
            className="absolute top-1 right-1 cursor-pointer rounded-md bg-zinc-100 px-1.5 text-zinc-500 hover:bg-red-500 hover:text-white dark:bg-zinc-800"
          >
            ✕
          </button>
        </>
      ) : (
        <>
          <span className="text-2xl leading-none">+</span>
          <span>{t("opt.imagePet", { n })}</span>
          <span>{fallbackToFirst ? t("opt.imageSameAs1") : t("opt.imageDrop")}</span>
        </>
      )}
    </div>
  );
}

export function ImageSlots(props: { count: number; images: (string | null)[]; pixelated: boolean; active: boolean; msg: Msg | null; onFile: (i: number, f: File) => void; onClear: (i: number) => void; onPixelated: (v: boolean) => void; t: T }) {
  const { count, images, pixelated, active, msg, onFile, onClear, onPixelated, t } = props;

  // 칸 밖에 떨어뜨려도 브라우저가 파일을 열어 버리지 않게(펫 1 칸으로 받는다)
  const onFileRef = useRef(onFile);
  onFileRef.current = onFile;
  useEffect(() => {
    const over = (e: globalThis.DragEvent) => e.preventDefault();
    const drop = (e: globalThis.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer?.files[0];
      if (f) onFileRef.current(0, f);
    };
    addEventListener("dragover", over);
    addEventListener("drop", drop);
    return () => {
      removeEventListener("dragover", over);
      removeEventListener("drop", drop);
    };
  }, []);

  return (
    <div className={`mb-3 rounded-xl border-[1.5px] p-3 ${active ? "border-brand bg-sky-50/60 dark:bg-sky-950/30" : "border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/40"}`}>
      <div className="mb-2.5">
        <b>{t("opt.imageTitle")}</b>
        <p className="mt-0.5 text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">{t("opt.imageHelp")}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: count }, (_, i) => (
          <Slot key={i} i={i} url={images[i]} pixelated={pixelated} fallbackToFirst={i > 0 && !!images[0]} onFile={onFile} onClear={onClear} t={t} />
        ))}
      </div>
      <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-[13px]">
        <input type="checkbox" className="accent-brand" checked={pixelated} onChange={(e) => onPixelated(e.target.checked)} />
        {t("opt.pixelated")}
      </label>
      <p role="status" aria-live="polite" className={`mt-2 min-h-[1em] text-[13px] ${msg?.kind === "err" ? "text-danger" : msg?.kind === "ok" ? "text-ok" : ""}`}>
        {msg && t(msg.key, msg.vars)}
      </p>
    </div>
  );
}
