// 설정 페이지: 바꾸는 즉시 chrome.storage.sync 에 저장 → 열려 있는 탭의 커서들도 바로 바뀐다.
const D = globalThis.CrewDefaults;
const $ = (s) => document.querySelector(s);

let state = null;
let saveTimer = 0;

function flashSaved(text = "저장됨 ✓") {
  const el = $("#saved");
  el.textContent = text;
  el.style.opacity = 1;
  clearTimeout(flashSaved.t);
  flashSaved.t = setTimeout(() => (el.style.opacity = 0), 1200);
}

function validUrl(u) {
  u = String(u || "").trim();
  if (!u) return false;
  try {
    new URL(/^[a-z][a-z0-9+.-]*:/i.test(u) ? u : "https://" + u);
    return /\./.test(u) || /^[a-z]+:/i.test(u);
  } catch (_) {
    return false;
  }
}

function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await chrome.storage.sync.set(state);
    flashSaved();
  }, 250);
}

// ------------------------------------------------------------ 커서 목록
function renderCrew() {
  const box = $("#crew");
  box.innerHTML = "";
  state.crew.forEach((m, i) => {
    const row = $("#rowTpl").content.firstElementChild.cloneNode(true);
    const color = row.querySelector(".color");
    const name = row.querySelector(".name");
    const action = row.querySelector(".action");
    const url = row.querySelector(".url");
    for (const [k, a] of Object.entries(D.actions)) action.add(new Option(a.label, k));
    color.value = m.color;
    name.value = m.name;
    action.value = m.action;
    url.value = m.url || "";
    const syncUrl = () => {
      const need = D.actions[m.action] && D.actions[m.action].needsUrl;
      url.hidden = !need;
      url.classList.toggle("bad", need && !validUrl(m.url));
    };
    syncUrl();
    color.addEventListener("input", () => ((m.color = color.value), save()));
    name.addEventListener("input", () => ((m.name = name.value.trim() || "커서"), save()));
    action.addEventListener("change", () => {
      m.action = action.value;
      syncUrl();
      save();
    });
    url.addEventListener("input", () => {
      m.url = url.value.trim();
      syncUrl();
      if (validUrl(m.url)) save();
    });
    const move = (d) => {
      const j = i + d;
      if (j < 0 || j >= state.crew.length) return;
      [state.crew[i], state.crew[j]] = [state.crew[j], state.crew[i]];
      renderCrew();
      save();
    };
    row.querySelector(".up").disabled = i === 0;
    row.querySelector(".down").disabled = i === state.crew.length - 1;
    row.querySelector(".up").addEventListener("click", () => move(-1));
    row.querySelector(".down").addEventListener("click", () => move(1));
    row.querySelector(".del").addEventListener("click", () => {
      state.crew.splice(i, 1);
      renderCrew();
      save();
    });
    box.appendChild(row);
  });
  $("#add").disabled = state.crew.length >= D.maxCrew;
}

$("#add").addEventListener("click", () => {
  const used = new Set(state.crew.map((m) => m.color.toUpperCase()));
  const color = D.colors.find((c) => !used.has(c.toUpperCase())) || D.colors[state.crew.length % D.colors.length];
  state.crew.push({ name: "새 링크", color, action: "link", url: "" });
  renderCrew();
  save();
  const rows = document.querySelectorAll(".member .name");
  rows[rows.length - 1].select();
});

// ------------------------------------------------------------ 모양(스킨)
const Skins = globalThis.CrewSkins;
let previews = [];

