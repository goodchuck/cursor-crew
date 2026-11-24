/*
 * Crew: 펫(1~3마리)이 마우스를 따라다니고, 원형 메뉴·메모장·첫 안내를 띄운다.
 *
 * 메뉴 여는 법
 *  1) 메뉴 키(기본 Alt)를 누르고 있기 → 마우스 주변에 기능들이 원형으로 펼쳐진다.
 *     마우스를 그쪽으로 옮기고 키를 떼면(또는 클릭하면) 실행. 아무것도 안 고르고 떼면 그냥 닫힘.
 *  2) 펫을 직접 클릭 → 펫 주변에 같은 메뉴. 마우스가 펫에 천천히 다가가면 펫은 도망가지 않고 멈춘다.
 *
 * 겉모습은 shared/skins.ts, 기능은 actions.ts, 글자는 shared/i18n.ts 가 맡는다.
 */
import { MAX_CREW, MAX_PETS, HINT_SEEN_KEY, DEFAULTS, memoKey, type MenuItem, type Settings, type Memo } from "@src/shared/settings";
import { KEY_LABEL, type T } from "@src/shared/i18n";
import { getSkin, type Skin, type SkinBody } from "@src/shared/skins";
import { ACTIONS, itemHint, itemName, type ActionHost, type Mods, type Point } from "./actions";
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
}
interface Slot {
  item: MenuItem;
  chip: HTMLDivElement;
  a: number;
}
interface Radial {
  mode: "key" | "click";
  cx: number;
  cy: number;
  el: HTMLDivElement;
  center: HTMLDivElement;
  slots: Slot[];
  sel: Slot | null;
  from: Point;
  moved?: boolean;
}

export interface CrewOptions {
  cfg: Settings;
  mouse: Point | null;
  images: (string | null)[] | null;
  t: T;
  dark: boolean;
}

export class Crew implements ActionHost {
  readonly t: T;
  mouse: Point | null;
  private cfg: Settings;
  private size: number;
  private key: string | null;
  private mv = { x: 0, y: 0 }; // 마우스 속도(px/s, 부드럽게)
  private lastMove = performance.now();
  private lastEv = 0;
  private visible: boolean;
  private radial: Radial | null = null;
  private panel: { el: HTMLDivElement; flush: () => void } | null = null;
  private hint: { el: HTMLDivElement; until: number } | null = null;
  private hasMemo = false;
  private hot: Pet | null = null;
  private host: HTMLDivElement;
  private root: HTMLDivElement;
  private pets: Pet[] = [];
  private keyT = 0;
  private raf = 0;
  private last = 0;
  private dead = false;
  private off: (() => void)[] = [];

