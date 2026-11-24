// 펫 오버레이(Shadow DOM) 스타일. 색은 CSS 변수로 두고 .root.dark 에서 바꾼다.
const FONT = 'system-ui,-apple-system,"Segoe UI","Apple SD Gothic Neo","Malgun Gothic",sans-serif';

export const CSS = `
:host{all:initial}
.root{
  --surface:#fff; --text:#1d1d1f; --muted:#8a8a90; --hover:#f0f0f4; --edge:rgba(0,0,0,.06); --divider:#eee;
  --tip:#1d1d1f; --tip-text:#fff; --shadow:rgba(0,0,0,.2);
  position:fixed;inset:0;pointer-events:none;opacity:var(--op,1);transition:opacity .25s ease;color-scheme:light}
.root.dark{
  --surface:#26262b; --text:#f2f2f5; --muted:#9d9da6; --hover:#34343b; --edge:rgba(255,255,255,.1); --divider:#3a3a41;
  --tip:#f2f2f5; --tip-text:#1d1d1f; --shadow:rgba(0,0,0,.5);
  color-scheme:dark}
.root.active,.root.armed{opacity:1}
.root.dim{opacity:.12}
.root.hide{opacity:0}

.pet{position:absolute;left:0;top:0;will-change:transform}
.pet>:first-child{transition:filter .15s}
/* 평소엔 펫이 클릭을 전혀 가로채지 않는다. 메뉴 키를 누르고 있는 동안(.armed)만 클릭·호버 반응 */
.hit{position:absolute;border-radius:45%;pointer-events:none}
.root.armed:not(.dim):not(.hide) .hit{pointer-events:auto;cursor:pointer}
.root.armed .pet.hot>:first-child{filter:drop-shadow(0 0 3px var(--glow)) drop-shadow(0 0 1px var(--glow))}
/* 이름표: 메뉴 키를 누르고 있는 동안만. 짧게 톡 친 키에는 깜빡이지 않게 살짝 늦게 나타난다 */
.label{position:absolute;left:0;display:flex;align-items:center;gap:5px;max-width:110px;transform:translateX(-50%);
  background:var(--surface);color:var(--text);font:600 11.5px/1 ${FONT};padding:4px 7px 4px 6px;border-radius:999px;white-space:nowrap;
  box-shadow:0 2px 8px var(--shadow),0 0 0 1px var(--edge);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .12s,visibility 0s .12s}
.label span:last-child{overflow:hidden;text-overflow:ellipsis}
.label.above{top:calc(var(--s) * -1 - 26px)}
.label.below{top:8px}
.ldot{width:7px;height:7px;border-radius:50%;flex:none}
.root.armed:not(.dim):not(.hide) .label{opacity:1;visibility:visible;transition:opacity .12s .08s,visibility 0s .08s}
.root.armed .pet.hot .label{background:var(--glow);color:#fff}
.badge{position:absolute;width:7px;height:7px;border-radius:50%;background:#A259FF;box-shadow:0 0 0 1.5px var(--surface)}
.spark{position:absolute;color:#fff;font:700 var(--sp,12px)/1 ${FONT};text-shadow:0 0 2px var(--glow),0 0 4px var(--glow);opacity:0;pointer-events:none}
.pet.idle .spark{animation:twinkle 3.2s ease-in-out infinite}
@keyframes twinkle{0%,70%,100%{opacity:0;transform:scale(.4)}80%{opacity:1;transform:scale(1)}90%{opacity:.2;transform:scale(.7)}}
.bubble{position:absolute;transform:translate(-50%,-100%);max-width:260px;background:var(--tip);color:var(--tip-text);font:600 12.5px/1.4 ${FONT};
  padding:7px 10px;border-radius:10px;box-shadow:0 6px 18px var(--shadow);text-align:center;pointer-events:none}
.bubble::after{content:"";position:absolute;left:50%;bottom:-5px;margin-left:-5px;border:5px solid transparent;border-bottom:0;border-top-color:var(--tip)}
.bubble kbd{font:700 11px/1 ${FONT};background:var(--tip-text);color:var(--tip);border-radius:4px;padding:2px 5px;margin:0 1px}
.toast{position:absolute;transform:translate(-50%,-100%);background:var(--tip);color:var(--tip-text);font:600 12px/1 ${FONT};padding:6px 9px;border-radius:8px;
  white-space:nowrap;box-shadow:0 4px 12px var(--shadow);pointer-events:none}
.panel{position:absolute;width:300px;pointer-events:auto;background:var(--surface);color:var(--text);border-radius:12px;
  box-shadow:0 12px 40px var(--shadow),0 0 0 1px var(--edge);overflow:hidden;font:13px/1.45 ${FONT}}
.panel .ph{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--divider)}
.panel .ph b{color:var(--c)}
.panel .where{flex:1;color:var(--muted);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.panel button{font:inherit;border:0;background:none;cursor:pointer;color:var(--muted);padding:2px 6px;border-radius:6px}
.panel button:hover{background:var(--hover);color:var(--text)}
.panel textarea{display:block;box-sizing:border-box;width:100%;height:150px;border:0;outline:0;resize:vertical;padding:10px 12px;
  font:inherit;font-size:14px;color:var(--text);background:var(--surface)}
.panel textarea::placeholder{color:var(--muted)}
.panel .pf{display:flex;align-items:center;justify-content:space-between;padding:6px 8px 8px 12px;border-top:1px solid var(--divider);color:var(--muted);font-size:12px}
`;