function renderSkins() {
  const box = $("#skins");
  box.innerHTML = "";
  previews = [];
  for (const [id, skin] of Object.entries(Skins.list)) {
    const card = document.createElement("div");
    card.className = "skin";
    card.setAttribute("role", "radio");
    card.tabIndex = 0;
    card.setAttribute("aria-checked", String(state.skin === id));
    const stage = document.createElement("div");
    stage.className = "stage";
    const holder = document.createElement("div");
    holder.style.cssText = "position:absolute;left:50px;top:58px";
    const color = (state.petColors && state.petColors[0]) || D.settings.petColors[0];
    const body = skin.create(color, 40, { image: images.find(Boolean), pixelated: state.imagePixelated });
    holder.appendChild(body.el);
    stage.appendChild(holder);
    const label = document.createElement("span");
    label.textContent = skin.label + (skin.needsImage && !images.some(Boolean) ? " (아래에 올리기)" : "");
    card.append(stage, label);
    const pick = () => {
      state.skin = id;
      renderSkins();
      renderTiles();
      save();
      if (skin.needsImage && !images.some(Boolean)) showMsg("아래 칸에 이미지나 GIF를 올려 주세요.");
    };
    card.addEventListener("click", pick);
    card.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), pick()));
    box.appendChild(card);
    previews.push(body);
  }
}

// 미리보기: 2초 걷기(통통) ↔ 2초 쉬기
let lastT = 0;
function animatePreviews(now) {
  const dt = Math.min(0.05, (now - (lastT || now)) / 1000);
  lastT = now;
  const t = now / 1000;
  const moving = t % 4 < 2;
  for (const b of previews) b.update({ t, dt, vx: moving ? 90 : 0, vy: 0, speed: moving ? 90 : 0, hover: false });
  requestAnimationFrame(animatePreviews);
}

function renderPetColors() {
  const box = $("#petColors");
  box.innerHTML = "";
  for (let i = 0; i < state.pets; i++) {
    const inp = document.createElement("input");
    inp.type = "color";
    inp.value = state.petColors[i] || D.settings.petColors[i % D.settings.petColors.length];
    inp.setAttribute("aria-label", `펫 ${i + 1} 색`);
    inp.addEventListener("input", () => {
      state.petColors[i] = inp.value;
      if (i === 0) renderSkins();
      save();
    });
    box.appendChild(inp);
  }
}

function bindRange(id, fmt, onChange) {
  const el = $("#" + id);
  const out = $("#" + id + "Out");
  el.value = state[id];
  out.textContent = fmt(state[id]);
  el.addEventListener("input", () => {
    state[id] = +el.value;
    out.textContent = fmt(state[id]);
    if (onChange) onChange();
    save();
  });
}

// ------------------------------------------------------------ 내 이미지·GIF (펫마다 한 장)
// 움직이는 이미지(GIF·움직이는 WebP·APNG)는 원본 그대로 저장해야 움직임이 남는다.
// 정지 이미지는 128px보다 크면 줄여서 PNG 로 저장한다. chrome.storage.local 키: skinImage0~2
const MAX_BYTES = 2 * 1024 * 1024;
let images = [null, null, null];

function findAscii(bytes, text, limit) {
  const t = [...text].map((c) => c.charCodeAt(0));
  const end = Math.min(bytes.length, limit || bytes.length) - t.length;
  outer: for (let i = 0; i <= end; i++) {
    for (let j = 0; j < t.length; j++) if (bytes[i + j] !== t[j]) continue outer;
    return i;
  }
  return -1;
}

function isAnimated(type, bytes) {
  if (type === "image/gif") return true; // GIF 는 늘 원본 그대로(정지 GIF 도 손해 없음)
  if (type === "image/webp") return findAscii(bytes, "ANIM", 4096) >= 0;
  if (type === "image/png" || type === "image/apng") {
    const idat = findAscii(bytes, "IDAT");
    return findAscii(bytes, "acTL", idat > 0 ? idat : undefined) >= 0;
  }
  return false;
}

const readAs = (file, how) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(r.error);
    r[how](file);
  });

function loadImg(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("이미지를 읽을 수 없어요"));
    img.src = url;
  });
}

function showMsg(text, kind) {
  const el = $("#imageMsg");
  el.textContent = text;
  el.className = "msg " + (kind || "");
}

