// "이 사이트에서 숨겼어요 · 되돌리기" 알림. 펫(Crew)은 숨기는 순간 사라지므로 따로 띄운다.
// 페이지 스타일에 섞이지 않게 Shadow DOM, 6초 뒤 저절로 사라진다.
const FONT = `system-ui,-apple-system,"Segoe UI","Apple SD Gothic Neo","Malgun Gothic",sans-serif`;

export function showUndoBar(text: string, undoLabel: string, dark: boolean, onUndo: () => void | Promise<void>) {
  document.querySelector("[data-cursor-crew-undo]")?.remove();
  const host = document.createElement("div");
  host.setAttribute("data-cursor-crew-undo", "");
  host.style.cssText = "all:initial;position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647";
  const sh = host.attachShadow({ mode: "open" });
  const bg = dark ? "#f1eff6" : "#1d1b24";
  const fg = dark ? "#1d1b24" : "#ffffff";
  sh.innerHTML = `<style>
    .bar{display:flex;align-items:center;gap:14px;background:${bg};color:${fg};font:600 13px/1.3 ${FONT};padding:10px 12px 10px 16px;border-radius:12px;
      box-shadow:0 10px 30px rgba(0,0,0,.25);animation:in .18s ease-out}
    button{all:unset;cursor:pointer;color:#0d99ff;font-weight:800;padding:4px 6px;border-radius:6px}
    button:hover{background:rgba(13,153,255,.14)}
    button:focus-visible{outline:2px solid #0d99ff}
    @keyframes in{from{opacity:0;transform:translateY(8px)}}
  </style><div class="bar" role="status"><span></span><button type="button"></button></div>`;
  sh.querySelector("span")!.textContent = text;
  const btn = sh.querySelector("button")!;
  btn.textContent = undoLabel;
  const close = () => host.remove();
  btn.addEventListener("click", async () => {
    close();
    await onUndo();
  });
  document.documentElement.appendChild(host);
  setTimeout(close, 6000);
}
