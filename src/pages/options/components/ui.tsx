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
    <label title={title} className={`flex cursor-pointer items-center gap-2 text-[13px] font-semibold ${checked ? "text-ok" : "text-zinc-500"}`}>
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

/** 몇 개 중 하나 고르기(테마·언어·모양처럼 선택지가 적을 때 드롭다운 대신) */
export function Segmented<V extends string>({ value, onChange, options, label }: { value: V; onChange: (v: V) => void; options: [V, ReactNode][]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`cursor-pointer rounded-md px-2.5 py-1 text-[13px] whitespace-nowrap transition-colors ${
            value === v ? "bg-white font-semibold text-zinc-900 shadow-sm dark:bg-zinc-600 dark:text-white" : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/** 설정 한 줄: 왼쪽 이름·설명, 오른쪽 조절 */
export function Row({ title, help, children }: { title: ReactNode; help?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-zinc-100 py-3 first-of-type:border-t-0 first-of-type:pt-0 last:pb-0 dark:border-zinc-800">
      <div className="min-w-0 flex-1 basis-56">
        <div className="font-semibold">{title}</div>
        {help && <p className="m-0 mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{help}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

/** 작은 켜기/끄기 스위치(글자 없이) */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" role="switch" aria-label={label} className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative block h-6 w-10 rounded-full bg-zinc-300 transition-colors peer-checked:bg-ok peer-focus-visible:outline-2 peer-focus-visible:outline-brand dark:bg-zinc-700 after:absolute after:top-[3px] after:left-[3px] after:size-[18px] after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4" />
    </label>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border border-b-2 border-zinc-300 bg-white px-1.5 py-0.5 font-sans text-xs font-semibold text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200">{children}</kbd>;
}
