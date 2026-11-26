/*
 * 겉모습(스킨). 기능·따라다니기 로직(content/crew.ts)과 분리되어 있어서 스킨만 갈아 끼울 수 있다.
 *   create(color, size, opts) → { el, update(state) }
 *   - el: 펫 몸통 요소. 기준점(펫 위치)은 "발밑 가운데"(커서 스킨은 화살표 끝)
 *   - update(state): 매 프레임 호출
 * 새 스킨은 SKINS 에 넣고 i18n 사전에 skin.<id> 이름을 더하면 설정 창 목록에 자동으로 나타난다.
 */
import type { MsgKey } from "./i18n";
import type { SkinId } from "./settings";

export interface SkinState {
  t: number;
  dt: number;
  vx: number;
  vy: number;
  speed: number;
  hover: boolean;
  /** 오래 가만히 있어서 조는 중(눈 감고 천천히 숨쉬기) */
  sleep?: boolean;
  /** 폴짝 뛰는 중이면 0~1 진행도(높이는 crew 가 올려 준다), 아니면 0 */
  hop?: number;
}
export interface SkinBody {
  el: HTMLElement | SVGElement;
  update(st: SkinState): void;
}
export interface SkinOpts {
  image?: string | null;
  pixelated?: boolean;
}
export interface Skin {
  label: MsgKey;
  needsImage?: boolean;
  create(color: string, size: number, opts?: SkinOpts): SkinBody;
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(String(hex).replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** f > 0: 흰색 쪽으로, f < 0: 검은색 쪽으로 */
export function shade(hex: string, f: number): string {
  const t = f < 0 ? 0 : 255;
  const p = Math.abs(f);
  const [r, g, b] = rgb(hex).map((v) => Math.round(v + (t - v) * p));
  return `rgb(${r},${g},${b})`;
}

// ------------------------------------------------------------ 픽셀 슬라임(코드로 그림)
// 16×16 격자에 반타원 돔을 찍고, 외곽선·하이라이트·눈·볼을 얹는다.
const N = 16;
type Shape = "rest" | "squash" | "stretch";
const SHAPES: Record<Shape, { rx: number; ry: number }> = {
  rest: { rx: 6.6, ry: 11 },
  squash: { rx: 7.5, ry: 9.2 },
  stretch: { rx: 5.6, ry: 13.5 },
};

export function slimeGrid(shape: Shape, look: number, blink: boolean): string[][] {
  const { rx, ry } = SHAPES[shape];
  const cx = 8;
  const base = 15; // 바닥 줄
  const inside = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= N || y > base) return false;
    const dx = (x + 0.5 - cx) / rx;
    const dy = (y + 0.5 - (base + 1)) / ry;
    return dx * dx + dy * dy <= 1;
  };
  const g: string[][] = [];
  let top = N;
  for (let y = 0; y < N; y++) {
    g.push([]);
    for (let x = 0; x < N; x++) {
      if (!inside(x, y)) {
        g[y].push(".");
        continue;
      }
      top = Math.min(top, y);
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      g[y].push(edge ? "o" : y === base - 1 ? "d" : "c");
    }
  }
  const set = (x: number, y: number, ch: string) => {
    if (g[y] && g[y][x] && g[y][x] !== "." && g[y][x] !== "o") g[y][x] = ch;
  };
  // 하이라이트(왼쪽 위)
  const hx = Math.round(cx - rx * 0.5);
  set(hx, top + 2, "l");
  set(hx + 1, top + 2, "l");
  set(hx, top + 3, "l");
  // 눈과 볼
  const ey = Math.round(base + 1 - ry * 0.48);
  for (const ex of [Math.round(cx - 2.5 + look), Math.round(cx + 1.5 + look)]) {
    if (blink) set(ex, ey + 1, "k");
    else {
      set(ex, ey, "k");
      set(ex, ey + 1, "k");
    }
  }
  set(Math.round(cx - 4 + look), ey + 2, "p");
  set(Math.round(cx + 3 + look), ey + 2, "p");
  return g;
}

const urlCache = new Map<string, string>();
function gridURL(key: string, grid: string[][], pal: Record<string, string>): string {
  const hit = urlCache.get(key);
  if (hit) return hit;
  const cv = document.createElement("canvas");
  cv.width = cv.height = N;
  const cx = cv.getContext("2d")!;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const ch = grid[y][x];
      if (ch === ".") continue;
      cx.fillStyle = pal[ch];
      cx.fillRect(x, y, 1, 1);
    }
  const url = cv.toDataURL("image/png");
  urlCache.set(key, url);
  return url;
}

function slimeFrame(color: string, shape: Shape, look: number, blink: boolean): string {
  const key = `slime|${color}|${shape}|${look}|${blink ? 1 : 0}`;
  const pal = { o: shade(color, -0.62), c: color, d: shade(color, -0.18), l: shade(color, 0.7), k: "#1d1b24", p: "#ff9db5" };
  return urlCache.get(key) ?? gridURL(key, slimeGrid(shape, look, blink), pal);
}

