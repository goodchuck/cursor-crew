/*
 * Cursor Crew: 콘텐츠 스크립트
 *
 * 이름표를 단 커서들이 내 마우스를 따라다닌다.
 *  - 움직이는 동안: 마우스 오른쪽 아래(화면 끝이면 반대쪽)에 부채꼴로 흩어져 스프링처럼 따라옴. 클릭은 전부 페이지로 통과.
 *  - 마우스가 settleMs 동안 멈추면: 커서들이 제자리에 선다(잡힘). 그 근처에서 움직이는 동안은 따라오지 않으므로
 *    원하는 커서로 가서 클릭하면 그 커서의 기능이 실행된다. 멀리 벗어나면 다시 따라온다.
 */
(() => {
  "use strict";
  if (window.top !== window || globalThis.__cursorCrew) return;
  globalThis.__cursorCrew = true;

  const D = globalThis.CrewDefaults;
  const store = chrome.storage;

  // ---------------------------------------------------------------- 기능들
  // m: 커서(멤버), ev: 클릭 이벤트, crew: Crew 인스턴스
  const ACTIONS = {
    link(m, ev) {
      if (!m.url) return crewFlash(m, "URL 없음 · 옵션에서 설정");
      chrome.runtime.sendMessage({ type: "crew:open", url: m.url, sameTab: ev.shiftKey, background: ev.ctrlKey || ev.metaKey }, (res) => {
        if (chrome.runtime.lastError || !res || !res.ok) crewFlash(m, "열 수 없는 주소");
      });
      crewFlash(m, ev.shiftKey ? "↗ 이 탭에서 여는 중" : "↗ 여는 중");
    },
    memo(m, ev, crew) {
      crew.toggleMemo(m);
    },
    async copy(m) {
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
      crewFlash(m, ok ? "✓ URL 복사됨" : "복사 실패");
    },
    top(m) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      crewFlash(m, "↑ 맨 위로");
    },
  };

  function hintFor(m) {
    if (m.action === "link") {
      try {
        const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(m.url) ? m.url : "https://" + m.url);
        return "↗ " + u.hostname.replace(/^www\./, "");
      } catch (_) {
        return "↗ 링크 열기";
      }
    }
    const a = D.actions[m.action];
    return a ? a.label : m.action;
  }

  let crewFlash = () => {};

  // ---------------------------------------------------------------- 유틸
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const memoKey = () => "memo:" + location.origin + location.pathname;
  const isEditable = (el) => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

  const ARROW = "M1 1L1 17L5.4 13.1L8.5 20.2L11.4 19L8.4 12H14.2Z";

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
  function arrowSvg(color) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 18 22");
    const path = document.createElementNS(NS, "path");
    for (const [k, v] of Object.entries({ d: ARROW, fill: color, stroke: "#fff", "stroke-width": "1.4", "stroke-linejoin": "round" })) path.setAttribute(k, v);
    svg.appendChild(path);
    return svg;
  }

  const CSS = `
:host{all:initial}
.root{position:fixed;inset:0;pointer-events:none;opacity:1;transition:opacity .25s ease}
.root.hide{opacity:0}
.root.dim{opacity:.2}
.m{position:absolute;left:0;top:0;will-change:transform}
.m svg{position:absolute;left:-1px;top:-1px;width:18px;height:22px;overflow:visible;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.28))}
.tag{position:absolute;left:12px;top:17px;display:flex;align-items:center;gap:6px;background:var(--c);color:#fff;
  font:600 12px/1.15 system-ui,-apple-system,"Segoe UI","Apple SD Gothic Neo","Malgun Gothic",sans-serif;letter-spacing:0;
  padding:4px 7px;border-radius:3px 10px 10px 10px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.18);
  transform-origin:0 0;transition:transform .15s ease,box-shadow .15s ease;opacity:.92}
.hint{display:none;font-weight:500;opacity:.92}
.dot{width:6px;height:6px;border-radius:50%;background:#fff;box-shadow:0 0 0 1.5px rgba(0,0,0,.12)}
.settled .tag{opacity:1}
.settled .m>*{pointer-events:auto;cursor:pointer}
.settled .m:hover .tag,.m.flash .tag{transform:scale(1.1);box-shadow:0 4px 14px rgba(0,0,0,.25)}
.settled .m:hover .hint,.m.flash .hint{display:inline}
.m.press .tag{transform:scale(.95)}
.panel{position:absolute;width:300px;pointer-events:auto;background:#fff;color:#1d1d1f;border-radius:12px;
  box-shadow:0 12px 40px rgba(0,0,0,.22),0 0 0 1px rgba(0,0,0,.06);overflow:hidden;
  font:13px/1.45 system-ui,-apple-system,"Segoe UI","Apple SD Gothic Neo","Malgun Gothic",sans-serif}
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
    constructor(cfg, mouse) {
      this.cfg = cfg;
      this.mouse = mouse || null; // 화면(뷰포트) 좌표
      this.lastMove = performance.now();
      this.settled = false;
      this.anchor = null;
      this.visible = !!mouse;
      this.panel = null;

      this.host = document.createElement("div");
      this.host.setAttribute("data-cursor-crew", "");
      this.host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;display:block";
      const sh = this.host.attachShadow({ mode: "open" });
      this.root = h("div", { class: "root" });
      sh.append(h("style", { text: CSS }), this.root);
      if (!this.visible) this.root.classList.add("hide");

      const n = cfg.crew.length;
      this.members = cfg.crew.slice(0, D.maxCrew).map((c, i) => this.makeMember(c, i, n));
      document.documentElement.appendChild(this.host);
      this.refreshMemoDot();

      crewFlash = (m, text) => this.flash(m, text);

      // 페이지 이벤트(전부 passive, 페이지 동작을 막지 않는다)
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

    makeMember(c, i, n) {
      const el = h("div", { class: "m" }, arrowSvg(c.color), h("div", { class: "tag" }, h("span", { class: "name", text: c.name || "커서" }), h("span", { class: "hint" })));
      el.style.setProperty("--c", c.color);
      const m = Object.assign({}, c, {
        el, i, x: 0, y: 0, vx: 0, vy: 0,
        k: 55 + Math.random() * 70, // 스프링 세기: 커서마다 달라서 줄지어 따라온다
        phase: Math.random() * 6.28,
        hintEl: el.querySelector(".hint"),
      });
      m.hintEl.textContent = hintFor(m);
      if (this.mouse) {
        m.x = this.mouse.x;
        m.y = this.mouse.y;
      }
      // 클릭: 페이지로 이벤트가 새지 않게 여기서 멈춘다
      el.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.add("press");
      });
      el.addEventListener("pointerup", () => el.classList.remove("press"));
      el.addEventListener("pointerleave", () => el.classList.remove("press"));
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const fn = ACTIONS[m.action];
        if (fn) fn(m, e, this);
      });
      this.root.appendChild(el);
      return m;
    }

    // 자리: 마우스 오른쪽 아래로 비스듬히 한 줄씩(이름표끼리 겹치지 않게 30px 간격).
    // 화면 오른쪽·아래 끝에 가까우면 반대쪽으로 뒤집는다.
    slot(m, p) {
      const n = this.members.length;
      const vw = document.documentElement.clientWidth;
      const vh = innerHeight;
      const fx = p.x > vw - 200 ? -1 : 1;
      const fy = p.y > vh - (n * 30 + 60) ? -1 : 1;
      const x = fx > 0 ? p.x + 24 + m.i * 9 : p.x - 110 - m.i * 9;
      const y = fy > 0 ? p.y + 20 + m.i * 30 : p.y - 46 - m.i * 30;
      return { x, y };
    }
    get reach() {
      return this.members.length * 30 + 120; // 잡힌 상태를 유지하는 반경
    }

    // ------------------------------------------------------------ 이벤트
    onMove(e) {
      const p = { x: e.clientX, y: e.clientY };
      const first = !this.mouse;
      this.mouse = p;
      if (first) for (const m of this.members) (m.x = p.x), (m.y = p.y);
      this.show();
      this.root.classList.remove("dim");
      if (this.settled) {
        // 잡힌 상태: 근처(부채꼴 반경 + 여유)에서 움직이면 그대로, 벗어나면 다시 따라간다
        const far = Math.hypot(p.x - this.anchor.x, p.y - this.anchor.y) > this.reach;
        if (far && !this.panel) this.unsettle();
      } else {
        this.lastMove = performance.now();
      }
      this.wake();
    }

    onPageDown(e) {
      // 메모장 바깥을 누르면 메모장을 닫는다
      if (this.panel && !e.composedPath().includes(this.host)) this.closeMemo();
    }

    onKey(e) {
      if (e.composedPath().includes(this.host)) return;
      if (e.key === "Escape" && this.panel) return this.closeMemo();
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
      this.root.classList.add("settled");
    }
    unsettle() {
      this.settled = false;
      this.root.classList.remove("settled");
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

      if (!this.settled && this.visible && now - this.lastMove > this.cfg.settleMs) this.settle();
      const center = this.settled ? this.anchor : this.mouse;
      const t = now / 1000;
      let moving = false;

      for (const m of this.members) {
        const s = this.slot(m, center);
        // 따라올 때만 살짝 흔들린다
        const wob = this.settled ? 0 : 3;
        const tx = s.x + Math.sin(t * 1.3 + m.phase) * wob;
        const ty = s.y + Math.cos(t * 1.1 + m.phase) * wob;
        const k = this.settled ? 160 : m.k;
        const c = 2 * Math.sqrt(k) * 0.85;
        let ax = (tx - m.x) * k - m.vx * c;
        let ay = (ty - m.y) * k - m.vy * c;
        // 서로 겹치지 않게 밀어낸다
        for (const o of this.members) {
          if (o === m) continue;
          const dx = m.x - o.x;
          const dy = m.y - o.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < 30) {
            ax += (dx / d) * (30 - d) * 60;
            ay += (dy / d) * (30 - d) * 60;
          }
        }
        m.vx += ax * dt;
        m.vy += ay * dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (Math.abs(m.vx) + Math.abs(m.vy) > 2 || Math.hypot(tx - m.x, ty - m.y) > 0.5) moving = true;
        m.el.style.transform = `translate(${m.x.toFixed(1)}px,${m.y.toFixed(1)}px)`;
      }
      // 잡힌 채 다 멈췄으면 루프를 쉰다(다음 마우스 이동 때 다시 깨어남)
      if ((moving || !this.settled) && this.visible) this.wake();
    }

    // ------------------------------------------------------------ 표시
    flash(m, text) {
      m.hintEl.textContent = text;
      m.el.classList.add("flash");
      clearTimeout(m.flashT);
      m.flashT = setTimeout(() => {
        m.el.classList.remove("flash");
        m.hintEl.textContent = hintFor(m);
      }, 1300);
    }

    async refreshMemoDot() {
      const key = memoKey();
      const got = await store.local.get(key);
      const has = !!(got[key] && got[key].text && got[key].text.trim());
      for (const m of this.members) {
        if (m.action !== "memo") continue;
        let dot = m.el.querySelector(".dot");
        if (has && !dot) {
          dot = document.createElement("span");
          dot.className = "dot";
          dot.title = "이 페이지에 메모가 있어요";
          m.el.querySelector(".tag").appendChild(dot);
        } else if (!has && dot) dot.remove();
        m.hintEl.textContent = has ? "✎ 메모 보기" : hintFor(m);
      }
    }

    // ------------------------------------------------------------ 메모
    async toggleMemo(m) {
      if (this.panel) return this.closeMemo();
      const key = memoKey();
      const got = await store.local.get(key);
      const ta = h("textarea", { placeholder: "이 페이지에 남길 메모… (자동 저장)" });
      const st = h("span", { class: "st", text: "자동 저장" });
      const p = h(
        "div",
        { class: "panel" },
        h("div", { class: "ph" }, h("b", { text: m.name || "메모" }), h("span", { class: "where", text: location.hostname + location.pathname }), h("button", { class: "x", title: "닫기 (Esc)", text: "✕" })),
        ta,
        h("div", { class: "pf" }, st, h("button", { class: "all", text: "모든 메모 보기" }))
      );
      p.style.setProperty("--c", m.color);
      ta.value = (got[key] && got[key].text) || "";
      // 위치: 커서 옆, 화면 밖으로 나가지 않게
      const vw = document.documentElement.clientWidth;
      p.style.left = clamp(m.x + 14, 8, vw - 308) + "px";
      p.style.top = clamp(m.y + 44, 8, innerHeight - 250) + "px";
      // 메모장에서 치는 키가 페이지 단축키(예: 유튜브 k, j)로 새지 않게
      for (const t of ["keydown", "keyup", "keypress"]) p.addEventListener(t, (e) => {
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
        this.refreshMemoDot();
      };
      ta.addEventListener("input", () => {
        st.textContent = "저장 중…";
        clearTimeout(timer);
        timer = setTimeout(save, 350);
      });
      p.querySelector(".x").addEventListener("click", () => this.closeMemo());
      p.querySelector(".all").addEventListener("click", () => chrome.runtime.sendMessage({ type: "crew:options", hash: "memos" }));
      this.root.appendChild(p);
      this.panel = { el: p, flush: () => (clearTimeout(timer), save()) };
      ta.focus();
    }

    closeMemo() {
      if (!this.panel) return;
      const pn = this.panel;
      this.panel = null;
      pn.flush();
      pn.el.remove();
    }

    destroy() {
      this.dead = true;
      cancelAnimationFrame(this.raf);
      this.closeMemo();
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
    const h = location.hostname;
    return (list || []).some((s) => {
      s = String(s).trim().toLowerCase().replace(/^\*\./, "");
      return s && (h === s || h.endsWith("." + s));
    });
  }

  async function apply() {
    const cfg = await store.sync.get(D.settings);
    const on = cfg.enabled && cfg.crew && cfg.crew.length && !excluded(cfg.excluded);
    if (crew) {
      lastMouse = crew.mouse || lastMouse;
      crew.destroy();
      crew = null;
    }
    if (on) crew = new Crew(cfg, lastMouse);
  }

  store.onChanged.addListener((changes, area) => {
    if (area === "sync") apply();
    else if (area === "local" && crew && changes[memoKey()]) crew.refreshMemoDot();
  });
  apply();
})();
