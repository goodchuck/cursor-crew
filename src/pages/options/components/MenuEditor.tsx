// '펫과 기능' 편집: 펫 한 마리 = 카드 하나(색·대표 기능·더 넣은 기능·순서·추가·삭제)
import { ACTION_IDS, ACTION_NEEDS_URL, COLORS, MAX_CREW, MAX_MORE, type ActionId, type MenuItem, type Task } from "@src/shared/settings";
import { PRESETS, PRESET_IDS, presetOf, type PresetId } from "@src/shared/presets";
import type { Lang, T } from "@src/shared/i18n";
import { btnCls, inputCls, Select } from "./ui";

function validUrl(u?: string): boolean {
  const s = String(u || "").trim();
  if (!s) return false;
  try {
    new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : "https://" + s);
    return /\./.test(s) || /^[a-z]+:/i.test(s);
  } catch {
    return false;
  }
}

const toolBtn = "cursor-pointer rounded-md px-2 py-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-default disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";

/** 기능 하나의 입력칸: 이름 · 기능 · (링크면) 바로 쓰기 + 주소. tools 는 오른쪽 끝 버튼들 */
function TaskFields({ task, onChange, lang, t, lead, tools }: { task: Task; onChange: (patch: Partial<Task>) => void; lang: Lang; t: T; lead: React.ReactNode; tools: React.ReactNode }) {
  const needsUrl = ACTION_NEEDS_URL[task.action];
  const preset = presetOf(task.url);
  const bad = needsUrl && !validUrl(task.url);
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)_minmax(0,1.1fr)_auto] items-center gap-x-2 gap-y-1.5">
      {lead}
      <input type="text" maxLength={16} aria-label={t("opt.itemName")} placeholder={t("opt.itemNamePlaceholder")} value={task.name} onChange={(e) => onChange({ name: e.target.value })} className={inputCls} />
      <Select<ActionId> label={t("opt.itemAction")} value={task.action} onChange={(action) => onChange({ action })} options={ACTION_IDS.map((a) => [a, t(`action.${a}Desc` as const)])} />
      <div className="flex">{tools}</div>
      {needsUrl && (
        <div className="col-span-3 col-start-2 grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] gap-2">
          <Select<PresetId | "">
            label={t("opt.preset")}
            value={preset || ""}
            onChange={(id) => id && onChange({ url: PRESETS[id](lang) })}
            options={[["", t("opt.presetCustom")], ...PRESET_IDS.map((id) => [id, t(`preset.${id}` as const)] as [PresetId, string])]}
          />
          <input
            type="text"
            aria-label={t("opt.itemUrl")}
            aria-invalid={bad}
            placeholder="https://…"
            value={task.url || ""}
            onChange={(e) => onChange({ url: e.target.value.trim() })}
            className={`${inputCls} ${bad ? "border-danger dark:border-danger" : ""}`}
          />
          {!preset && <p className={`col-span-2 m-0 text-xs ${bad && task.url ? "text-danger" : "text-zinc-400"}`}>{bad && task.url ? t("opt.urlInvalid") : t("opt.urlHelp")}</p>}
        </div>
      )}
    </div>
  );
}

/** onChange(items, order): order[j] = 새 j번째 항목의 예전 번호(새로 추가한 항목은 -1). 펫별 이미지를 같이 옮기는 데 쓴다 */
export function MenuEditor({ items, onChange, lang, t }: { items: MenuItem[]; onChange: (items: MenuItem[], order: number[]) => void; lang: Lang; t: T }) {
  const same = () => items.map((_, j) => j);
  const set = (i: number, patch: Partial<MenuItem>) => onChange(items.map((m, j) => (j === i ? { ...m, ...patch } : m)), same());
  const setMore = (i: number, more: Task[]) => set(i, { more: more.length ? more : undefined });
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    const order = same();
    [next[i], next[j]] = [next[j], next[i]];
    [order[i], order[j]] = [order[j], order[i]];
    onChange(next, order);
  };
  const add = () => {
    const used = new Set(items.map((m) => m.color.toUpperCase()));
    const color = COLORS.find((c) => !used.has(c.toUpperCase())) || COLORS[items.length % COLORS.length];
    onChange([...items, { name: "", color, action: "link", url: PRESETS.google(lang) }], [...same(), -1]);
  };

  return (
    <div className="grid gap-3">
      {items.map((m, i) => {
        const more = m.more || [];
        return (
          <div key={i} className="rounded-xl border border-zinc-200 p-2.5 dark:border-zinc-700" style={{ borderLeft: `4px solid ${m.color}` }}>
            <TaskFields
              task={m}
              lang={lang}
              t={t}
              onChange={(patch) => set(i, patch)}
              lead={<input type="color" aria-label={t("opt.itemColor")} title={t("opt.pet", { n: i + 1 })} value={m.color} onChange={(e) => set(i, { color: e.target.value })} className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0" />}
              tools={
                <>
                  <button type="button" className={toolBtn} title={t("opt.up")} aria-label={t("opt.up")} disabled={i === 0} onClick={() => move(i, -1)}>
                    ↑
                  </button>
                  <button type="button" className={toolBtn} title={t("opt.down")} aria-label={t("opt.down")} disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                    ↓
                  </button>
                  <button type="button" className={toolBtn} title={t("opt.remove")} aria-label={t("opt.remove")} disabled={items.length <= 1} onClick={() => onChange(items.filter((_, j) => j !== i), same().filter((j) => j !== i))}>
                    ✕
                  </button>
                </>
              }
            />
            {more.map((task, k) => (
              <div key={k} className="mt-2 border-t border-dashed border-zinc-200 pt-2 dark:border-zinc-700">
                <TaskFields
                  task={task}
                  lang={lang}
                  t={t}
                  onChange={(patch) => setMore(i, more.map((x, j) => (j === k ? { ...x, ...patch } : x)))}
                  lead={<span className="text-center text-xs font-bold text-zinc-400">{k + 2}</span>}
                  tools={
                    <button type="button" className={toolBtn} title={t("opt.remove")} aria-label={t("opt.remove")} onClick={() => setMore(i, more.filter((_, j) => j !== k))}>
                      ✕
                    </button>
                  }
                />
              </div>
            ))}
            <button
              type="button"
              className="mt-2 ml-10 cursor-pointer rounded-md px-1.5 py-0.5 text-[13px] text-brand hover:bg-sky-50 disabled:cursor-default disabled:text-zinc-400 disabled:hover:bg-transparent dark:hover:bg-sky-950/40"
              disabled={more.length >= MAX_MORE}
              title={more.length >= MAX_MORE ? t("opt.moreFull") : undefined}
              onClick={() => setMore(i, [...more, { name: "", action: "link", url: PRESETS.youtube(lang) }])}
            >
              {more.length >= MAX_MORE ? t("opt.moreFull") : t("opt.addMore")}
            </button>
          </div>
        );
      })}
      <button type="button" className={`${btnCls} justify-self-start`} disabled={items.length >= MAX_CREW} onClick={add}>
        {t("opt.addItem")}
      </button>
    </div>
  );
}