function pixelImg(size: number): HTMLImageElement {
  const img = document.createElement("img");
  img.alt = "";
  img.draggable = false;
  img.style.cssText = `position:absolute;left:${-size / 2}px;top:${-size}px;width:${size}px;height:${size}px;max-width:none;max-height:none;image-rendering:pixelated;transform-origin:50% 100%;user-select:none`;
  return img;
}

const slime: Skin = {
  label: "skin.slime",
  create(color, size) {
    const img = pixelImg(size);
    let phase = Math.random() * 4;
    let look = 0;
    let blinkUntil = 0;
    let nextBlink = 1 + Math.random() * 3;
    let last = "";
    return {
      el: img,
      update(st) {
        const moving = st.speed > 35 || st.hover;
        if (Math.abs(st.vx) > 60) look = st.vx > 0 ? 1 : -1;
        else if (st.speed < 10) look = 0;
        if (st.t > nextBlink) {
          blinkUntil = st.t + 0.13;
          nextBlink = st.t + 2 + Math.random() * 3;
        }
        let shape: Shape;
        let lift = 0;
        if (st.hop) {
          // 폴짝: 웅크림 → 늘어나며 뜀 → 착지하며 눌림(높이는 crew 가 올려 줌)
          shape = st.hop < 0.15 ? "squash" : st.hop < 0.8 ? "stretch" : "squash";
        } else if (st.sleep) {
          // 졸기: 아주 천천히 숨쉬기
          phase += st.dt * 0.6;
          shape = Math.floor(phase) % 2 ? "squash" : "rest";
          look = 0;
        } else if (moving) {
          // 통통: 눌림 → 늘어나며 뜀 → 공중 → 착지
          phase += st.dt * (st.hover ? 5 : 8);
          const f = Math.floor(phase) % 4;
          shape = (["squash", "stretch", "rest", "rest"] as const)[f];
          lift = [0, 0.22, 0.14, 0][f];
        } else {
          // 숨쉬기
          phase += st.dt * 1.5;
          shape = Math.floor(phase) % 2 ? "squash" : "rest";
        }
        const blink = !!st.sleep || st.t < blinkUntil;
        const key = shape + look + blink;
        if (key !== last) {
          img.src = slimeFrame(color, shape, look, blink);
          last = key;
        }
        img.style.transform = `translateY(${(-lift * size).toFixed(1)}px)`;
      },
    };
  },
};

// ------------------------------------------------------------ 커서(멀티플레이어 화살표)
const ARROW = "M1 1L1 17L5.4 13.1L8.5 20.2L11.4 19L8.4 12H14.2Z";
const cursor: Skin = {
  label: "skin.cursor",
  create(color, size) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 18 22");
    const w = Math.round(size * 0.5);
    svg.style.cssText = `position:absolute;left:-1px;top:-1px;width:${w}px;height:${Math.round(w * 1.22)}px;overflow:visible;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.28))`;
    const path = document.createElementNS(NS, "path");
    for (const [k, v] of Object.entries({ d: ARROW, fill: color, stroke: "#fff", "stroke-width": "1.4", "stroke-linejoin": "round" })) path.setAttribute(k, v);
    svg.appendChild(path);
    return { el: svg, update() {} };
  },
};

// ------------------------------------------------------------ 내 이미지·GIF(설정 창에서 올린 그림)
const image: Skin = {
  label: "skin.image",
  needsImage: true,
  create(color, size, opts) {
    const img = pixelImg(size);
    img.style.objectFit = "contain"; // 크기 상자 안에 비율 유지
    img.style.objectPosition = "50% 100%"; // 발밑을 기준점에 맞춤
    img.style.imageRendering = opts?.pixelated ? "pixelated" : "auto";
    img.src = opts?.image || slimeFrame(color, "rest", 0, false);
    let phase = 0;
    let tilt = 0;
    return {
      el: img,
      update(st) {
        const moving = st.speed > 35 || st.hover;
        phase += st.dt * (moving ? 9 : 2);
        tilt += (Math.max(-14, Math.min(14, st.vx / 30)) - tilt) * Math.min(1, st.dt * 10);
        const bob = moving ? Math.abs(Math.sin(phase)) * size * 0.15 : Math.sin(phase) * size * 0.02;
        img.style.transform = `translateY(${(-bob).toFixed(1)}px) rotate(${tilt.toFixed(1)}deg)`;
      },
    };
  },
};

export const SKINS: Record<SkinId, Skin> = { slime, cursor, image };
export const SKIN_IDS = Object.keys(SKINS) as SkinId[];
export const getSkin = (id: string | undefined): Skin => SKINS[id as SkinId] || SKINS.slime;
