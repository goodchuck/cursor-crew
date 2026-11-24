// 스킨 카드(움직이는 미리보기 포함)
import { useEffect, useRef } from "react";
import { SKINS, SKIN_IDS } from "@src/shared/skins";
import { CUSTOM_IMAGES, type SkinId } from "@src/shared/settings";
import type { T } from "@src/shared/i18n";

function Preview({ id, color, image, pixelated }: { id: SkinId; color: string; image: string | null; pixelated: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const holder = ref.current!;
    const body = SKINS[id].create(color, 40, { image, pixelated });
    holder.replaceChildren(body.el);
    // 첫 프레임은 바로 그린다(창이 가려져 rAF 가 늦게 돌아도 빈칸으로 보이지 않게)
    body.update({ t: performance.now() / 1000, dt: 0, vx: 0, vy: 0, speed: 0, hover: false });
    // 2초 걷기(통통) ↔ 2초 쉬기
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      const t = now / 1000;
      const moving = t % 4 < 2;
      body.update({ t, dt, vx: moving ? 90 : 0, vy: 0, speed: moving ? 90 : 0, hover: false });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [id, color, image, pixelated]);
  return (
    <div className="relative h-16 w-full">
      <div ref={ref} className="absolute top-[58px] left-1/2" />
    </div>
  );
}

export function SkinPicker({ value, onChange, color, image, pixelated, t }: { value: SkinId; onChange: (id: SkinId) => void; color: string; image: string | null; pixelated: boolean; t: T }) {
  return (
    <div role="radiogroup" aria-label={t("opt.look")} className={`mb-3 grid gap-2 ${CUSTOM_IMAGES ? "grid-cols-3" : "grid-cols-2"}`}>
      {/* 내 이미지 스킨은 CUSTOM_IMAGES 가 꺼져 있으면 숨긴다 */}
      {SKIN_IDS.filter((id) => CUSTOM_IMAGES || !SKINS[id].needsImage).map((id) => {
        const skin = SKINS[id];
        const on = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(id)}
            className={`flex min-w-0 cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 px-1.5 pt-2.5 pb-2 text-center text-[13px] ${
              on ? "border-brand bg-sky-50 dark:bg-sky-950/40" : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/60 dark:hover:border-zinc-600"
            }`}
          >
            <Preview id={id} color={color} image={image} pixelated={pixelated} />
            <span>
              {t(skin.label)}
              {skin.needsImage && !image ? ` ${t("opt.imageNeeded")}` : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}
