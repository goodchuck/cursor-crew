/*
 * Crew: 펫들이 마우스를 따라다닌다. 펫 한 마리 = 기능 하나(설정 창의 '펫과 기능' 목록 순서).
 *
 * 평소에는 펫이 클릭을 전혀 가로채지 않는다(pointer-events: none). 펫 위를 눌러도 아래 페이지가 눌린다.
 * 메뉴 키(기본 Alt, 설정에서 Ctrl·Shift·Alt+Shift)를 누르고 있는 동안만:
 *   - 펫들이 커서 둘레(기본 위쪽 부채꼴)의 정해진 자리로 모여 서로 겹치지 않게 서고, 펫마다 기능 이름표가 뜬다.
 *   - 펫을 클릭하면 그 펫의 기능이 바로 실행된다.
 * 키를 떼면 아무것도 실행하지 않고 원래대로 돌아간다(keyup 에서는 어떤 기능도 실행하지 않는다).
 * 메뉴 키를 누른 채 다른 키를 치면(단축키) 즉시 해제한다.
 *
 * 겉모습은 shared/skins.ts, 기능은 actions.ts, 글자는 shared/i18n.ts 가 맡는다.
 */
import { MAX_CREW, HINT_SEEN_KEY, DEFAULTS, MENU_KEY_SPEC, memoKey, type Formation, type MenuItem, type MenuKey, type Settings, type Memo, type Task } from "@src/shared/settings";
import type { Lang, T } from "@src/shared/i18n";
import { IS_MAC, menuKeyLabel } from "@src/shared/platform";
import { getSkin, type Skin, type SkinBody } from "@src/shared/skins";
import { ACTIONS, itemHint, selectedText, taskName, type ActionHost, type Mods, type Point, type RunCtx } from "./actions";
import { CSS } from "./styles";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const isEditable = (el: Element | null) => !!el && ((el as HTMLElement).isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

// innerHTML 대신 DOM API 로 만든다(Trusted Types 를 강제하는 사이트에서도 안전하게)
type Kid = Node | string | null | undefined | false;
function h<K extends keyof HTMLElementTagNameMap>(tag: K, props?: Record<string, string>, ...kids: Kid[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const k in props || {}) {
    if (k === "class") el.className = props![k];
    else if (k === "text") el.textContent = props![k];
    else el.setAttribute(k, props![k]);
  }
  for (const c of kids) if (c) el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  return el;
}

interface Pet {
  item: MenuItem;
  el: HTMLDivElement;
  body: SkinBody;
  hit: HTMLDivElement;
  color: string;
  i: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  k: number;
  held?: boolean;
  /** 메뉴 키를 누르고 있는 동안 설 자리(커서 둘레) */
  slot?: Point;
}

type Side = "up" | "down" | "left" | "right";
const SIDES: Side[] = ["up", "down", "left", "right"];

export interface CrewOptions {
  cfg: Settings;
  mouse: Point | null;
  images: (string | null)[] | null;
  t: T;
  lang: Lang;
  dark: boolean;
}

/** 펫 옆에 뜨는 창: 메모장 · 기능 메뉴 · 검색어 입력. 한 번에 하나만 */
interface Panel {
  kind: "memo" | "menu" | "ask";
  el: HTMLDivElement;
  /** 닫을 때 할 일(메모 저장, 입력 취소) */
  flush: () => void;
  /** 메뉴: 페이지에서 친 키(숫자·Esc)를 받아 처리했으면 true */
  onKey?: (e: KeyboardEvent) => boolean;
}

export class Crew implements ActionHost {
  readonly t: T;
  readonly lang: Lang;
  mouse: Point | null;
  private cfg: Settings;
  private size: number;
  private key: MenuKey;
  private armed = false; // 메뉴 키를 누르고 있는 중
  private formation: Formation;
  private mv = { x: 0, y: 0 }; // 마우스 속도(px/s, 부드럽게)
  private lastMove = performance.now();
  private lastEv = 0;
  private visible: boolean;
  private panel: Panel | null = null;
  private hint: { el: HTMLDivElement; until: number } | null = null;
  private hasMemo = false;
  private hot: Pet | null = null;
  private host: HTMLDivElement;
  private root: HTMLDivElement;
  private pets: Pet[] = [];
  private raf = 0;
  private last = 0;
  private dead = false;
  private off: (() => void)[] = [];

  constructor({ cfg, mouse, images, t, lang, dark }: CrewOptions) {
    this.cfg = cfg;
    this.t = t;
    this.lang = lang;
    this.size = clamp(+cfg.size || 36, 20, 72);
    this.key = MENU_KEY_SPEC[cfg.menuKey] ? cfg.menuKey : DEFAULTS.menuKey;
    this.formation = cfg.formation === "line" ? "line" : "free";
    this.mouse = mouse;
    this.visible = !!mouse;

    this.host = document.createElement("div");
    this.host.setAttribute("data-cursor-crew", "");
    this.host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;display:block";
    const sh = this.host.attachShadow({ mode: "open" });
    this.root = h("div", { class: "root" });
    this.root.style.setProperty("--op", String(clamp(+cfg.opacity || 0.9, 0.15, 1)));
    sh.append(h("style", { text: CSS }), this.root);
    if (!this.visible) this.root.classList.add("hide");
    this.setDark(dark);

    let skin: Skin = getSkin(cfg.skin);
    if (skin.needsImage && !images?.some(Boolean)) skin = getSkin("slime");
    // 펫마다 자기 이미지, 비어 있으면 첫 번째로 올린 이미지를 같이 쓴다
    const imageFor = (i: number) => (images ? images[i] || images.find(Boolean) || null : null);
    cfg.crew.slice(0, MAX_CREW).forEach((item, i) => this.pets.push(this.makePet(skin, item, i, imageFor(i))));
    document.documentElement.appendChild(this.host);
    void this.refreshMemo();

    // 페이지 이벤트
    const listen = <E extends Event>(target: EventTarget, type: string, fn: (e: E) => void, opts?: AddEventListenerOptions) => {
      target.addEventListener(type, fn as EventListener, opts);
      this.off.push(() => target.removeEventListener(type, fn as EventListener, opts));
    };
    listen<MouseEvent>(window, "mousemove", (e) => this.onMove(e), { passive: true, capture: true });
    listen<PointerEvent>(window, "pointerdown", (e) => this.onPageDown(e), { capture: true });
    listen<KeyboardEvent>(window, "keydown", (e) => this.onKeyDown(e), { capture: true });
    listen<KeyboardEvent>(window, "keyup", (e) => this.onKeyUp(e), { capture: true });
    listen(window, "blur", () => {
      this.disarm();
      this.hide();
    });
    listen<MouseEvent>(document, "mouseout", (e) => {
      if (!e.relatedTarget) this.hide();
    });
    listen(document, "fullscreenchange", () => this.root.classList.toggle("hide", !!document.fullscreenElement || !this.visible));

    this.wake();
  }

  setDark(dark: boolean) {
    this.root.classList.toggle("dark", dark);
  }

  private makePet(skin: Skin, item: MenuItem, i: number, image: string | null): Pet {
    const s = this.size;
    const t = this.t;
    const color = item.color || DEFAULTS.crew[0].color;
    const body = skin.create(color, s, { image, pixelated: !!this.cfg.imagePixelated });
    const hit = h("div", { class: "hit", title: itemHint(item, t) });
    Object.assign(hit.style, { left: -s * 0.55 + "px", top: -s * 1.05 + "px", width: s * 1.1 + "px", height: s * 1.1 + "px" });
    const spark = h("div", { class: "spark", text: "✦" });
    Object.assign(spark.style, { left: s * 0.3 + "px", top: -s * 1.15 + "px" });
    // 이름표: 메뉴 키를 누르고 있을 때만 보인다. 이웃 펫과 겹치지 않게 위·아래로 번갈아 둔다
    // 동그라미 안 숫자 = 키를 누른 채 칠 숫자. 기능이 여러 개면 이름 뒤에 ▾
    const dot = h("span", { class: "ldot", text: String(i + 1) });
    dot.style.background = color;
    const label = h("div", { class: "label " + (i % 2 ? "below" : "above") }, dot, h("span", { text: taskName(item, t) + (item.more?.length ? " ▾" : "") }));
    label.style.setProperty("--s", s + "px");
    const el = h("div", { class: "pet" }, body.el as Node, hit, spark, label);
    el.style.setProperty("--glow", color);
    el.style.setProperty("--sp", Math.round(s * 0.36) + "px");
    const pet: Pet = { item, el, body, hit, color, i, x: 0, y: 0, vx: 0, vy: 0, k: i ? 60 : 85 };
    if (this.mouse) Object.assign(pet, this.restSpot(i, this.mouse));
    hit.addEventListener("pointerenter", () => {
      this.hot = pet;
      el.classList.add("hot");
    });
    hit.addEventListener("pointerleave", () => {
      if (this.hot === pet) this.hot = null;
      el.classList.remove("hot");
    });
    // 여기까지 오는 건 메뉴 키를 누르고 있을 때뿐(.armed). Alt+클릭(다운로드)·Ctrl+클릭(새 탭) 같은 기본 동작은 막는다
    const swallow = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    hit.addEventListener("pointerdown", swallow);
    hit.addEventListener("mousedown", swallow);
    hit.addEventListener("auxclick", swallow);
    hit.addEventListener("click", (e) => {
      swallow(e);
      if (!this.armed) return;
      this.run(pet, this.modsOf(e));
    });
    // 맥에서 Control+클릭은 오른쪽 클릭이라 click 이 오지 않는다. 메뉴 키가 Control 이면 여기서 실행
    hit.addEventListener("contextmenu", (e) => {
      swallow(e);
      if (this.armed && IS_MAC && e.ctrlKey && this.spec.ctrl) this.run(pet, this.modsOf(e));
    });
    this.root.appendChild(el);
    return pet;
  }

  // ------------------------------------------------------------ 자리
  /** 멈춰 있을 때: 마우스 오른쪽 아래(화살표를 가리지 않게) 나란히. 화면 끝이면 반대쪽. */
  private restSpot(i: number, p: Point): Point {
    const s = this.size;
    const vw = document.documentElement.clientWidth;
    const n = this.pets.length || 1;
    const fx = p.x > vw - (n * (s + 6) + 50) ? -1 : 1;
    const fy = p.y > innerHeight - s - 30 ? -1 : 1;
    return { x: p.x + fx * (s * 0.6 + 16 + i * (s + 6)), y: fy > 0 ? p.y + s + 8 : p.y - 10 };
  }

  /**
   * 메뉴 키를 누른 순간의 커서를 중심으로 펫들을 부채꼴로 벌려 세운다.
   * 기본은 커서 위쪽(왼쪽 위 · 위 · 오른쪽 위), 화면 위쪽 끝이면 아래쪽으로 뒤집는다.
   * 이름표는 바깥쪽(왼쪽 펫은 왼쪽, 가운데는 위/아래)에 붙여 서로 겹치지 않게 한다.
   */
  private spreadAround(at: Point) {
    const s = this.size;
    const n = Math.min(this.pets.length, 3);
    const vw = document.documentElement.clientWidth;
    const R = s * 1.25 + 22; // 커서에서 펫 가운데까지
    const LABEL_W = 156; // 이름표 최대 폭 + 여백
    const HALF = 78; // 위/아래 이름표 폭의 절반
    // 기본: 위쪽 부채꼴(왼쪽 위 · 위 · 오른쪽 위). 왼쪽/오른쪽 끝이면 반대쪽으로 벌어지는 4분의 1 부채꼴
    const WIDE: Record<number, number[]> = { 1: [-90], 2: [-130, -50], 3: [-150, -90, -30] };
    const TOWARD_RIGHT: Record<number, number[]> = { 1: [-60], 2: [-80, -20], 3: [-90, -45, 0] };
    const side = R * 0.87 + s * 0.6 + 8;
    // 중심을 화면 안쪽으로 당겨 둔다: 끝에 있는 펫이 화면에 맞춰 밀리면서 이웃 펫과 겹치지 않게
    at = { x: clamp(at.x, s * 0.6 + 4, vw - s * 0.6 - 4), y: clamp(at.y, s * 0.5 + 4, innerHeight - s * 0.5 - 4) };
    let angles = WIDE[n] || [];
    if (at.x < side) angles = TOWARD_RIGHT[n];
    else if (at.x > vw - side) angles = TOWARD_RIGHT[n].map((a) => -180 - a).reverse();
    const flip = at.y - R - s / 2 - 34 < 0; // 위쪽에 자리가 없으면 아래로
    if (flip) angles = angles.map((a) => -a);
    this.pets.forEach((pet, i) => {
      const rad = ((angles[i] ?? -90) * Math.PI) / 180;
      const cx = clamp(at.x + Math.cos(rad) * R, s * 0.6 + 4, vw - s * 0.6 - 4);
      const cy = clamp(at.y + Math.sin(rad) * R, s * 0.5 + 4, innerHeight - s * 0.5 - 4);
      pet.slot = { x: cx, y: cy + s / 2 }; // pet.x·y 는 발밑 기준
      const c = Math.cos(rad);
      let where: Side = flip ? "down" : "up";
      if (c < -0.5 && cx - s * 0.6 - LABEL_W > 0) where = "left";
      else if (c > 0.5 && cx + s * 0.6 + LABEL_W < vw) where = "right";
      for (const k of SIDES) pet.el.classList.toggle("side-" + k, k === where);
      // 위/아래 이름표가 화면 끝에 걸리면 펫 가장자리에 맞춰 한쪽으로 붙인다
      const vertical = where === "up" || where === "down";
      pet.el.classList.toggle("al-start", vertical && cx - HALF < 0);
      pet.el.classList.toggle("al-end", vertical && cx + HALF > vw);
    });
  }

  private targetFor(pet: Pet, w: number): Point & { hold?: boolean; k?: number } {
    const s = this.size;
    const mouse = this.mouse!;
    // 메뉴 키를 누르고 있는 동안은 커서 둘레의 제 자리로 빠르게 모인다(클릭할 수 있게). 마우스를 움직여도 자리는 그대로
    // 펫 메뉴가 열려 있는 동안은 제자리에서 기다린다
    if (this.panel?.kind === "menu") return { x: pet.x, y: pet.y, hold: true };
    if (this.armed) return pet.slot ? { x: pet.slot.x, y: pet.slot.y, k: 260 } : { x: pet.x, y: pet.y, hold: true };
    // 마우스가 천천히 다가오거나 바로 위에 오면 도망가지 않고 그 자리에 멈춘다.
    // 빠르게 지나가는 건 이동으로 보고 그냥 따라간다. 충분히 멀어지면 다시 따라간다.
    const dx = pet.x - mouse.x;
    const dy = pet.y - s * 0.5 - mouse.y;
    const d = Math.hypot(dx, dy);
    const spd = Math.hypot(this.mv.x, this.mv.y);
    const toward = this.mv.x * dx + this.mv.y * dy > 0;
    // 정렬 모드: 각자 커서 옆 제자리로만 간다(앞 펫을 따라가거나 멈추지 않음)
    if (this.formation === "line") return { ...this.restSpot(pet.i, mouse), k: 140 };
    if (pet.held) {
      if (d > s * 2.3) pet.held = false;
    } else if (d < s * 0.75 || (d < s * 1.6 && toward && spd > 20 && spd < 500)) pet.held = true;
    if (pet.held) return { x: pet.x, y: pet.y, hold: true };
    const rest = this.restSpot(pet.i, mouse);
    if (w <= 0) return rest;
    // 움직일 때: 앞사람(첫 펫은 마우스)의 뒤쪽으로 처진다
    const lead = pet.i === 0 ? { x: mouse.x, y: mouse.y + s * 0.5, vx: this.mv.x, vy: this.mv.y } : this.pets[pet.i - 1];
    const L = Math.hypot(lead.vx, lead.vy) || 1;
    const back = (pet.i === 0 ? s * 0.9 + 24 : s + 4) / L;
    const behind = { x: lead.x - lead.vx * back, y: lead.y - lead.vy * back + (pet.i === 0 ? s * 0.3 : 0) };
    return { x: rest.x + (behind.x - rest.x) * w, y: rest.y + (behind.y - rest.y) * w };
  }

  // ------------------------------------------------------------ 마우스
  private onMove(e: MouseEvent) {
    const p = { x: e.clientX, y: e.clientY };
    const now = performance.now();
    if (this.mouse && this.lastEv) {
      const dt = Math.max(8, now - this.lastEv) / 1000;
      const a = Math.min(1, dt * 10);
      this.mv.x += ((p.x - this.mouse.x) / dt - this.mv.x) * a;
      this.mv.y += ((p.y - this.mouse.y) / dt - this.mv.y) * a;
    }
    this.lastEv = now;
    this.lastMove = now;
    const first = !this.mouse;
    this.mouse = p;
    if (first) for (const pet of this.pets) Object.assign(pet, this.restSpot(pet.i, p));
    this.show();
    this.root.classList.remove("dim");
    if (first) void this.maybeHint();
    this.wake();
  }

  // 펫이 아닌 곳을 누르면 페이지 기본 동작은 그대로 두고, 열린 메모장만 닫는다
  private onPageDown(e: PointerEvent) {
    if (e.composedPath().includes(this.host)) return;
    if (this.panel) this.closePanel();
  }

  // ------------------------------------------------------------ 키
  private get spec() {
    return MENU_KEY_SPEC[this.key];
  }
  /** 이 키가 메뉴 키 조합에 들어가는 조합키인지 */
  private isSpecKey(key: string) {
    const sp = this.spec;
    return (key === "Alt" && sp.alt) || (key === "Control" && sp.ctrl) || (key === "Shift" && sp.shift);
  }
  /** 지금 눌린 조합키가 메뉴 키와 정확히 같은지(다른 조합키가 더 눌려 있으면 아님) */
  private comboHeld(e: KeyboardEvent) {
    const sp = this.spec;
    return e.altKey === sp.alt && e.ctrlKey === sp.ctrl && e.shiftKey === sp.shift && !e.metaKey;
  }
  /** 펫이 화면에 보여서 키에 반응해도 되는 상태인지 */
  private get present() {
    return this.visible && !document.fullscreenElement && this.pets.length > 0;
  }

  /** 환영 페이지(연습)에서만: 키를 눌렀는지·무엇을 실행했는지 알려 준다. 일반 페이지에는 아무것도 보내지 않는다 */
  private emit(type: "arm" | "run" | "formation", detail: Record<string, unknown> = {}) {
    if (document.documentElement.dataset.crewWelcome !== "1") return;
    dispatchEvent(new CustomEvent("cursor-crew", { detail: { type, ...detail } }));
  }

  private arm() {
    this.armed = true;
    this.emit("arm");
    if (this.mouse) this.spreadAround(this.mouse);
    this.root.classList.add("armed");
    this.dismissHint();
  }
  private disarm() {
    if (!this.armed) return;
    this.armed = false;
    this.root.classList.remove("armed");
    for (const pet of this.pets) {
      pet.slot = undefined;
      pet.held = true; // 키를 떼면 그 자리에서 잠깐 쉬다가, 마우스가 멀어지면 다시 따라간다
      for (const k of SIDES) pet.el.classList.remove("side-" + k);
      pet.el.classList.remove("al-start", "al-end");
    }
    if (this.hot) {
      this.hot.el.classList.remove("hot");
      this.hot = null;
    }
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.composedPath().includes(this.host)) return; // 메모장·입력창 안에서 치는 키
    // 윈도우의 Alt+숫자 패드는 특수 문자 입력(Alt 코드, 예: Alt+0169 = ©)이라 건드리지 않는다
    const altCode = e.altKey && e.code.startsWith("Numpad");
    // 펫 메뉴가 열려 있으면 숫자·Esc 는 메뉴가 받는다(페이지로 새지 않게)
    if (!altCode && this.panel?.onKey?.(e)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // 메뉴 키를 누른 채 정렬 키(기본 `: 숫자 1 왼쪽, 한 손으로 닿게): 따라다니기 ↔ 한 줄 정렬 바꾸기(설정에 저장)
    if (this.armed && this.cfg.lineKey && e.code === this.cfg.lineKey) {
      e.preventDefault();
      e.stopPropagation();
      this.toggleFormation();
      return;
    }
    // 메뉴 키를 누른 채 1·2·3: 그 번호 펫을 바로 실행(조준 없이). 숫자 자리 키(code)로 봐서 Shift 가 섞여도 된다
    const num = /^Digit([1-9])$/.exec(e.code);
    if (this.armed && this.cfg.numberKeys && num && this.pets[+num[1] - 1]) {
      e.preventDefault();
      e.stopPropagation();
      const pet = this.pets[+num[1] - 1];
      pet.el.classList.add("hot");
      setTimeout(() => pet.el.classList.remove("hot"), 200);
      this.run(pet, {});
      return;
    }
    if (this.isSpecKey(e.key)) {
      if (!this.present) return; // 펫이 안 보이면 키에 손대지 않는다
      // 윈도우에서 Alt 만 눌렀다 뗄 때 크롬 메뉴로 포커스가 가는 것 방지
      if (e.key === "Alt") e.preventDefault();
      if (e.repeat || this.armed || !this.comboHeld(e)) return;
      const typing = isEditable(e.target as Element) || isEditable(document.activeElement);
      if (this.panel || (typing && !this.spec.alt)) return;
      this.arm();
      return;
    }
    // 메뉴 키를 누른 채 다른 키를 치면(예: Alt+←, Ctrl+C) 단축키로 보고 바로 해제
    this.disarm();
    if (e.key === "Escape" && this.panel) return this.closePanel();
    // 페이지에서 글을 쓰는 중이면 방해하지 않게 흐려진다
    if (isEditable(e.target as Element) || isEditable(document.activeElement)) this.root.classList.add("dim");
  }

  // 키를 떼면 원래대로만 돌아간다. 여기서는 어떤 기능도 실행하지 않는다.
  private onKeyUp(e: KeyboardEvent) {
    if (!this.isSpecKey(e.key)) return;
    if (e.key === "Alt" && this.present) e.preventDefault();
    this.disarm();
  }

  /** 설정 창이나 다른 탭에서 바뀌었을 때(펫을 새로 만들지 않고 모양만) */
  setFormation(f: Formation) {
    if (f === this.formation) return;
    this.formation = f;
    for (const pet of this.pets) pet.held = false;
  }

  private toggleFormation() {
    const next: Formation = this.formation === "line" ? "free" : "line";
    this.setFormation(next);
    this.emit("formation", { formation: next });
    const p = this.mouse || { x: 0, y: 0 };
    this.toast({ x: p.x, y: p.y - this.size * 2.4 }, this.t(next === "line" ? "toast.line" : "toast.free"));
    void chrome.storage.sync.set({ formation: next });
  }

  /** 클릭의 Shift·Ctrl 중 메뉴 키에 들어 있지 않은 것만 링크 여는 위치를 바꾸는 데 쓴다 */
  private modsOf(e: MouseEvent): Mods {
    const sp = this.spec;
    return { shiftKey: e.shiftKey && !sp.shift, ctrlKey: e.ctrlKey && !sp.ctrl, metaKey: e.metaKey };
  }

  /** 펫 실행: 기능이 하나면 바로, 여러 개면 메뉴를 펼친다. 선택한 글자는 누른 순간 것으로 */
  private run(pet: Pet, mods: Mods) {
    const ctx: RunCtx = { sel: selectedText() };
    if (pet.item.more?.length) return this.openMenu(pet, ctx);
    this.runTask(pet.item, mods, this.petTop(pet), ctx);
  }

  private runTask(task: Task, mods: Mods, at: Point, ctx: RunCtx) {
    const fn = ACTIONS[task.action];
    if (!fn) return;
    this.emit("run", { action: task.action });
    void fn(task, mods, this, at, ctx);
  }

  private petTop(pet: Pet): Point {
    return { x: pet.x, y: pet.y - this.size };
  }

  // ------------------------------------------------------------ 처음 안내
  async maybeHint() {
    const got = await chrome.storage.local.get(HINT_SEEN_KEY);
    if (got[HINT_SEEN_KEY] || this.dead) return;
    await chrome.storage.local.set({ [HINT_SEEN_KEY]: Date.now() });
    const t = this.t;
    const b = h("div", { class: "bubble" });
    // "{key}" 자리에 키 모양을 넣는다
    const [before, after] = t("hint.key1", { key: "\u0000" }).split("\u0000");
    b.append(before, h("kbd", { text: menuKeyLabel(this.key) }), after, h("br"), t("hint.key2"));
    this.root.appendChild(b);
    this.hint = { el: b, until: performance.now() + 9000 };
  }
  private dismissHint() {
    if (!this.hint) return;
    this.hint.el.remove();
    this.hint = null;
  }

  toast(at: Point, text: string) {
    const el = h("div", { class: "toast", text });
    el.style.left = at.x + "px";
    el.style.top = at.y - 6 + "px";
    this.root.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  // ------------------------------------------------------------ 보이기
  private show() {
    if (this.visible) return;
    this.visible = true;
    this.root.classList.toggle("hide", !!document.fullscreenElement);
  }
  private hide() {
    if (this.panel) return;
    this.visible = false;
    this.root.classList.add("hide");
    this.disarm();
  }

  // ------------------------------------------------------------ 루프
  private wake() {
    if (!this.raf && !this.dead) this.raf = requestAnimationFrame((now) => this.tick(now));
  }

  private tick(now: number) {
    this.raf = 0;
    if (this.dead || !this.mouse) return;
    const dt = Math.min(0.033, (now - (this.last || now)) / 1000);
    this.last = now;
    const still = now - this.lastMove;
    // 마우스가 멈추면 속도도 0 으로 가라앉는다
    if (still > 60) {
      const d = Math.min(1, dt * 8);
      this.mv.x -= this.mv.x * d;
      this.mv.y -= this.mv.y * d;
    }
    const w = clamp((Math.hypot(this.mv.x, this.mv.y) - 60) / 450, 0, 1);
    const s = this.size;
    const idle = still > 900 && !this.armed;
    for (const pet of this.pets) {
      const tg = this.targetFor(pet, w);
      const k = tg.hold ? 0 : (tg.k ?? pet.k);
      const c = tg.hold ? 18 : 2 * Math.sqrt(k) * (tg.k ? 1 : 0.8); // 멈출 땐 브레이크만, 자리로 모일 땐 튕기지 않게
      let ax = (tg.x - pet.x) * k - pet.vx * c;
      let ay = (tg.y - pet.y) * k - pet.vy * c;
      // 서로 겹치지 않게 밀어낸다(멈춰 있는 펫끼리도). 정렬 모드·키를 누른 동안은 자리가 따로 있어 밀지 않는다
      if (this.formation === "free" && !this.armed) for (const o of this.pets) {
        if (o === pet) continue;
        const dx = pet.x - o.x;
        const dy = pet.y - o.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < s * 0.85) {
          ax += (dx / d) * (s * 0.85 - d) * 50;
          ay += (dy / d) * (s * 0.85 - d) * 50;
        }
      }
      pet.vx += ax * dt;
      pet.vy += ay * dt;
      pet.x += pet.vx * dt;
      pet.y += pet.vy * dt;
      pet.body.update({ t: now / 1000, dt, vx: pet.vx, vy: pet.vy, speed: Math.hypot(pet.vx, pet.vy), hover: this.hot === pet });
      pet.el.classList.toggle("idle", idle);
      pet.el.style.transform = `translate(${pet.x.toFixed(1)}px,${pet.y.toFixed(1)}px)`;
    }
    if (this.hint) {
      const p = this.pets[0];
      this.hint.el.style.left = clamp(p.x, 140, document.documentElement.clientWidth - 140) + "px";
      this.hint.el.style.top = p.y - s - 10 + "px";
      if (now > this.hint.until) this.dismissHint();
    }
    // 숨쉬기·깜빡임 애니메이션 때문에 보이는 동안은 계속 돈다(펫 몇 마리라 가볍다)
    if (this.visible) this.wake();
  }

  // ------------------------------------------------------------ 메모
  /** 같은 탭에서 다른 글·영상으로 넘어갔을 때: 열린 메모장은 원래 페이지에 저장하고 닫은 뒤 표시를 새로 */
  onNavigate() {
    this.closePanel();
    void this.refreshMemo();
  }

  async refreshMemo() {
    const key = memoKey();
    const got = await chrome.storage.local.get(key);
    const memo = got[key] as Memo | undefined;
    this.hasMemo = !!memo?.text?.trim();
    // 메모 기능을 가진 펫 머리 위에 보라색 점
    for (const pet of this.pets) {
      if (pet.item.action !== "memo") continue;
      let badge = pet.el.querySelector<HTMLElement>(".badge");
      if (this.hasMemo && !badge) {
        badge = h("div", { class: "badge", title: this.t("memo.exists") });
        badge.style.left = this.size * 0.32 + "px";
        badge.style.top = -this.size * 0.95 + "px";
        pet.el.appendChild(badge);
      } else if (!this.hasMemo && badge) badge.remove();
    }
  }

  async openMemo(at: Point, item: Task) {
    if (this.panel?.kind === "memo") return this.closePanel();
    this.closePanel();
    const t = this.t;
    const key = memoKey();
    const got = await chrome.storage.local.get(key);
    const memo = got[key] as Memo | undefined;
    const ta = h("textarea", { placeholder: t("memo.placeholder") });
    const st = h("span", { class: "st", text: t("memo.autosave") });
    const close = h("button", { class: "x", title: t("memo.close"), text: "✕" });
    const all = h("button", { class: "all", text: t("memo.all") });
    const p = h(
      "div",
      { class: "panel" },
      h("div", { class: "ph" }, h("b", { text: taskName(item, t) }), h("span", { class: "where", text: location.hostname + location.pathname }), close),
      ta,
      h("div", { class: "pf" }, st, all),
    );
    p.style.setProperty("--c", (item as MenuItem).color || this.pets.find((x) => x.item.action === "memo" || x.item.more?.includes(item))?.color || DEFAULTS.crew[2].color);
    ta.value = memo?.text || "";
    const vw = document.documentElement.clientWidth;
    p.style.left = clamp(at.x - 150, 8, vw - 308) + "px";
    p.style.top = clamp(at.y - 230, 8, innerHeight - 250) + "px";
    // 메모장에서 치는 키가 페이지 단축키(예: 유튜브 k, 깃허브 s)로 새지 않게
    for (const type of ["keydown", "keyup", "keypress"])
      p.addEventListener(type, (e) => {
        if ((e as KeyboardEvent).key === "Escape") this.closePanel();
        e.stopPropagation();
      });
    p.addEventListener("pointerdown", (e) => e.stopPropagation());
    let timer = 0;
    const save = async () => {
      const text = ta.value;
      if (text.trim()) await chrome.storage.local.set({ [key]: { text, title: document.title, url: location.href, updated: Date.now() } satisfies Memo });
      else await chrome.storage.local.remove(key);
      st.textContent = t("memo.saved");
    };
    ta.addEventListener("input", () => {
      st.textContent = t("memo.saving");
      clearTimeout(timer);
      timer = window.setTimeout(save, 350);
    });
    close.addEventListener("click", () => this.closePanel());
    all.addEventListener("click", () => chrome.runtime.sendMessage({ type: "crew:options", hash: "memos" }));
    this.root.appendChild(p);
    this.root.classList.add("active");
    this.panel = { kind: "memo", el: p, flush: () => (clearTimeout(timer), void save()) };
    this.disarm();
    ta.focus();
  }

  private closePanel() {
    if (!this.panel) return;
    const pn = this.panel;
    this.panel = null;
    pn.flush();
    pn.el.remove();
    this.root.classList.remove("active");
  }

  // ------------------------------------------------------------ 펫 메뉴(기능이 여러 개인 펫)
  private openMenu(pet: Pet, ctx: RunCtx) {
    this.closePanel();
    const t = this.t;
    const tasks: Task[] = [pet.item, ...(pet.item.more || [])];
    const at = this.petTop(pet);
    const pick = (i: number, mods: Mods) => {
      const task = tasks[i];
      if (!task) return;
      this.closePanel();
      this.runTask(task, mods, at, ctx);
    };
    const rows = tasks.map((task, i) => {
      const b = h("button", { class: "mi", type: "button" }, h("kbd", { text: String(i + 1) }), h("span", { class: "mn", text: taskName(task, t) }), h("span", { class: "mh", text: itemHint(task, t) }));
      b.addEventListener("click", (e) => pick(i, this.modsOf(e)));
      return b;
    });
    const m = h("div", { class: "menu" }, ...rows, h("div", { class: "mf", text: t("menu.hint") }));
    m.style.setProperty("--c", pet.color);
    // 메뉴를 눌러도 페이지에서 고른 글자가 풀리지 않게
    m.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    m.addEventListener("mousedown", (e) => e.preventDefault());
    this.root.appendChild(m);
    // 펫 오른쪽에(자리가 없으면 왼쪽에)
    const s = this.size;
    const vw = document.documentElement.clientWidth;
    const w = m.offsetWidth;
    const hgt = m.offsetHeight;
    const right = pet.x + s * 0.6 + 8;
    m.style.left = (right + w < vw - 8 ? right : Math.max(8, pet.x - s * 0.6 - 8 - w)) + "px";
    m.style.top = clamp(pet.y - s - 6, 8, innerHeight - hgt - 8) + "px";
    this.root.classList.add("active");
    this.panel = {
      kind: "menu",
      el: m,
      flush: () => {},
      onKey: (e) => {
        if (e.key === "Escape") {
          this.closePanel();
          return true;
        }
        const n = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
        if (n && tasks[+n[1] - 1]) {
          pick(+n[1] - 1, {});
          return true;
        }
        return false;
      },
    };
  }

  // ------------------------------------------------------------ 검색어 입력(선택한 글자가 없을 때)
  askText(at: Point, title: string): Promise<string | null> {
    this.closePanel();
    const t = this.t;
    return new Promise((resolve) => {
      let done = false;
      const finish = (v: string | null) => {
        if (done) return;
        done = true;
        resolve(v && v.trim() ? v.trim() : null);
      };
      const input = h("input", { type: "text", placeholder: t("ask.placeholder"), "aria-label": title });
      const p = h("div", { class: "ask" }, h("b", { text: title }), input, h("small", { text: t("ask.hint") }));
      for (const type of ["keydown", "keyup", "keypress"])
        p.addEventListener(type, (e) => {
          const ke = e as KeyboardEvent;
          if (type === "keydown" && ke.key === "Enter" && !ke.isComposing) {
            finish(input.value);
            this.closePanel();
          } else if (type === "keydown" && ke.key === "Escape") this.closePanel();
          e.stopPropagation();
        });
      p.addEventListener("pointerdown", (e) => e.stopPropagation());
      const vw = document.documentElement.clientWidth;
      p.style.left = clamp(at.x - 130, 8, vw - 268) + "px";
      p.style.top = clamp(at.y - 96, 8, innerHeight - 100) + "px";
      this.root.appendChild(p);
      this.root.classList.add("active");
      this.panel = { kind: "ask", el: p, flush: () => finish(null) };
      this.disarm();
      input.focus();
    });
  }

  destroy() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    this.closePanel();
    for (const off of this.off) off();
    this.host.remove();
  }
}
