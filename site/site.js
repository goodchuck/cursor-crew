// 언어 고르기(브라우저 언어 → 버튼으로 바꾸면 기억) + 마우스를 따라다니는 슬라임 데모
(() => {
  const saved = localStorage.getItem("crew-lang");
  const lang = saved || (/^ko\b/i.test(navigator.language) ? "ko" : "en");
  const setLang = (l) => {
    document.documentElement.lang = l;
    document.querySelectorAll(".lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.set === l)));
    const t = document.querySelector(`meta[name="title-${l}"]`);
    if (t) document.title = t.content;
  };
  setLang(lang);
  document.querySelectorAll(".lang button").forEach((b) =>
    b.addEventListener("click", () => {
      localStorage.setItem("crew-lang", b.dataset.set);
      setLang(b.dataset.set);
    }),
  );

  // ---------------------------------------------------------------- 데모 슬라임(확장의 도트 슬라임을 간단히 옮김)
  const host = document.getElementById("crew");
  if (!host || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const N = 16;
  const SHAPES = { rest: [6.6, 11], squash: [7.5, 9.2], stretch: [5.6, 13.5] };
  function grid(shape, look, blink) {
    const [rx, ry] = SHAPES[shape];
    const cx = 8, base = 15;
    const inside = (x, y) => {
      if (x < 0 || y < 0 || x >= N || y > base) return false;
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - (base + 1)) / ry;
      return dx * dx + dy * dy <= 1;
    };
    const g = [];
    let top = N;
    for (let y = 0; y < N; y++) {
      g.push([]);
      for (let x = 0; x < N; x++) {
        if (!inside(x, y)) { g[y].push("."); continue; }
        top = Math.min(top, y);
        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        g[y].push(edge ? "o" : y === base - 1 ? "d" : "c");
      }
    }
    const set = (x, y, ch) => { if (g[y] && g[y][x] && g[y][x] !== "." && g[y][x] !== "o") g[y][x] = ch; };
    const hx = Math.round(cx - rx * 0.5);
    set(hx, top + 2, "l"); set(hx + 1, top + 2, "l"); set(hx, top + 3, "l");
    const ey = Math.round(base + 1 - ry * 0.48);
    for (const ex of [Math.round(cx - 2.5 + look), Math.round(cx + 1.5 + look)]) {
      if (blink) set(ex, ey + 1, "k"); else { set(ex, ey, "k"); set(ex, ey + 1, "k"); }
    }
    set(Math.round(cx - 4 + look), ey + 2, "p");
    set(Math.round(cx + 3 + look), ey + 2, "p");
    return g;
  }
  const shade = (hex, f) => {
    const n = parseInt(hex.slice(1), 16), t = f < 0 ? 0 : 255, p = Math.abs(f);
    return `rgb(${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (t - v) * p)).join(",")})`;
  };
  const SIZE = 40;
  const pets = ["#4A9DF8", "#F26B5B", "#5BD16A"].map((color, i) => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = N;
    cv.style.width = cv.style.height = SIZE + "px";
    host.appendChild(cv);
    const pal = { o: shade(color, -0.62), c: color, d: shade(color, -0.18), l: shade(color, 0.7), k: "#1d1b24", p: "#ff9db5" };
    return { cv, ctx: cv.getContext("2d"), pal, i, x: innerWidth / 2 + i * 46, y: innerHeight * 0.75, vx: 0, vy: 0, phase: Math.random() * 4, key: "", blinkAt: 2 + Math.random() * 3 };
  });
  let mouse = { x: innerWidth / 2, y: innerHeight * 0.7 };
  addEventListener("mousemove", (e) => (mouse = { x: e.clientX, y: e.clientY }), { passive: true });
  let last = 0;
  function tick(now) {
    const dt = Math.min(0.033, (now - (last || now)) / 1000);
    last = now;
    const t = now / 1000;
    for (const p of pets) {
      // 커서 오른쪽 아래에 한 줄로(확장의 '한 줄 정렬'과 같은 자리)
      const tx = mouse.x + SIZE * 0.6 + 16 + p.i * (SIZE + 6), ty = mouse.y + SIZE + 8;
      const k = 60, c = 2 * Math.sqrt(k) * 0.8;
      p.vx += ((tx - p.x) * k - p.vx * c) * dt;
      p.vy += ((ty - p.y) * k - p.vy * c) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const speed = Math.hypot(p.vx, p.vy);
      let shape = "rest", lift = 0;
      if (speed > 35) {
        p.phase += dt * 8;
        const f = Math.floor(p.phase) % 4;
        shape = ["squash", "stretch", "rest", "rest"][f];
        lift = [0, 0.22, 0.14, 0][f];
      } else {
        p.phase += dt * 1.5;
        shape = Math.floor(p.phase) % 2 ? "squash" : "rest";
      }
      const look = Math.abs(p.vx) > 60 ? Math.sign(p.vx) : 0;
      if (t > p.blinkAt + 0.13) p.blinkAt = t + 2 + Math.random() * 3;
      const blink = t > p.blinkAt;
      const key = shape + look + blink;
      if (key !== p.key) {
        p.key = key;
        const g = grid(shape, look, blink);
        p.ctx.clearRect(0, 0, N, N);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x] !== ".") { p.ctx.fillStyle = p.pal[g[y][x]]; p.ctx.fillRect(x, y, 1, 1); }
      }
      p.cv.style.transform = `translate(${(p.x - SIZE / 2).toFixed(1)}px,${(p.y - SIZE - lift * SIZE).toFixed(1)}px)`;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
