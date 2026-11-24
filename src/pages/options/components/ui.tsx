// 설정 창에서 쓰는 작은 UI 조각들
import type { ReactNode } from "react";

export function Section({ id, title, help, children }: { id?: string; title: string; help?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="mb-3 scroll-mt-16 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
      <h2 className="mb-1.5 text-base font-bold">{title}</h2>
      {help && <p className="mb-3 text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">{help}</p>}
      {children}
    </section>
  );
}

export function Switch({ checked, onChange, label, title }: { checked: boolean; onChange: (v: boolean) => void; label: string; title?: string }) {
  return (
    <label title={title} className={`ml-auto flex cursor-pointer items-center gap-2 text-[13px] font-semibold ${checked ? "text-ok" : "text-zinc-500"}`}>
      <span>{label}</span>
      <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-6 w-10 rounded-full bg-zinc-300 transition-colors peer-checked:bg-ok peer-focus-visible:outline-2 peer-focus-visible:outline-brand dark:bg-zinc-700 after:absolute after:top-[3px] after:left-[3px] after:size-[18px] after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4" />
    </label>
  );
}

export function Range({ label, value, min, max, step, onChange, display }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; display: string }) {
  return (
    <label className="flex items-center gap-3">
      <span className="w-20 shrink-0">{label}</span>
      <input type="range" className="min-w-0 flex-1 accent-brand" value={value} min={min} max={max} step={step} onChange={(e) => onChange(+e.target.value)} />
      <output className="w-12 shrink-0 text-right tabular-nums text-zinc-500 dark:text-zinc-400">{display}</output>
    </label>
  );
}

export const inputCls =
  "w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-brand dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";

export const btnCls = "cursor-pointer rounded-lg bg-zinc-100 px-3 py-1.5 text-sm hover:bg-zinc-200 disabled:cursor-default disabled:opacity-40 dark:bg-zinc-800 dark:hover:bg-zinc-700";

export function Select<V extends string>({ value, onChange, options, label, className }: { value: V; onChange: (v: V) => void; options: [V, string][]; label?: string; className?: string }) {
  return (
    <select aria-label={label} className={`${inputCls} ${className || ""}`} value={value} onChange={(e) => onChange(e.target.value as V)}>
      {options.map(([v, text]) => (
        <option key={v} value={v}>
          {text}
        </option>
      ))}
    </select>
  );
}
