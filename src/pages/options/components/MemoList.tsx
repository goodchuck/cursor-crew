import { useState } from "react";
import type { Memo } from "@src/shared/settings";
import type { Lang, T } from "@src/shared/i18n";
import { btnCls, inputCls } from "./ui";

export function MemoList({ memos, lang, t }: { memos: [string, Memo][]; lang: Lang; t: T }) {
  const [q, setQ] = useState("");
  if (!memos.length)
    return (
      <div className="py-6 text-center text-zinc-400">
        <div className="mb-2 text-3xl">📝</div>
        {t("opt.memosEmpty")}
      </div>
    );
  const needle = q.trim().toLowerCase();
  const shown = needle ? memos.filter(([key, m]) => [m.text, m.title, key].some((x) => String(x || "").toLowerCase().includes(needle))) : memos;
  return (
    <div>
      {memos.length > 3 && <input type="search" placeholder={t("opt.memoSearch")} aria-label={t("opt.memoSearch")} value={q} onChange={(e) => setQ(e.target.value)} className={`${inputCls} mb-2`} />}
      {!shown.length && <p className="py-4 text-center text-zinc-400">{t("opt.memosNoMatch")}</p>}
      {shown.map(([key, m]) => (
        <div key={key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-t border-zinc-100 py-2.5 first:border-t-0 dark:border-zinc-800">
          <a href={m.url} target="_blank" rel="noreferrer" className="truncate font-semibold text-brand no-underline hover:underline">
            {m.title || key.slice(5)}
          </a>
          <button type="button" className={`${btnCls} row-span-3 self-start`} onClick={() => chrome.storage.local.remove(key)}>
            {t("opt.memoDelete")}
          </button>
          <p className="m-0 line-clamp-3 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{m.text}</p>
          <small className="truncate text-zinc-400">
            {key.slice(5)} · {new Date(m.updated).toLocaleString(lang === "ko" ? "ko-KR" : "en-US")}
          </small>
        </div>
      ))}
    </div>
  );
}
