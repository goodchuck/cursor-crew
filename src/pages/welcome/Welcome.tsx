// 처음 설치하면 뜨는 30초 사용법. 이 페이지에도 진짜 펫이 떠서(콘텐츠 스크립트와 같은 코드) 직접 해 보며 하나씩 체크된다.
import { useEffect, useState } from "react";
import { codeLabel, menuKeyLabel } from "@src/shared/platform";
import { taskName } from "@src/pages/content/actions";
import { useDocumentLang, useSettings, useT, useThemeClass } from "@src/pages/options/hooks";
import { Kbd } from "@src/pages/options/components/ui";
import { PetAvatar } from "@src/pages/options/components/PetAvatar";

type Step = "arm" | "run" | "memo";

export default function Welcome() {
  const { settings: s } = useSettings();
  const t = useT(s);
  useThemeClass(s);
  useDocumentLang(s, t);
  const [done, setDone] = useState<Record<Step | "line", boolean>>({ arm: false, run: false, memo: false, line: false });
  const [runs, setRuns] = useState(0);

  // 펫(Crew)이 이 페이지에서만 알려 주는 신호
  useEffect(() => {
    document.documentElement.dataset.crewWelcome = "1";
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ type: string; action?: string }>).detail;
      if (d.type === "arm") setDone((x) => ({ ...x, arm: true }));
      if (d.type === "formation") setDone((x) => ({ ...x, line: true }));
      if (d.type === "run") {
        setRuns((n) => n + 1);
        setDone((x) => ({ ...x, arm: true, run: x.run || d.action !== "memo", memo: x.memo || d.action === "memo" }));
      }
    };
    addEventListener("cursor-crew", on);
    return () => removeEventListener("cursor-crew", on);
  }, []);

  if (!s) return null;
  const key = menuKeyLabel(s.menuKey).replace(/^[⌥⌃⇧]+ /, "");
  const memoAt = s.crew.findIndex((m) => m.action === "memo" || m.more?.some((x) => x.action === "memo"));
  // 메모 펫이 없으면 세 번째 단계는 "아무 펫이나 클릭"(두 번째 실행이면 완료)
  const third = memoAt >= 0 ? done.memo : runs >= 2;
  const steps: { id: Step; ok: boolean; title: string; desc: string; extra?: React.ReactNode }[] = [
    { id: "arm", ok: done.arm, title: t("wel.s1", { key }), desc: t("wel.s1d") },
    {
      id: "run",
      ok: done.run,
      title: t(s.numberKeys ? "wel.s2" : "wel.s2Click", { key }),
      desc: t("wel.s2d", { name: s.crew[0] ? taskName(s.crew[0], t) : "" }),
      extra: (
        <p className="m-0 mt-2.5 flex items-center gap-2 text-[13px] text-zinc-500 dark:text-zinc-400">
          {t("wel.practice")}
          <span className="rounded-md bg-amber-100 px-2 py-1 text-base font-bold text-amber-900 selection:bg-sky-300 dark:bg-amber-900/50 dark:text-amber-100">{t("wel.word")}</span>
        </p>
      ),
    },
    memoAt >= 0
      ? { id: "memo", ok: third, title: t(s.numberKeys ? "wel.s3" : "wel.s3Click", { key, n: memoAt + 1 }), desc: t("wel.s3d") }
      : { id: "memo", ok: third, title: t("wel.s3Any", { key }), desc: t("wel.s3AnyD") },
  ];
  const count = steps.filter((x) => x.ok).length;
  const all = count === steps.length;
  const next = steps.find((x) => !x.ok)?.id;

  return (
    <main className="mx-auto max-w-[680px] px-5 pt-12 pb-24">
      <header className="mb-8 text-center">
        <div className="mb-4 flex justify-center gap-2">
          {s.crew.map((m, i) => (
            <PetAvatar key={i} skin={s.skin} color={m.color} size={40} />
          ))}
        </div>
        <h1 className="m-0 text-3xl font-extrabold tracking-tight">{t("wel.title", { n: s.crew.length })}</h1>
        <p className="mx-auto mt-3 mb-0 max-w-md text-[15px] leading-relaxed text-zinc-500 dark:text-zinc-400">{t("wel.sub")}</p>
      </header>

      {!s.enabled && <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-center text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900">{t("wel.off")}</p>}

      <div className="mb-3 flex items-center gap-3 text-[13px] text-zinc-500 dark:text-zinc-400">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div className="h-full rounded-full bg-ok transition-all duration-500" style={{ width: `${(count / steps.length) * 100}%` }} />
        </div>
        <span aria-live="polite" className="tabular-nums">
          {t("wel.progress", { done: count, total: steps.length })} · {t("wel.time")}
        </span>
      </div>

      <ol className="m-0 grid list-none gap-3 p-0">
        {steps.map((st, i) => (
          <li
            key={st.id}
            data-step={st.id}
            data-ok={st.ok ? "1" : "0"}
            className={`flex gap-4 rounded-2xl p-5 ring-1 transition-colors ${
              st.ok
                ? "bg-emerald-50 ring-emerald-200 dark:bg-emerald-950/30 dark:ring-emerald-900"
                : st.id === next
                  ? "bg-white shadow-md ring-sky-300 dark:bg-zinc-900 dark:ring-sky-700"
                  : "bg-white ring-black/5 dark:bg-zinc-900 dark:ring-white/10"
            }`}
          >
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${st.ok ? "bg-ok text-white" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300"}`}>{st.ok ? "✓" : i + 1}</span>
            <div className="min-w-0">
              <h2 className="m-0 text-base font-bold">{withKbd(st.title, key)}</h2>
              <p className="m-0 mt-1 text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">{st.desc}</p>
              {st.extra}
            </div>
          </li>
        ))}
      </ol>

      {s.lineKey && (
        <p className={`mt-3 text-center text-[13px] ${done.line ? "text-ok" : "text-zinc-400"}`}>
          {done.line ? "✓ " : ""}
          {withKbd(t("wel.bonus", { key, line: codeLabel(s.lineKey) }), key)}
        </p>
      )}

      {all && (
        <section className="mt-8 rounded-2xl bg-gradient-to-br from-sky-50 to-white p-6 text-center ring-1 ring-sky-100 dark:from-sky-950/50 dark:to-zinc-900 dark:ring-sky-900/50">
          <p className="m-0 text-xl font-bold">{t("wel.done")}</p>
          <p className="m-0 mt-2 text-[13px] text-zinc-500 dark:text-zinc-400">{t("wel.pin")}</p>
        </section>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          className="cursor-pointer rounded-xl bg-brand px-5 py-2.5 font-semibold text-white hover:opacity-90"
          onClick={() => void chrome.runtime.sendMessage({ type: "crew:options" })}
        >
          {t("wel.settings")}
        </button>
        <button type="button" className="cursor-pointer rounded-xl bg-zinc-200 px-5 py-2.5 font-semibold hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700" onClick={() => window.close()}>
          {t("wel.close")}
        </button>
      </div>
      <p className="mt-6 text-center text-xs text-zinc-400">{t("wel.noMouse")}</p>
    </main>
  );
}

/** 문장 속 키 이름(Alt, Alt+1 …)을 키 모양으로 */
function withKbd(text: string, key: string): React.ReactNode {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${esc}(?:\\+(?:Space|\\S))?)`));
  return parts.map((p, i) => (i % 2 ? <Kbd key={i}>{p}</Kbd> : p));
}