  constructor({ cfg, mouse, images, t, dark }: CrewOptions) {
    this.cfg = cfg;
    this.t = t;
    this.size = clamp(+cfg.size || 36, 20, 72);
    this.key = KEY_LABEL[cfg.menuKey] ? cfg.menuKey : null; // null = 키로 열기 끔
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
    const n = clamp(Math.round(cfg.pets) || 1, 1, MAX_PETS);
    const colors = cfg.petColors?.length ? cfg.petColors : DEFAULTS.petColors;
    // 펫마다 자기 이미지, 비어 있으면 첫 번째로 올린 이미지를 같이 쓴다
    const imageFor = (i: number) => (images ? images[i] || images.find(Boolean) || null : null);
    for (let i = 0; i < n; i++) this.pets.push(this.makePet(skin, colors[i % colors.length], i, imageFor(i)));
    document.documentElement.appendChild(this.host);
    this.refreshMemo();

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
      this.closeRadial();
      this.hide();
    });
    listen<MouseEvent>(document, "mouseout", (e) => {
      if (!e.relatedTarget && !this.radial) this.hide();
    });
    listen(document, "fullscreenchange", () => this.root.classList.toggle("hide", !!document.fullscreenElement || !this.visible));

    this.wake();
  }

  setDark(dark: boolean) {
    this.root.classList.toggle("dark", dark);
  }

  private makePet(skin: Skin, color: string, i: number, image: string | null): Pet {
    const s = this.size;
    const t = this.t;
    const body = skin.create(color, s, { image, pixelated: !!this.cfg.imagePixelated });
    const hit = h("div", { class: "hit", title: this.key ? t("pet.titleKey", { key: KEY_LABEL[this.key] }) : t("pet.titleClick") });
    Object.assign(hit.style, { left: -s * 0.55 + "px", top: -s * 1.05 + "px", width: s * 1.1 + "px", height: s * 1.1 + "px" });
    const spark = h("div", { class: "spark", text: "✦" });
    Object.assign(spark.style, { left: s * 0.3 + "px", top: -s * 1.15 + "px" });
    const el = h("div", { class: "pet" }, body.el as Node, hit, spark);
    el.style.setProperty("--glow", color);
    el.style.setProperty("--sp", Math.round(s * 0.36) + "px");
    const pet: Pet = { el, body, hit, color, i, x: 0, y: 0, vx: 0, vy: 0, k: i ? 60 : 85 };
    if (this.mouse) Object.assign(pet, this.restSpot(i, this.mouse));
    hit.addEventListener("pointerenter", () => {
      this.hot = pet;
      el.classList.add("hot");
    });
    hit.addEventListener("pointerleave", () => {
      if (this.hot === pet) this.hot = null;
      el.classList.remove("hot");
    });
    hit.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    hit.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.radial) this.closeRadial();
      else this.openRadial("click", { x: pet.x, y: pet.y - s * 0.5 });
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

  private targetFor(pet: Pet, w: number): Point & { hold?: boolean } {
    const s = this.size;
    const mouse = this.mouse!;
    if (this.radial) {
      // 메뉴가 열리면 펫들은 가운데 아래로 모인다
      const c = this.radial;
      return { x: c.cx + (pet.i - (this.pets.length - 1) / 2) * (s * 0.95), y: c.cy + s * 0.35 + 6 };
    }
    // 마우스가 천천히 다가오거나 바로 위에 오면 도망가지 않고 그 자리에 멈춘다(잡을 수 있게).
    // 빠르게 지나가는 건 이동으로 보고 그냥 따라간다. 충분히 멀어지면 다시 따라간다.
    const dx = pet.x - mouse.x;
    const dy = pet.y - s * 0.5 - mouse.y;
    const d = Math.hypot(dx, dy);
    const spd = Math.hypot(this.mv.x, this.mv.y);
    const toward = this.mv.x * dx + this.mv.y * dy > 0;
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
    if (this.radial) this.pickByPointer();
    if (first) this.maybeHint();
    this.wake();
  }

  private onPageDown(e: PointerEvent) {
    if (e.composedPath().includes(this.host)) return;
    if (this.panel) this.closeMemo();
  }

  // ------------------------------------------------------------ 키
  private onKeyDown(e: KeyboardEvent) {
    if (e.composedPath().includes(this.host)) return; // 메모장 안에서 치는 키
    if (this.key && e.key === this.key) {
      if (e.repeat) return;
      if (this.key === "Alt") e.preventDefault(); // 윈도우에서 Alt 만 눌렀다 뗄 때 크롬 메뉴로 포커스가 가는 것 방지
      const typing = isEditable(e.target as Element) || isEditable(document.activeElement);
      if (!this.visible || this.panel || (typing && this.key !== "Alt")) return;
      if (+e.ctrlKey + +e.altKey + +e.shiftKey + +e.metaKey > 1) return; // 다른 조합키와 함께면 무시
      clearTimeout(this.keyT);
      // 단축키의 일부로 잠깐 누르는 경우를 피하려고 아주 살짝 기다린다
      this.keyT = window.setTimeout(() => {
        this.keyT = 0;
        if (this.mouse) this.openRadial("key", { ...this.mouse });
      }, 110);
      return;
    }
    // 메뉴 키를 누른 채 다른 키를 치면(예: Alt+←) 단축키로 보고 접는다
    if (this.keyT || this.radial?.mode === "key") {
      clearTimeout(this.keyT);
      this.keyT = 0;
      this.closeRadial();
    }
    if (e.key === "Escape") {
      if (this.radial) return this.closeRadial();
      if (this.panel) return this.closeMemo();
    }
    // 페이지에서 글을 쓰는 중이면 방해하지 않게 흐려진다
    if (isEditable(e.target as Element) || isEditable(document.activeElement)) {
      this.root.classList.add("dim");
      this.closeRadial();
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    if (!this.key || e.key !== this.key) return;
    if (this.key === "Alt") e.preventDefault();
    if (this.keyT) {
      clearTimeout(this.keyT);
      this.keyT = 0;
      return;
    }
    const r = this.radial;
    if (r?.mode === "key") {
      const sel = r.sel;
      this.closeRadial();
      if (sel) this.run(sel.item, e, { x: r.cx, y: r.cy });
    }
  }

  // ------------------------------------------------------------ 원형 메뉴
  private openRadial(mode: Radial["mode"], at: Point) {
    if (this.radial || this.panel) return;
    this.dismissHint();
    const items = this.cfg.crew.slice(0, MAX_CREW);
    if (!items.length) return;
    const n = items.length;
    const R = clamp(48 + n * 11, 70, 130);
    const vw = document.documentElement.clientWidth;
    // 화면 끝이면 원이 잘리지 않게 가운데를 안쪽으로 민다
    const cx = clamp(at.x, R + 70, vw - R - 70);
    const cy = clamp(at.y, R + 30, innerHeight - R - 30);
    const box = h("div", { class: "radial" });
    const catcher = h("div", { class: "catcher" });
    const ring = h("div", { class: "ring" });
    Object.assign(ring.style, { left: cx + "px", top: cy + "px", width: R * 2 + "px", height: R * 2 + "px" });
    const center = h("div", { class: "center" });
    Object.assign(center.style, { left: cx + "px", top: cy + "px" });
    box.append(catcher, ring);
    const slots = items.map((item, i): Slot => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; // 12시 방향부터 시계 방향
      const x = cx + Math.cos(a) * R;
      const y = cy + Math.sin(a) * R;
      const dot = h("span", { class: "dot" });
      dot.style.background = item.color;
      const chip = h("div", { class: "chip", role: "menuitem" }, dot, h("span", { text: itemName(item, this.t) }));
      if (item.action === "memo" && this.hasMemo) chip.appendChild(h("span", { class: "has", title: this.t("memo.exists") }));
      chip.style.setProperty("--c", item.color);
      chip.style.setProperty("--dx", (cx - x).toFixed(0) + "px");
      chip.style.setProperty("--dy", (cy - y).toFixed(0) + "px");
      chip.style.animationDelay = i * 18 + "ms";
      Object.assign(chip.style, { left: x + "px", top: y + "px" });
      const slot: Slot = { item, chip, a };
      // 칩이 가운데(마우스 밑)에서 튀어나올 때 저절로 골라지지 않게, 마우스를 움직인 뒤에만 호버로 고른다
      chip.addEventListener("pointerenter", () => this.radial?.moved && this.select(slot));
      chip.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      chip.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeRadial();
        this.run(item, e, { x: cx, y: cy });
      });
      box.appendChild(chip);
      return slot;
    });
    box.appendChild(center);
    // 빈 곳 클릭: 키 모드면 고른 것 실행, 아니면 닫기
    catcher.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    catcher.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const sel = this.radial?.mode === "key" ? this.radial.sel : null;
      this.closeRadial();
      if (sel) this.run(sel.item, e, { x: cx, y: cy });
    });
    this.root.appendChild(box);
    this.root.classList.add("active");
    this.radial = { mode, cx, cy, el: box, center, slots, sel: null, from: { ...(this.mouse || at) } };
    this.select(null);
    this.wake();
  }

  /** 키 모드: 메뉴를 연 자리에서 마우스를 옮긴 방향으로 고른다 */
  private pickByPointer() {
    const r = this.radial;
    if (!r || !this.mouse) return;
    const dx = this.mouse.x - r.from.x;
    const dy = this.mouse.y - r.from.y;
    if (Math.hypot(dx, dy) > 6) r.moved = true;
    if (r.mode !== "key") return;
    if (Math.hypot(dx, dy) < 18) return this.select(null);
    const a = Math.atan2(dy, dx);
    let best: Slot | null = null;
    let bestD = Infinity;
    for (const s of r.slots) {
      const d = Math.abs(Math.atan2(Math.sin(a - s.a), Math.cos(a - s.a)));
      if (d < bestD) {
        best = s;
        bestD = d;
      }
    }
    this.select(best);
  }

  private select(slot: Slot | null) {
    const r = this.radial;
    if (!r) return;
    const t = this.t;
    r.sel = slot;
    for (const s of r.slots) s.chip.classList.toggle("sel", s === slot);
    r.center.textContent = slot
      ? slot.item.action === "memo" && this.hasMemo
        ? t("radial.memoOpen")
        : itemHint(slot.item, t)
      : r.mode === "key"
        ? t("radial.pickKey", { key: KEY_LABEL[this.key!] })
        : t("radial.pickClick");
  }

  private closeRadial() {
    const r = this.radial;
    if (!r) return;
    this.radial = null;
    r.el.remove();
    if (!this.panel) this.root.classList.remove("active");
  }

  private run(item: MenuItem, mods: Mods, at: Point) {
    const fn = ACTIONS[item.action];
    if (fn) void fn(item, mods, this, at);
  }

  // ------------------------------------------------------------ 처음 안내
  async maybeHint() {
    const got = await chrome.storage.local.get(HINT_SEEN_KEY);
    if (got[HINT_SEEN_KEY] || this.dead) return;
    await chrome.storage.local.set({ [HINT_SEEN_KEY]: Date.now() });
    const t = this.t;
    const b = h("div", { class: "bubble" });
    if (this.key) {
      // "{key}" 자리에 키 모양을 넣는다
      const [before, after] = t("hint.key1", { key: "\u0000" }).split("\u0000");
      b.append(before, h("kbd", { text: KEY_LABEL[this.key] }), after, h("br"), t("hint.key2"));
    } else b.append(t("hint.click"));
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
    el.style.top = at.y - 16 + "px";
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
    if (this.panel || this.radial) return;
    this.visible = false;
    this.root.classList.add("hide");
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
    const idle = still > 900 && !this.radial;
    for (const pet of this.pets) {
      const tg = this.targetFor(pet, w);
      const k = tg.hold ? 0 : this.radial ? 170 : pet.k;
      const c = tg.hold ? 18 : 2 * Math.sqrt(k) * 0.8; // 잡힐 땐 브레이크만
      let ax = (tg.x - pet.x) * k - pet.vx * c;
      let ay = (tg.y - pet.y) * k - pet.vy * c;
      // 서로 겹치지 않게 밀어낸다(멈춰 있는 펫끼리도)
      for (const o of this.pets) {
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
      const happy = this.hot === pet || !!this.radial;
      pet.body.update({ t: now / 1000, dt, vx: pet.vx, vy: pet.vy, speed: Math.hypot(pet.vx, pet.vy), hover: happy });
      pet.el.classList.toggle("idle", idle);
      pet.el.style.transform = `translate(${pet.x.toFixed(1)}px,${pet.y.toFixed(1)}px)`;
    }
    if (this.hint) {
      const p = this.pets[0];
      this.hint.el.style.left = clamp(p.x, 140, document.documentElement.clientWidth - 140) + "px";
      this.hint.el.style.top = p.y - s - 10 + "px";
      if (now > this.hint.until) this.dismissHint();
    }
    // 숨쉬기·깜빡임 애니메이션 때문에 보이는 동안은 계속 돈다(펫 1~3마리라 가볍다)
    if (this.visible) this.wake();
  }

  // ------------------------------------------------------------ 메모
  async refreshMemo() {
    const key = memoKey();
    const got = await chrome.storage.local.get(key);
    const memo = got[key] as Memo | undefined;
    this.hasMemo = !!memo?.text?.trim();
    const usesMemo = this.cfg.crew.some((c) => c.action === "memo");
    const pet = this.pets[0];
    let badge = pet.el.querySelector(".badge");
    if (this.hasMemo && usesMemo && !badge) {
      badge = h("div", { class: "badge", title: this.t("memo.exists") });
      (badge as HTMLElement).style.left = this.size * 0.32 + "px";
      (badge as HTMLElement).style.top = -this.size * 0.95 + "px";
      pet.el.appendChild(badge);
    } else if (!(this.hasMemo && usesMemo) && badge) badge.remove();
  }

  async openMemo(at: Point, item: MenuItem) {
    if (this.panel) return this.closeMemo();
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
      h("div", { class: "ph" }, h("b", { text: itemName(item, t) }), h("span", { class: "where", text: location.hostname + location.pathname }), close),
      ta,
      h("div", { class: "pf" }, st, all),
    );
    p.style.setProperty("--c", item.color);
    ta.value = memo?.text || "";
    const vw = document.documentElement.clientWidth;
    p.style.left = clamp(at.x - 150, 8, vw - 308) + "px";
    p.style.top = clamp(at.y - 110, 8, innerHeight - 250) + "px";
    // 메모장에서 치는 키가 페이지 단축키(예: 유튜브 k, 깃허브 s)로 새지 않게
    for (const type of ["keydown", "keyup", "keypress"])
      p.addEventListener(type, (e) => {
        if ((e as KeyboardEvent).key === "Escape") this.closeMemo();
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
    close.addEventListener("click", () => this.closeMemo());
    all.addEventListener("click", () => chrome.runtime.sendMessage({ type: "crew:options", hash: "memos" }));
    this.root.appendChild(p);
    this.root.classList.add("active");
    this.panel = { el: p, flush: () => (clearTimeout(timer), void save()) };
    ta.focus();
  }

  private closeMemo() {
    if (!this.panel) return;
    const pn = this.panel;
    this.panel = null;
    pn.flush();
    pn.el.remove();
    if (!this.radial) this.root.classList.remove("active");
  }

  destroy() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.keyT);
    this.closeMemo();
    this.closeRadial();
    for (const off of this.off) off();
    this.host.remove();
  }
}
