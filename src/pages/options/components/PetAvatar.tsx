// 펫 카드 머리의 작은 펫 그림(지금 고른 모양 · 펫 색). 첫 프레임만 그린다
import { useEffect, useRef } from "react";
import { getSkin } from "@src/shared/skins";
import type { SkinId } from "@src/shared/settings";

export function PetAvatar({ skin, color, size = 26 }: { skin: SkinId; color: string; size?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const s = getSkin(skin).needsImage ? getSkin("slime") : getSkin(skin);
    const body = s.create(color, size, { image: null, pixelated: false });
    body.update({ t: 0, dt: 0, vx: 0, vy: 0, speed: 0, hover: false });
    ref.current!.replaceChildren(body.el);
  }, [skin, color, size]);
  // 슬라임은 발밑이 기준점, 커서는 화살표 끝이 기준점이라 놓는 자리가 다르다
  const cursor = skin === "cursor";
  return (
    <div className="relative shrink-0" style={{ width: size + 6, height: size + 6 }} aria-hidden>
      <div ref={ref} className="absolute" style={cursor ? { left: size * 0.35, top: size * 0.12 } : { left: "50%", top: size + 2 }} />
    </div>
  );
}
