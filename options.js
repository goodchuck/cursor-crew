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
let skinImage = null;
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
    const body = skin.create(color, 40, { image: skinImage });
    holder.appendChild(body.el);
    stage.appendChild(holder);
    const label = document.createElement("span");
    label.textContent = skin.label + (skin.needsImage && !skinImage ? " (이미지 필요)" : "");
    card.append(stage, label);
    const pick = () => {
      state.skin = id;
      renderSkins();
      save();
    };
    card.addEventListener("click", pick);
    card.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), pick()));
    box.appendChild(card);
    previews.push(body);
  }
  $("#imageRow").hidden = !Skins.get(state.skin).needsImage;
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

// 올린 이미지는 128px 안으로 줄여 PNG 로 chrome.storage.local 에 저장
$("#imageFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = url;
  });
  const k = Math.min(1, 128 / Math.max(img.width, img.height));
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.round(img.width * k));
  cv.height = Math.max(1, Math.round(img.height * k));
  const cx = cv.getContext("2d");
  cx.imageSmoothingEnabled = k < 1;
  cx.drawImage(img, 0, 0, cv.width, cv.height);
  skinImage = cv.toDataURL("image/png");
  await chrome.storage.local.set({ skinImage });
  $("#imageNote").textContent = `저장됨 (${cv.width}×${cv.height})`;
  renderSkins();
  flashSaved();
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
  $("#enabled").checked = state.enabled;
  $("#menuKey").value = state.menuKey;
  $("#excluded").value = (state.excluded || []).join("\n");
  state.petColors = [...(state.petColors || D.settings.petColors)];
  skinImage = (await chrome.storage.local.get("skinImage")).skinImage || null;
  renderSkins();
  renderPetColors();
  bindRange("pets", (v) => v + "마리", renderPetColors);
  bindRange("size", (v) => v + "px");
  bindRange("opacity", (v) => Math.round(v * 100) + "%");
  requestAnimationFrame(animatePreviews);
  renderCrew();
  renderMemos();

  $("#enabled").addEventListener("change", (e) => ((state.enabled = e.target.checked), save()));
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
      $("#enabled").checked = state.enabled;
    }
    if (area === "local") renderMemos();
  });
})();
