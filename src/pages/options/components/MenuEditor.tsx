// 원형 메뉴 항목 편집(색·이름·기능·링크·순서·추가·삭제)
import { ACTION_IDS, ACTION_NEEDS_URL, COLORS, MAX_CREW, type ActionId, type MenuItem } from "@src/shared/settings";
import type { T } from "@src/shared/i18n";
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

export function MenuEditor({ items, onChange, t }: { items: MenuItem[]; onChange: (items: MenuItem[]) => void; t: T }) {
  const set = (i: number, patch: Partial<MenuItem>) => onChange(items.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const add = () => {
    const used = new Set(items.map((m) => m.color.toUpperCase()));
    const color = COLORS.find((c) => !used.has(c.toUpperCase())) || COLORS[items.length % COLORS.length];
    onChange([...items, { name: t("opt.newLink"), color, action: "link", url: "" }]);
  };
  const toolBtn = "cursor-pointer rounded-md px-2 py-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-default disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";

  return (
    <div>
      {items.map((m, i) => {
        const needsUrl = ACTION_NEEDS_URL[m.action];
        return (
          <div key={i} className="grid grid-cols-[32px_minmax(0,1fr)_minmax(0,1.1fr)_auto] items-center gap-x-2 gap-y-1.5 border-t border-zinc-100 py-2 first:border-t-0 dark:border-zinc-800">
            <input type="color" aria-label={t("opt.itemColor")} value={m.color} onChange={(e) => set(i, { color: e.target.value })} className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0" />
            <input type="text" maxLength={16} aria-label={t("opt.itemName")} placeholder={t("opt.itemNamePlaceholder")} value={m.name} onChange={(e) => set(i, { name: e.target.value })} className={inputCls} />
            <Select<ActionId> label={t("opt.itemAction")} value={m.action} onChange={(action) => set(i, { action })} options={ACTION_IDS.map((a) => [a, t(`action.${a}Desc` as const)])} />
            <div className="flex">
              <button type="button" className={toolBtn} title={t("opt.up")} aria-label={t("opt.up")} disabled={i === 0} onClick={() => move(i, -1)}>
                ↑
              </button>
              <button type="button" className={toolBtn} title={t("opt.down")} aria-label={t("opt.down")} disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                ↓
              </button>
              <button type="button" className={toolBtn} title={t("opt.remove")} aria-label={t("opt.remove")} onClick={() => onChange(items.filter((_, j) => j !== i))}>
                ✕
              </button>
            </div>
            {needsUrl && (
              <input
                type="text"
                aria-label={t("opt.itemUrl")}
                placeholder="https://…"
                value={m.url || ""}
                onChange={(e) => set(i, { url: e.target.value.trim() })}
                className={`${inputCls} col-span-3 col-start-2 ${validUrl(m.url) ? "" : "border-danger dark:border-danger"}`}
              />
            )}
          </div>
        );
      })}
      <button type="button" className={`${btnCls} mt-2`} disabled={items.length >= MAX_CREW} onClick={add}>
        {t("opt.addItem")}
      </button>
    </div>
  );
}
