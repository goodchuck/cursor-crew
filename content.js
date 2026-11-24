/*
 * Cursor Crew: 콘텐츠 스크립트
 *
 * 작은 펫(기본: 도트 슬라임)이 내 마우스 살짝 옆·뒤에서 따라다닌다.
 *  - 움직이는 동안: 마우스 뒤쪽으로 처지며 따라옴. 펫이 여럿이면 줄줄이. 클릭은 전부 페이지로 통과.
 *  - 마우스를 settleMs 동안 멈추면: 펫이 마우스 옆에 앉는다. 펫에 호버(또는 클릭)하면 기능 메뉴가 펼쳐진다.
 *    근처에서 움직이는 동안은 따라오지 않고, 멀리 벗어나면 다시 따라온다.
 *  - 겉모습은 skins.js 가 맡는다(여기는 위치·물리·메뉴·기능만).
 */
(() => {
  "use strict";
  if (window.top !== window || globalThis.__cursorCrew) return;
  globalThis.__cursorCrew = true;

  const D = globalThis.CrewDefaults;
  const Skins = globalThis.CrewSkins;
  const store = chrome.storage;

  // ---------------------------------------------------------------- 기능들
  // item: 메뉴 항목 설정, ev: 클릭 이벤트, crew: Crew, pet: 메뉴를 연 펫
  const ACTIONS = {
    link(item, ev, crew, pet) {
      if (!item.url) return crew.toast(pet, "URL이 없어요 · 옵션에서 설정");
      chrome.runtime.sendMessage({ type: "crew:open", url: item.url, sameTab: ev.shiftKey, background: ev.ctrlKey || ev.metaKey }, (res) => {
        if (chrome.runtime.lastError || !res || !res.ok) crew.toast(pet, "열 수 없는 주소");
      });
      crew.toast(pet, ev.shiftKey ? "↗ 이 탭에서 여는 중" : "↗ " + (item.name || "링크"));
    },
    memo(item, ev, crew, pet) {
      crew.openMemo(pet, item);
    },
    async copy(item, ev, crew, pet) {
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
      crew.toast(pet, ok ? "✓ URL 복사됨" : "복사 실패");
    },
    top(item, ev, crew, pet) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      crew.toast(pet, "↑ 맨 위로");
    },
  };

  function hintFor(item) {
    if (item.action === "link") {
      try {
        const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(item.url) ? item.url : "https://" + item.url);
        return u.hostname.replace(/^www\./, "");
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
.pet{position:absolute;left:0;top:0;will-change:transform}
.hit{position:absolute;border-radius:45%}
.settled .hit{pointer-events:auto;cursor:pointer}
.badge{position:absolute;width:7px;height:7px;border-radius:50%;background:#A259FF;box-shadow:0 0 0 1.5px #fff}
.menu{position:absolute;pointer-events:auto;min-width:170px;max-width:260px;padding:5px;border-radius:12px;background:rgba(255,255,255,.98);
  color:#1d1d1f;box-shadow:0 10px 30px rgba(0,0,0,.2),0 0 0 1px rgba(0,0,0,.06);font:13px/1.3 ${FONT};animation:pop .12s ease-out}
.menu button{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;border:0;background:none;color:inherit;font:inherit;
  text-align:left;padding:7px 9px;border-radius:8px;cursor:pointer}
.menu button:hover,.menu button:focus-visible{background:#f0f0f4;outline:0}
.menu .dot{width:8px;height:8px;border-radius:50%;flex:none}
.menu .name{font-weight:600;white-space:nowrap}
.menu .hint{margin-left:auto;padding-left:12px;color:#8a8a90;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.menu .has{color:#A259FF}
.toast{position:absolute;transform:translate(-50%,-100%);background:#1d1d1f;color:#fff;font:600 12px/1 ${FONT};padding:6px 9px;border-radius:8px;
  white-space:nowrap;animation:pop .12s ease-out;box-shadow:0 4px 12px rgba(0,0,0,.2)}
@keyframes pop{from{opacity:0;transform:scale(.94)}}
.toast{animation:none}
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
    constructor(cfg, mouse, image) {
      this.cfg = cfg;
      this.size = clamp(+cfg.size || 36, 20, 72);
      this.mouse = mouse || null; // 화면(뷰포트) 좌표
      this.mv = { x: 0, y: 0 }; // 마우스 속도(px/s, 부드럽게)
      this.lastMove = performance.now();
      this.settled = false;
      this.anchor = null;
      this.visible = !!mouse;
      this.menu = null;
      this.panel = null;
      this.hasMemo = false;

      this.host = document.createElement("div");
      this.host.setAttribute("data-cursor-crew", "");
      this.host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;display:block";
      const sh = this.host.attachShadow({ mode: "open" });
      this.root = h("div", { class: "root" });
      this.root.style.setProperty("--op", clamp(+cfg.opacity || 0.9, 0.15, 1));
      sh.append(h("style", { text: CSS }), this.root);
      if (!this.visible) this.root.classList.add("hide");

      let skin = Skins.get(cfg.skin);
      if (skin.needsImage && !image) skin = Skins.get("slime");
      const n = clamp(Math.round(cfg.pets) || 1, 1, D.maxPets);
      const colors = cfg.petColors && cfg.petColors.length ? cfg.petColors : D.settings.petColors;
      this.pets = Array.from({ length: n }, (_, i) => this.makePet(skin, colors[i % colors.length], i, image));
      document.documentElement.appendChild(this.host);
      this.refreshMemo();

      // 페이지 이벤트(페이지 동작을 막지 않는다)
      this.on = [];
      const listen = (t, fn, o) => {
        addEventListener(t, fn, o);
        this.on.push([t, fn, o]);
      };
      listen("mousemove", (e) => this.onMove(e), { passive: true, capture: true });
      listen("pointerdown", (e) => this.onPageDown(e), { capture: true });
      listen("keydown", (e) => this.onKey(e), { capture: true });
      listen("blur", () => this.hide());
      this.onLeave = (e) => {
        if (!e.relatedTarget) this.hide();
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
      const body = skin.create(color, s, { image });
      const hit = h("div", { class: "hit" });
      Object.assign(hit.style, { left: -s * 0.55 + "px", top: -s * 1.05 + "px", width: s * 1.1 + "px", height: s * 1.1 + "px" });
      const el = h("div", { class: "pet" }, body.el, hit);
      const pet = { el, body, hit, color, i, x: 0, y: 0, vx: 0, vy: 0, k: i ? 60 : 85 };
      if (this.mouse) Object.assign(pet, this.restSpot(i, this.mouse));
      hit.addEventListener("pointerenter", () => this.openMenu(pet));
      hit.addEventListener("pointerleave", () => this.closeMenuSoon());
      hit.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      hit.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.menu && this.menu.pet === pet) this.closeMenu();
        else this.openMenu(pet);
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
      const x = p.x + fx * (s * 0.6 + 16 + i * (s + 6));
      const y = fy > 0 ? p.y + s + 8 : p.y - 10;
      return { x, y };
    }

    targetFor(pet, center, w) {
      const s = this.size;
      const rest = this.restSpot(pet.i, center);
      if (w <= 0) return rest;
      // 움직일 때: 앞사람(첫 펫은 마우스)의 뒤쪽으로 처진다
      const lead = pet.i === 0 ? { x: center.x, y: center.y + s * 0.5, vx: this.mv.x, vy: this.mv.y } : this.pets[pet.i - 1];
      const L = Math.hypot(lead.vx, lead.vy) || 1;
      const back = (pet.i === 0 ? s * 0.9 + 24 : s + 4) / L;
      const behind = { x: lead.x - lead.vx * back, y: lead.y - lead.vy * back + (pet.i === 0 ? s * 0.3 : 0) };
      return { x: rest.x + (behind.x - rest.x) * w, y: rest.y + (behind.y - rest.y) * w };
    }

    get reach() {
      return 250 + this.pets.length * (this.size + 6);
    }

    // ------------------------------------------------------------ 이벤트
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
      const first = !this.mouse;
      this.mouse = p;
      if (first) for (const pet of this.pets) Object.assign(pet, this.restSpot(pet.i, p));
      this.show();
      this.root.classList.remove("dim");
      if (this.settled) {
        const far = Math.hypot(p.x - this.anchor.x, p.y - this.anchor.y) > this.reach;
        if (far && !this.panel) this.unsettle();
      } else {
        this.lastMove = now;
      }
      this.wake();
    }

    onPageDown(e) {
      if (e.composedPath().includes(this.host)) return;
      if (this.panel) this.closeMemo();
      if (this.menu) this.closeMenu();
    }

    onKey(e) {
      if (e.composedPath().includes(this.host)) return;
      if (e.key === "Escape" && (this.panel || this.menu)) {
        this.closeMemo();
        this.closeMenu();
        return;
      }
      // 페이지에서 글을 쓰는 중이면 방해하지 않게 흐려진다
      if (isEditable(e.target) || isEditable(document.activeElement)) {
        this.root.classList.add("dim");
        if (this.settled && !this.panel) this.unsettle();
      }
    }

    show() {
      if (this.visible) return;
      this.visible = true;
      this.root.classList.toggle("hide", !!document.fullscreenElement);
    }
    hide() {
      if (this.panel) return;
      this.visible = false;
      this.root.classList.add("hide");
      if (this.settled) this.unsettle();
    }

    settle() {
      this.settled = true;
      this.anchor = { ...this.mouse };
      this.mv.x = this.mv.y = 0;
      this.root.classList.add("settled");
    }
    unsettle() {
      this.settled = false;
      this.root.classList.remove("settled");
      this.closeMenu();
      this.lastMove = performance.now();
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
      // 마우스가 멈추면 속도도 0 으로 가라앉는다
      if (now - this.lastMove > 60) {
        const d = Math.min(1, dt * 8);
        this.mv.x -= this.mv.x * d;
        this.mv.y -= this.mv.y * d;
      }
      if (!this.settled && this.visible && now - this.lastMove > this.cfg.settleMs) this.settle();

      const center = this.settled ? this.anchor : this.mouse;
      const w = this.settled ? 0 : clamp((Math.hypot(this.mv.x, this.mv.y) - 60) / 450, 0, 1);
      const s = this.size;
      for (const pet of this.pets) {
        const tg = this.targetFor(pet, center, w);
        const k = this.settled ? 140 : pet.k;
        const c = 2 * Math.sqrt(k) * 0.8;
        let ax = (tg.x - pet.x) * k - pet.vx * c;
        let ay = (tg.y - pet.y) * k - pet.vy * c;
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
        const hover = !!(this.menu && this.menu.pet === pet);
        pet.body.update({ t: now / 1000, dt, vx: pet.vx, vy: pet.vy, speed: Math.hypot(pet.vx, pet.vy), hover });
        pet.el.style.transform = `translate(${pet.x.toFixed(1)}px,${pet.y.toFixed(1)}px)`;
      }
      if (this.menu) this.placeMenu();
      // 숨쉬기·깜빡임 애니메이션 때문에 보이는 동안은 계속 돈다(펫 1~3마리라 가볍다)
      if (this.visible) this.wake();
    }

    // ------------------------------------------------------------ 메뉴
    openMenu(pet) {
      if (!this.settled || this.panel) return;
      clearTimeout(this.menuT);
      if (this.menu && this.menu.pet === pet) return;
      this.closeMenu();
      const el = h("div", { class: "menu", role: "menu" });
      for (const item of this.cfg.crew.slice(0, D.maxCrew)) {
        const hint = h("span", { class: "hint", text: item.action === "memo" && this.hasMemo ? "메모 있음 •" : hintFor(item) });
        if (item.action === "memo" && this.hasMemo) hint.classList.add("has");
        const dot = h("span", { class: "dot" });
        dot.style.background = item.color;
        const b = h("button", { role: "menuitem" }, dot, h("span", { class: "name", text: item.name || "기능" }), hint);
        b.addEventListener("pointerdown", (e) => e.stopPropagation());
        b.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const fn = ACTIONS[item.action];
          this.closeMenu();
          if (fn) fn(item, e, this, pet);
        });
        el.appendChild(b);
      }
      el.addEventListener("pointerenter", () => clearTimeout(this.menuT));
      el.addEventListener("pointerleave", () => this.closeMenuSoon());
      this.root.appendChild(el);
      this.menu = { el, pet };
      this.root.classList.add("active");
      this.placeMenu();
    }

    placeMenu() {
      const { el, pet } = this.menu;
      const s = this.size;
      const vw = document.documentElement.clientWidth;
      const w = el.offsetWidth;
      const hgt = el.offsetHeight;
      let x = pet.x + s * 0.6 + 6;
      if (x + w > vw - 8) x = pet.x - s * 0.6 - 6 - w;
      const y = clamp(pet.y - s - 4, 8, innerHeight - hgt - 8);
      el.style.left = Math.max(8, x) + "px";
      el.style.top = y + "px";
    }

    closeMenuSoon() {
      clearTimeout(this.menuT);
      this.menuT = setTimeout(() => this.closeMenu(), 450);
    }
    closeMenu() {
      clearTimeout(this.menuT);
      if (!this.menu) return;
      this.menu.el.remove();
      this.menu = null;
      if (!this.panel) this.root.classList.remove("active");
    }

    toast(pet, text) {
      const t = h("div", { class: "toast", text });
      t.style.left = pet.x + "px";
      t.style.top = pet.y - this.size - 6 + "px";
      this.root.appendChild(t);
      setTimeout(() => t.remove(), 1300);
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

    async openMemo(pet, item) {
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
      const s = this.size;
      p.style.left = clamp(pet.x + s * 0.6 + 6, 8, vw - 308) + "px";
      p.style.top = clamp(pet.y - s, 8, innerHeight - 250) + "px";
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
      p.querySelector(".all").addEventListener("click", () => chrome.runtime.sendMessage({ type: "crew:options" }));
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
      if (!this.menu) this.root.classList.remove("active");
    }

    destroy() {
      this.dead = true;
      cancelAnimationFrame(this.raf);
      this.closeMemo();
      this.closeMenu();
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
    let image = null;
    if (on && Skins.get(cfg.skin).needsImage) image = (await store.local.get("skinImage")).skinImage || null;
    if (crew) {
      lastMouse = crew.mouse || lastMouse;
      crew.destroy();
      crew = null;
    }
    if (on) crew = new Crew(cfg, lastMouse, image);
  }

  store.onChanged.addListener((changes, area) => {
    if (area === "sync" || (area === "local" && changes.skinImage)) apply();
    else if (area === "local" && crew && changes[memoKey()]) crew.refreshMemo();
  });
  apply();
})();