async function setImage(i, file) {
  if (!file) return;
  if (!/^image\//.test(file.type)) return showMsg("이미지 파일만 쓸 수 있어요 (GIF·PNG·JPG·WebP).", "err");
  if (file.size > MAX_BYTES) {
    return showMsg(`파일이 ${(file.size / 1048576).toFixed(1)}MB예요. 2MB 이하로 줄여서 올려 주세요. GIF는 가로세로나 프레임 수를 줄이면 많이 작아져요.`, "err");
  }
  try {
    const bytes = new Uint8Array(await readAs(file, "readAsArrayBuffer"));
    let url = await readAs(file, "readAsDataURL");
    const img = await loadImg(url);
    const animated = isAnimated(file.type, bytes);
    if (!animated && Math.max(img.width, img.height) > 128) {
      const k = 128 / Math.max(img.width, img.height);
      const cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.round(img.width * k));
      cv.height = Math.max(1, Math.round(img.height * k));
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      url = cv.toDataURL("image/png");
    }
    // 작은 그림(64px 이하)은 대개 도트라서 선명하게 켜 준다
    if (Math.max(img.width, img.height) <= 64 && !state.imagePixelated) {
      state.imagePixelated = true;
      $("#imagePixelated").checked = true;
    }
    images[i] = url;
    await chrome.storage.local.set({ ["skinImage" + i]: url });
    await chrome.storage.local.remove("skinImage"); // 예전 버전의 키
    state.skin = "image"; // 이미지를 올리면 바로 그 모양으로
    save();
    showMsg(`펫 ${i + 1} 이미지를 바꿨어요 (${img.width}×${img.height}${animated ? ", 움직이는 이미지" : ""}).`, "ok");
  } catch (err) {
    showMsg("이미지를 읽지 못했어요: " + err.message, "err");
  }
  renderTiles();
  renderSkins();
}

async function clearImage(i) {
  images[i] = null;
  await chrome.storage.local.remove("skinImage" + i);
  if (!images.some(Boolean) && state.skin === "image") {
    state.skin = "slime";
    save();
  }
  showMsg(`펫 ${i + 1} 이미지를 지웠어요.`);
  renderTiles();
  renderSkins();
}

function renderTiles() {
  const box = $("#imageTiles");
  box.innerHTML = "";
  $("#imageBox").classList.toggle("on", state.skin === "image");
  for (let i = 0; i < state.pets; i++) {
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.tabIndex = 0;
    tile.setAttribute("role", "button");
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.addEventListener("change", () => setImage(i, input.files[0]));
    tile.appendChild(input);
    if (images[i]) {
      const img = document.createElement("img");
      img.src = images[i];
      img.alt = `펫 ${i + 1} 이미지`;
      if (state.imagePixelated) img.className = "px";
      const x = document.createElement("button");
      x.className = "x";
      x.textContent = "✕";
      x.title = "이 이미지 지우기";
      x.addEventListener("click", (e) => {
        e.stopPropagation();
        clearImage(i);
      });
      tile.append(img, document.createTextNode(`펫 ${i + 1}`), x);
      tile.setAttribute("aria-label", `펫 ${i + 1} 이미지 바꾸기`);
    } else {
      const plus = document.createElement("span");
      plus.className = "plus";
      plus.textContent = "+";
      const note = i > 0 && images[0] ? "비우면 펫 1 그림" : "끌어다 놓기";
      tile.append(plus, document.createTextNode(`펫 ${i + 1}`), document.createElement("br"), document.createTextNode(note));
      tile.setAttribute("aria-label", `펫 ${i + 1} 이미지 고르기`);
    }
    tile.addEventListener("click", () => input.click());
    tile.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), input.click()));
    tile.addEventListener("dragover", (e) => {
      e.preventDefault();
      tile.classList.add("drag");
    });
    tile.addEventListener("dragleave", () => tile.classList.remove("drag"));
    tile.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      tile.classList.remove("drag");
      setImage(i, e.dataTransfer.files[0]);
    });
    box.appendChild(tile);
  }
}

