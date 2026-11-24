/*
 * Cursor Crew: 콘텐츠 스크립트
 *
 * 작은 펫(기본: 도트 슬라임)이 내 마우스 살짝 옆·뒤에서 따라다닌다. 평소 클릭은 전부 페이지로 통과.
 *
 * 메뉴 여는 법
 *  1) 메뉴 키(기본 Alt)를 누르고 있기 → 마우스 주변에 기능들이 원형으로 펼쳐진다.
 *     마우스를 그쪽으로 옮기고 키를 떼면(또는 클릭하면) 실행. 아무것도 안 고르고 떼면 그냥 닫힘.
 *  2) 펫을 직접 클릭 → 펫 주변에 같은 메뉴. 마우스가 펫에 다가가면 펫은 도망가지 않고 멈춘다.
 *
 * 겉모습은 skins.js 가 맡는다(여기는 위치·물리·메뉴·기능만).
 */
(() => {
  "use strict";
  if (window.top !== window || globalThis.__cursorCrew) return;
  globalThis.__cursorCrew = true;

  const D = globalThis.CrewDefaults;
  const Skins = globalThis.CrewSkins;
  const store = chrome.storage;
  const KEY_LABEL = { Alt: "Alt", Control: "Ctrl", Shift: "Shift" };

  // ---------------------------------------------------------------- 기능들
  // item: 메뉴 항목 설정, mods: {shiftKey, ctrlKey, metaKey}, crew: Crew, at: 결과를 보여 줄 위치 {x, y}
  const ACTIONS = {
    link(item, mods, crew, at) {
      if (!item.url) return crew.toast(at, "URL이 없어요 · 툴바 아이콘 → 설정");
      chrome.runtime.sendMessage({ type: "crew:open", url: item.url, sameTab: !!mods.shiftKey, background: !!(mods.ctrlKey || mods.metaKey) }, (res) => {
        if (chrome.runtime.lastError || !res || !res.ok) crew.toast(at, "열 수 없는 주소");
      });
      crew.toast(at, mods.shiftKey ? "↗ 이 탭에서 여는 중" : "↗ " + (item.name || "링크"));
    },
    memo(item, mods, crew, at) {
      crew.openMemo(at, item);
    },
    async copy(item, mods, crew, at) {
      let ok = false;
      try {
        await navigator.clipboard.writeText(location.href);
        ok = true;
      } catch (_) {
        const ta = document.createElement("textarea");
        ta.value = location.href;
        ta.style.cssText = "position:fixed;left:-9999px;top:0";
        document.body.appendChild(ta);
        ta.select();
        try {
          ok = document.execCommand("copy");
        } catch (_) {}
        ta.remove();
      }
      crew.toast(at, ok ? "✓ URL 복사됨" : "복사 실패");
    },
    top(item, mods, crew, at) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      crew.toast(at, "↑ 맨 위로");
    },
  };

  function hintFor(item) {
    if (item.action === "link") {
      try {
        const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(item.url) ? item.url : "https://" + item.url);
        return "↗ " + u.hostname.replace(/^www\./, "");
      } catch (_) {
        return "링크";
      }
    }
    const a = D.actions[item.action];
    return a ? a.label : item.action;
  }

  // ---------------------------------------------------------------- 유틸
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const memoKey = () => "memo:" + location.origin + location.pathname;
  const isEditable = (el) => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

  // innerHTML 대신 DOM API 로 만든다(Trusted Types 를 강제하는 사이트에서도 안전하게)
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const k in props || {}) {
      if (k === "class") el.className = props[k];
      else if (k === "text") el.textContent = props[k];
      else el.setAttribute(k, props[k]);
    }
    for (const c of kids) if (c) el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    return el;
  }

  const FONT = 'system-ui,-apple-system,"Segoe UI","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
  const CSS = `
:host{all:initial}
.root{position:fixed;inset:0;pointer-events:none;opacity:var(--op,1);transition:opacity .25s ease}
.root.active{opacity:1}
.root.dim{opacity:.12}
.root.hide{opacity:0}
.root.dim .hit,.root.hide .hit{pointer-events:none}
.pet{position:absolute;left:0;top:0;will-change:transform}
.pet>:first-child{transition:filter .15s}
.pet.hot>:first-child{filter:drop-shadow(0 0 3px var(--glow)) drop-shadow(0 0 1px var(--glow))}
.hit{position:absolute;border-radius:45%;pointer-events:auto;cursor:pointer}
.badge{position:absolute;width:7px;height:7px;border-radius:50%;background:#A259FF;box-shadow:0 0 0 1.5px #fff}
.spark{position:absolute;color:#fff;font:700 var(--sp,12px)/1 ${FONT};text-shadow:0 0 2px var(--glow),0 0 4px var(--glow);opacity:0;pointer-events:none}
.pet.idle .spark{animation:twinkle 3.2s ease-in-out infinite}
@keyframes twinkle{0%,70%,100%{opacity:0;transform:scale(.4)}80%{opacity:1;transform:scale(1)}90%{opacity:.2;transform:scale(.7)}}
.bubble{position:absolute;transform:translate(-50%,-100%);max-width:260px;background:#1d1d1f;color:#fff;font:600 12.5px/1.4 ${FONT};
  padding:7px 10px;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,.25);white-space:normal;text-align:center;pointer-events:none}
.bubble::after{content:"";position:absolute;left:50%;bottom:-5px;margin-left:-5px;border:5px solid transparent;border-bottom:0;border-top-color:#1d1d1f}
.bubble kbd{font:700 11px/1 ${FONT};background:#fff;color:#1d1d1f;border-radius:4px;padding:2px 5px;margin:0 1px}
.toast{position:absolute;transform:translate(-50%,-100%);background:#1d1d1f;color:#fff;font:600 12px/1 ${FONT};padding:6px 9px;border-radius:8px;
  white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,.2);pointer-events:none}
.catcher{position:absolute;inset:0;pointer-events:auto;cursor:default}
.ring{position:absolute;border-radius:50%;border:2px dashed rgba(29,29,31,.18);transform:translate(-50%,-50%);pointer-events:none;animation:fade .15s ease-out}
.center{position:absolute;transform:translate(-50%,-50%);font:600 11.5px/1 ${FONT};color:#1d1d1f;background:rgba(255,255,255,.95);
  padding:5px 8px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.15);white-space:nowrap;pointer-events:none}
.chip{position:absolute;transform:translate(-50%,-50%);display:flex;align-items:center;gap:6px;padding:7px 11px 7px 9px;border-radius:999px;
  background:#fff;color:#1d1d1f;font:600 13px/1 ${FONT};white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.06);
  pointer-events:auto;cursor:pointer;animation:fly .18s cubic-bezier(.2,.8,.3,1.2) both;transition:background .1s,color .1s,box-shadow .1s}
.chip .dot{width:9px;height:9px;border-radius:50%;flex:none}
.chip.sel{background:var(--c);color:#fff;box-shadow:0 6px 18px rgba(0,0,0,.25)}
.chip.sel .dot{background:#fff!important}
.chip .has{width:6px;height:6px;border-radius:50%;background:#A259FF}
.chip.sel .has{background:#fff}
@keyframes fly{from{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(.3)}}
@keyframes fade{from{opacity:0}}
.panel{position:absolute;width:300px;pointer-events:auto;background:#fff;color:#1d1d1f;border-radius:12px;
  box-shadow:0 12px 40px rgba(0,0,0,.22),0 0 0 1px rgba(0,0,0,.06);overflow:hidden;font:13px/1.45 ${FONT}}
.panel .ph{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #eee}
.panel .ph b{color:var(--c)}
.panel .where{flex:1;color:#888;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.panel button{font:inherit;border:0;background:none;cursor:pointer;color:#666;padding:2px 6px;border-radius:6px}
.panel button:hover{background:#f1f1f1;color:#111}
.panel textarea{display:block;box-sizing:border-box;width:100%;height:150px;border:0;outline:0;resize:vertical;padding:10px 12px;
  font:inherit;font-size:14px;color:#1d1d1f;background:#fff}
.panel .pf{display:flex;align-items:center;justify-content:space-between;padding:6px 8px 8px 12px;border-top:1px solid #f2f2f2;color:#999;font-size:12px}
`;

  // ---------------------------------------------------------------- Crew
  class Crew {
    constructor(cfg, mouse, images) {
      this.cfg = cfg;
      this.size = clamp(+cfg.size || 36, 20, 72);
      this.key = KEY_LABEL[cfg.menuKey] ? cfg.menuKey : null; // null = 키로 열기 끔
      this.mouse = mouse || null; // 화면(뷰포트) 좌표
      this.mv = { x: 0, y: 0 }; // 마우스 속도(px/s, 부드럽게)
      this.lastMove = performance.now();
      this.visible = !!mouse;
      this.radial = null;
      this.panel = null;
      this.hasMemo = false;
      this.hot = null; // 마우스가 올라간 펫

      this.host = document.createElement("div");
      this.host.setAttribute("data-cursor-crew", "");
      this.host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;display:block";
      const sh = this.host.attachShadow({ mode: "open" });
      this.root = h("div", { class: "root" });
      this.root.style.setProperty("--op", clamp(+cfg.opacity || 0.9, 0.15, 1));
      sh.append(h("style", { text: CSS }), this.root);
      if (!this.visible) this.root.classList.add("hide");

      let skin = Skins.get(cfg.skin);
      if (skin.needsImage && !(images && images.some(Boolean))) skin = Skins.get("slime");
      const n = clamp(Math.round(cfg.pets) || 1, 1, D.maxPets);
      const colors = cfg.petColors && cfg.petColors.length ? cfg.petColors : D.settings.petColors;
      // 펫마다 자기 이미지, 비어 있으면 첫 번째로 올린 이미지를 같이 쓴다
      const imageFor = (i) => (images ? images[i] || images.find(Boolean) : null);
      this.pets = Array.from({ length: n }, (_, i) => this.makePet(skin, colors[i % colors.length], i, imageFor(i)));
      document.documentElement.appendChild(this.host);
      this.refreshMemo();

      // 페이지 이벤트
      this.on = [];
      const listen = (t, fn, o) => {
        addEventListener(t, fn, o);
        this.on.push([t, fn, o]);
      };
      listen("mousemove", (e) => this.onMove(e), { passive: true, capture: true });
      listen("pointerdown", (e) => this.onPageDown(e), { capture: true });
      listen("keydown", (e) => this.onKeyDown(e), { capture: true });
      listen("keyup", (e) => this.onKeyUp(e), { capture: true });
      listen("blur", () => {
        this.closeRadial();
        this.hide();
      });
      this.onLeave = (e) => {
        if (!e.relatedTarget && !this.radial) this.hide();
      };
      document.addEventListener("mouseout", this.onLeave);
      this.onFs = () => this.root.classList.toggle("hide", !!document.fullscreenElement || !this.visible);
      document.addEventListener("fullscreenchange", this.onFs);

      this.raf = 0;
      this.last = 0;
      this.wake();
    }

    makePet(skin, color, i, image) {
      const s = this.size;
      const body = skin.create(color, s, { image, pixelated: !!this.cfg.imagePixelated });
      const hit = h("div", { class: "hit", title: this.key ? `클릭하거나 ${KEY_LABEL[this.key]}를 누르고 있으면 메뉴` : "클릭하면 메뉴" });
      Object.assign(hit.style, { left: -s * 0.55 + "px", top: -s * 1.05 + "px", width: s * 1.1 + "px", height: s * 1.1 + "px" });
      const spark = h("div", { class: "spark", text: "✦" });
      Object.assign(spark.style, { left: s * 0.3 + "px", top: -s * 1.15 + "px" });
      const el = h("div", { class: "pet" }, body.el, hit, spark);
      el.style.setProperty("--glow", color);
      el.style.setProperty("--sp", Math.round(s * 0.36) + "px");
      const pet = { el, body, hit, color, i, x: 0, y: 0, vx: 0, vy: 0, k: i ? 60 : 85 };
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
    // 멈춰 있을 때: 마우스 오른쪽 아래(화살표를 가리지 않게) 나란히. 화면 끝이면 반대쪽.
    restSpot(i, p) {
      const s = this.size;
      const vw = document.documentElement.clientWidth;
      const n = this.pets ? this.pets.length : 1;
      const fx = p.x > vw - (n * (s + 6) + 50) ? -1 : 1;
      const fy = p.y > innerHeight - s - 30 ? -1 : 1;
      return { x: p.x + fx * (s * 0.6 + 16 + i * (s + 6)), y: fy > 0 ? p.y + s + 8 : p.y - 10 };
    }

    targetFor(pet, w) {
      const s = this.size;
      if (this.radial) {
        // 메뉴가 열리면 펫들은 가운데 아래로 모인다
        const c = this.radial;
        return { x: c.cx + (pet.i - (this.pets.length - 1) / 2) * (s * 0.95), y: c.cy + s * 0.35 + 6 };
      }
      // 마우스가 천천히 다가오거나 바로 위에 오면 도망가지 않고 그 자리에 멈춘다(잡을 수 있게).
      // 빠르게 지나가는 건 이동으로 보고 그냥 따라간다. 충분히 멀어지면 다시 따라간다.
      const dx = pet.x - this.mouse.x;
      const dy = pet.y - s * 0.5 - this.mouse.y;
      const d = Math.hypot(dx, dy);
      const spd = Math.hypot(this.mv.x, this.mv.y);
      const toward = this.mv.x * dx + this.mv.y * dy > 0;
      if (pet.held) {
        if (d > s * 2.3) pet.held = false;
      } else if (d < s * 0.75 || (d < s * 1.6 && toward && spd > 20 && spd < 500)) pet.held = true;
      if (pet.held) return { x: pet.x, y: pet.y, hold: true };
      const rest = this.restSpot(pet.i, this.mouse);
      if (w <= 0) return rest;
      // 움직일 때: 앞사람(첫 펫은 마우스)의 뒤쪽으로 처진다
      const lead = pet.i === 0 ? { x: this.mouse.x, y: this.mouse.y + s * 0.5, vx: this.mv.x, vy: this.mv.y } : this.pets[pet.i - 1];
      const L = Math.hypot(lead.vx, lead.vy) || 1;
      const back = (pet.i === 0 ? s * 0.9 + 24 : s + 4) / L;
      const behind = { x: lead.x - lead.vx * back, y: lead.y - lead.vy * back + (pet.i === 0 ? s * 0.3 : 0) };
      return { x: rest.x + (behind.x - rest.x) * w, y: rest.y + (behind.y - rest.y) * w };
    }

    // ------------------------------------------------------------ 마우스
    onMove(e) {
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

    onPageDown(e) {
      if (e.composedPath().includes(this.host)) return;
      if (this.panel) this.closeMemo();
    }

    // ------------------------------------------------------------ 키
    onKeyDown(e) {
      if (e.composedPath().includes(this.host)) return; // 메모장 안에서 치는 키
      if (this.key && e.key === this.key) {
        if (e.repeat) return;
        if (this.key === "Alt") e.preventDefault(); // 윈도우에서 Alt 만 눌렀다 뗄 때 크롬 메뉴로 포커스가 가는 것 방지
        const typing = isEditable(e.target) || isEditable(document.activeElement);
        if (!this.visible || this.panel || (typing && this.key !== "Alt")) return;
        if (e.ctrlKey + e.altKey + e.shiftKey + e.metaKey > 1) return; // 다른 조합키와 함께면 무시
        clearTimeout(this.keyT);
        // 단축키의 일부로 잠깐 누르는 경우를 피하려고 아주 살짝 기다린다
        this.keyT = setTimeout(() => {
          this.keyT = 0;
          if (this.mouse) this.openRadial("key", { ...this.mouse });
        }, 110);
        return;
      }
      // 메뉴 키를 누른 채 다른 키를 치면(예: Alt+←) 단축키로 보고 접는다
      if (this.keyT || (this.radial && this.radial.mode === "key")) {
        clearTimeout(this.keyT);
        this.keyT = 0;
        this.closeRadial();
      }
      if (e.key === "Escape") {
        if (this.radial) return this.closeRadial();
        if (this.panel) return this.closeMemo();
      }
      // 페이지에서 글을 쓰는 중이면 방해하지 않게 흐려진다
      if (isEditable(e.target) || isEditable(document.activeElement)) {
        this.root.classList.add("dim");
        this.closeRadial();
      }
    }

    onKeyUp(e) {
      if (!this.key || e.key !== this.key) return;
      if (this.key === "Alt") e.preventDefault();
      if (this.keyT) {
        clearTimeout(this.keyT);
        this.keyT = 0;
        return;
      }
      const r = this.radial;
      if (r && r.mode === "key") {
        const sel = r.sel;
        this.closeRadial();
        if (sel) this.run(sel.item, e, { x: r.cx, y: r.cy });
      }
    }

    // ------------------------------------------------------------ 원형 메뉴
    openRadial(mode, at) {
      if (this.radial || this.panel) return;
      this.dismissHint(true);
      const items = this.cfg.crew.slice(0, D.maxCrew);
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
      const slots = items.map((item, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; // 12시 방향부터 시계 방향
        const x = cx + Math.cos(a) * R;
        const y = cy + Math.sin(a) * R;
        const dot = h("span", { class: "dot" });
        dot.style.background = item.color;
        const chip = h("div", { class: "chip", role: "menuitem" }, dot, h("span", { text: item.name || "기능" }));
        if (item.action === "memo" && this.hasMemo) chip.appendChild(h("span", { class: "has", title: "이 페이지에 메모가 있어요" }));
        chip.style.setProperty("--c", item.color);
        chip.style.setProperty("--dx", (cx - x).toFixed(0) + "px");
        chip.style.setProperty("--dy", (cy - y).toFixed(0) + "px");
        chip.style.animationDelay = i * 18 + "ms";
        Object.assign(chip.style, { left: x + "px", top: y + "px" });
        const slot = { item, chip, a };
        // 칩이 가운데(마우스 밑)에서 튀어나올 때 저절로 골라지지 않게, 마우스를 움직인 뒤에만 호버로 고른다
        chip.addEventListener("pointerenter", () => this.radial && this.radial.moved && this.select(slot));
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
        const r = this.radial;
        const sel = r && r.mode === "key" ? r.sel : null;
        this.closeRadial();
        if (sel) this.run(sel.item, e, { x: cx, y: cy });
      });
      this.root.appendChild(box);
      this.root.classList.add("active");
      this.radial = { mode, cx, cy, R, el: box, center, slots, sel: null, from: { ...(this.mouse || at) } };
      this.select(null);
      this.wake();
    }

    // 키 모드: 메뉴를 연 자리에서 마우스를 옮긴 방향으로 고른다
    pickByPointer() {
      const r = this.radial;
      if (!r || !this.mouse) return;
      const dx = this.mouse.x - r.from.x;
      const dy = this.mouse.y - r.from.y;
      if (Math.hypot(dx, dy) > 6) r.moved = true;
      if (r.mode !== "key") return;
      if (Math.hypot(dx, dy) < 18) return this.select(null);
      const a = Math.atan2(dy, dx);
      let best = null;
      let bestD = Infinity;
      for (const s of r.slots) {
        const d = Math.abs(Math.atan2(Math.sin(a - s.a), Math.cos(a - s.a)));
        if (d < bestD) (best = s), (bestD = d);
      }
      this.select(best);
    }

    select(slot) {
      const r = this.radial;
      if (!r) return;
      r.sel = slot;
      for (const s of r.slots) s.chip.classList.toggle("sel", s === slot);
      const keyName = this.key ? KEY_LABEL[this.key] : "";
      r.center.textContent = slot
        ? slot.item.action === "memo" && this.hasMemo
          ? "메모 있음 · 열기"
          : hintFor(slot.item)
        : r.mode === "key"
          ? `방향을 고르고 ${keyName}를 떼세요`
          : "고르세요 · Esc 닫기";
    }

    closeRadial() {
      const r = this.radial;
      if (!r) return;
      this.radial = null;
      r.el.remove();
      if (!this.panel) this.root.classList.remove("active");
    }

    run(item, mods, at) {
      const fn = ACTIONS[item.action];
      if (fn) fn(item, mods || {}, this, at);
    }

    // ------------------------------------------------------------ 처음 안내
    async maybeHint() {
      const got = await store.local.get("crewHintSeen");
      if (got.crewHintSeen || this.dead) return;
      await store.local.set({ crewHintSeen: Date.now() });
      const b = h("div", { class: "bubble" });
      if (this.key) b.append(h("kbd", { text: KEY_LABEL[this.key] }), " 를 누르고 있으면 메뉴가 열려요", h("br"), "나를 클릭해도 돼요");
      else b.append("나를 클릭하면 메뉴가 열려요");
      this.root.appendChild(b);
      this.hint = { el: b, until: performance.now() + 9000 };
    }
    dismissHint() {
      if (!this.hint) return;
      this.hint.el.remove();
      this.hint = null;
    }

    toast(at, text) {
      const t = h("div", { class: "toast", text });
      t.style.left = at.x + "px";
      t.style.top = at.y - 16 + "px";
      this.root.appendChild(t);
      setTimeout(() => t.remove(), 1300);
    }

    // ------------------------------------------------------------ 보이기
    show() {
      if (this.visible) return;
      this.visible = true;
      this.root.classList.toggle("hide", !!document.fullscreenElement);
    }
    hide() {
      if (this.panel || this.radial) return;
      this.visible = false;
      this.root.classList.add("hide");
    }

    // ------------------------------------------------------------ 루프
    wake() {
      if (!this.raf && !this.dead) this.raf = requestAnimationFrame((t) => this.tick(t));
    }

    tick(now) {
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
      const got = await store.local.get(key);
      this.hasMemo = !!(got[key] && got[key].text && got[key].text.trim());
      const usesMemo = this.cfg.crew.some((c) => c.action === "memo");
      const pet = this.pets[0];
      let badge = pet.el.querySelector(".badge");
      if (this.hasMemo && usesMemo && !badge) {
        badge = h("div", { class: "badge", title: "이 페이지에 메모가 있어요" });
        badge.style.left = this.size * 0.32 + "px";
        badge.style.top = -this.size * 0.95 + "px";
        pet.el.appendChild(badge);
      } else if (!(this.hasMemo && usesMemo) && badge) badge.remove();
    }

    async openMemo(at, item) {
      if (this.panel) return this.closeMemo();
      const key = memoKey();
      const got = await store.local.get(key);
      const ta = h("textarea", { placeholder: "이 페이지에 남길 메모… (자동 저장)" });
      const st = h("span", { class: "st", text: "자동 저장" });
      const p = h(
        "div",
        { class: "panel" },
        h("div", { class: "ph" }, h("b", { text: item.name || "메모" }), h("span", { class: "where", text: location.hostname + location.pathname }), h("button", { class: "x", title: "닫기 (Esc)", text: "✕" })),
        ta,
        h("div", { class: "pf" }, st, h("button", { class: "all", text: "모든 메모 보기" }))
      );
      p.style.setProperty("--c", item.color);
      ta.value = (got[key] && got[key].text) || "";
      const vw = document.documentElement.clientWidth;
      p.style.left = clamp(at.x - 150, 8, vw - 308) + "px";
      p.style.top = clamp(at.y - 110, 8, innerHeight - 250) + "px";
      // 메모장에서 치는 키가 페이지 단축키(예: 유튜브 k, 깃허브 s)로 새지 않게
      for (const t of ["keydown", "keyup", "keypress"])
        p.addEventListener(t, (e) => {
          if (e.key === "Escape") this.closeMemo();
          e.stopPropagation();
        });
      p.addEventListener("pointerdown", (e) => e.stopPropagation());
      let timer = 0;
      const save = async () => {
        const text = ta.value;
        if (text.trim()) await store.local.set({ [key]: { text, title: document.title, url: location.href, updated: Date.now() } });
        else await store.local.remove(key);
        st.textContent = "저장됨 ✓";
      };
      ta.addEventListener("input", () => {
        st.textContent = "저장 중…";
        clearTimeout(timer);
        timer = setTimeout(save, 350);
      });
      p.querySelector(".x").addEventListener("click", () => this.closeMemo());
      p.querySelector(".all").addEventListener("click", () => chrome.runtime.sendMessage({ type: "crew:options", hash: "memos" }));
      this.root.appendChild(p);
      this.root.classList.add("active");
      this.panel = { el: p, flush: () => (clearTimeout(timer), save()) };
      ta.focus();
    }

    closeMemo() {
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
      for (const [t, fn, o] of this.on) removeEventListener(t, fn, o);
      document.removeEventListener("mouseout", this.onLeave);
      document.removeEventListener("fullscreenchange", this.onFs);
      this.host.remove();
    }
  }

  // ---------------------------------------------------------------- 켜기·끄기
  let crew = null;
  let lastMouse = null;
  addEventListener("mousemove", (e) => (lastMouse = { x: e.clientX, y: e.clientY }), { passive: true, capture: true });

  function excluded(list) {
    const host = location.hostname;
    return (list || []).some((s) => {
      s = String(s).trim().toLowerCase().replace(/^\*\./, "");
      return s && (host === s || host.endsWith("." + s));
    });
  }

  async function apply() {
    const cfg = await store.sync.get(D.settings);
    const on = cfg.enabled && !excluded(cfg.excluded);
    let images = null;
    if (on && Skins.get(cfg.skin).needsImage) {
      const got = await store.local.get(["skinImage0", "skinImage1", "skinImage2", "skinImage"]);
      images = [got.skinImage0 || got.skinImage || null, got.skinImage1 || null, got.skinImage2 || null];
    }
    if (crew) {
      lastMouse = crew.mouse || lastMouse;
      crew.destroy();
      crew = null;
    }
    if (on) {
      crew = new Crew(cfg, lastMouse, images);
      if (lastMouse) crew.maybeHint();
    }
  }

  store.onChanged.addListener((changes, area) => {
    if (area === "sync" || (area === "local" && Object.keys(changes).some((k) => k.startsWith("skinImage")))) apply();
    else if (area === "local" && crew && changes[memoKey()]) crew.refreshMemo();
  });
  apply();
})();
