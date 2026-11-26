// 설정·메모 백업 파일 내보내기/가져오기(버전이 적혀 있어서 예전 파일도 지금 모양으로 올려 읽는다)
import { useRef, useState } from "react";
import type { MsgKey, T } from "@src/shared/i18n";
import { exportBackup, importBackup } from "@src/shared/migrate";
import { btnCls } from "./ui";

export function BackupButtons({ t }: { t: T }) {
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ key: MsgKey; n?: number; err?: boolean } | null>(null);

  const onExport = async () => {
    const data = await exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cursor-crew-backup-${data.exportedAt.slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMsg({ key: "opt.exported" });
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (!confirm(t("opt.importConfirm"))) return;
    const r = await importBackup(await f.text());
    if (r.ok) setMsg({ key: "opt.imported", n: r.memos });
    else setMsg({ key: r.reason === "newer" ? "opt.importNewer" : "opt.importBad", err: true });
    // 설정 창 화면도 새 값으로
    if (r.ok) setTimeout(() => location.reload(), 900);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={btnCls} onClick={() => void onExport()}>
        {t("opt.export")}
      </button>
      <button type="button" className={btnCls} onClick={() => file.current?.click()}>
        {t("opt.import")}
      </button>
      <input
        ref={file}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {msg && (
        <span aria-live="polite" className={`text-[13px] ${msg.err ? "text-danger" : "text-ok"}`}>
          {t(msg.key, { n: msg.n ?? 0 })}
        </span>
      )}
    </div>
  );
}