// 칸 밖에 떨어뜨려도 브라우저가 파일을 열어 버리지 않게(펫 1 칸으로 받는다)
addEventListener("dragover", (e) => e.preventDefault());
addEventListener("drop", (e) => {
  e.preventDefault();
  if (e.dataTransfer.files[0]) setImage(0, e.dataTransfer.files[0]);
});

// ------------------------------------------------------------ 메모 목록
async function renderMemos() {
  const all = await chrome.storage.local.get(null);
  const memos = Object.entries(all)
    .filter(([k, v]) => k.startsWith("memo:") && v && v.text)
    .sort((a, b) => b[1].updated - a[1].updated);
  const box = $("#memoList");
  box.innerHTML = "";
  if (!memos.length) {
    box.innerHTML = '<p class="empty">아직 메모가 없어요. 페이지에서 메모 커서를 클릭해 보세요.</p>';
    return;
  }
  for (const [key, v] of memos) {
    const row = document.createElement("div");
    row.className = "memo";
    const a = document.createElement("a");
    a.href = v.url;
    a.target = "_blank";
    a.textContent = v.title || key.slice(5);
    const p = document.createElement("p");
    p.textContent = v.text;
    const small = document.createElement("small");
    small.textContent = `${key.slice(5)} · ${new Date(v.updated).toLocaleString()}`;
    const del = document.createElement("button");
    del.textContent = "삭제";
    del.addEventListener("click", async () => {
      await chrome.storage.local.remove(key);
      renderMemos();
    });
    row.append(a, del, p, small);
    box.appendChild(row);
  }
}

// ------------------------------------------------------------ 시작
(async () => {
  state = await chrome.storage.sync.get(D.settings);
  const showEnabled = () => {
    $("#enabled").checked = state.enabled;
    $("#enabledText").textContent = state.enabled ? "켜짐" : "꺼짐";
    $(".toggle").classList.toggle("off", !state.enabled);
  };
  showEnabled();
  $("#menuKey").value = state.menuKey;
  $("#excluded").value = (state.excluded || []).join("\n");
  state.petColors = [...(state.petColors || D.settings.petColors)];
  const got = await chrome.storage.local.get(["skinImage0", "skinImage1", "skinImage2", "skinImage"]);
  images = [got.skinImage0 || got.skinImage || null, got.skinImage1 || null, got.skinImage2 || null];
  $("#imagePixelated").checked = !!state.imagePixelated;
  $("#imagePixelated").addEventListener("change", (e) => {
    state.imagePixelated = e.target.checked;
    renderTiles();
    renderSkins();
    save();
  });
  renderTiles();
  renderSkins();
  renderPetColors();
  bindRange("pets", (v) => v + "마리", () => (renderPetColors(), renderTiles()));
  bindRange("size", (v) => v + "px");
  bindRange("opacity", (v) => Math.round(v * 100) + "%");
  requestAnimationFrame(animatePreviews);
  renderCrew();
  renderMemos();

  $("#enabled").addEventListener("change", (e) => {
    state.enabled = e.target.checked;
    showEnabled();
    save();
  });
  $("#menuKey").addEventListener("change", (e) => ((state.menuKey = e.target.value), save()));
  $("#hintAgain").addEventListener("click", async () => {
    await chrome.storage.local.remove("crewHintSeen");
    flashSaved("다음에 페이지를 열면 안내가 다시 떠요");
  });
  $("#excluded").addEventListener("input", (e) => {
    state.excluded = e.target.value.split(/\s+/).map((s) => s.trim()).filter(Boolean);
    save();
  });
  $("#shortcuts").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
  });

  // 아이콘·단축키로 켜고 끈 것, 다른 탭에서 쓴 메모를 반영
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.enabled) {
      state.enabled = changes.enabled.newValue;
      showEnabled();
    }
    if (area === "local") renderMemos();
  });
})();

// 펫 메모장의 "모든 메모 보기"로 열리면 #memos 로 바로 이동
function jumpToHash() {
  const el = location.hash && document.getElementById(location.hash.slice(1));
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}
addEventListener("hashchange", jumpToHash);
setTimeout(jumpToHash, 300);
