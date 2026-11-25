// 정렬 바꾸는 키 고르기: 버튼을 누르고 키를 한 번 치면 그 키로(Esc 는 취소, ✕ 는 안 씀)
import { useEffect, useState } from "react";
import type { T } from "@src/shared/i18n";
import { codeLabel, isUsableToggleCode } from "@src/shared/platform";
import { btnCls } from "./ui";

export function KeyRecorder({ value, onChange, prefix, t }: { value: string; onChange: (code: string) => void; prefix: string; t: T }) {
  const [listening, setListening] = useState(false);
  const [bad, setBad] = useState(false);
  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === "Escape") return setListening(false);
      if (/^(Alt|Control|Shift|Meta|OS)/.test(e.code)) return; // 조합키만 누른 건 다음 키를 기다린다
      // 1~9 는 펫 실행 키라 못 쓴다
      if (!isUsableToggleCode(e.code) || /^Digit[1-9]$/.test(e.code)) return setBad(true);
      setBad(false);
      setListening(false);
      onChange(e.code);
    };
    addEventListener("keydown", onKey, true);
    return () => removeEventListener("keydown", onKey, true);
  }, [listening, onChange]);
  return (
    <span className="flex items-center gap-1.5">
      <button
        type="button"
        className={`${btnCls} font-mono ${listening ? "ring-2 ring-brand" : ""}`}
        onClick={() => {
          setBad(false);
          setListening((v) => !v);
        }}
      >
        {listening ? t("opt.lineKeyPress") : value ? `${prefix} + ${codeLabel(value)}` : t("opt.lineKeyOff")}
      </button>
      {value && !listening && (
        <button type="button" className="cursor-pointer rounded-md px-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100" aria-label={t("opt.lineKeyOff")} title={t("opt.lineKeyOff")} onClick={() => onChange("")}>
          ✕
        </button>
      )}
      {bad && <span className="text-xs text-danger">{t("opt.lineKeyBad")}</span>}
    </span>
  );
}
