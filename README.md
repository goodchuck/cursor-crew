# Cursor Crew

작은 도트 슬라임들이 내 마우스 **살짝 옆·뒤**에서 통통 튀며 따라다니는 크롬 확장(MV3)입니다.
**펫 한 마리가 기능 하나**(자주 가는 링크, 이 페이지 메모, URL 복사, 맨 위로)를 맡고, **<kbd>Alt</kbd>를 누른 채 펫을 클릭**하면 그 기능이 실행됩니다.

평소엔 화면을 거의 가리지 않습니다. 기본 3마리, 36px, 이름표 없음. **펫은 클릭을 전혀 가로채지 않아서** 펫 위를 눌러도 아래 페이지가 눌립니다.

```
 ↖ (내 마우스)          Alt 를 누르고 있는 동안
                        ┌ GitHub ┐       ┌ 메모 ┐
   ▄▄  ▄▄  ▄▄            ▄▄  ▄▄  ▄▄       ← 펫이 멈추고 이름표가 뜸
  █••█ █••█ █••█        █••█ █••█ █••█       그대로 펫을 클릭 = 실행
                            └ YouTube ┘
```

## 로컬에서 설치하기

필요한 것: Node 20 이상, pnpm 9 (`corepack enable` 이면 package.json 의 버전을 씁니다).

```powershell
pnpm i
```

```powershell
pnpm build
```

1. 크롬 주소창에 `chrome://extensions`를 엽니다.
2. 오른쪽 위 **개발자 모드**를 켭니다.
3. **압축해제된 확장 프로그램 로드**를 누르고 **`cursor-crew/dist/` 폴더**를 고릅니다(프로젝트 폴더가 아니라 빌드 결과).
4. 퍼즐 아이콘을 눌러 Cursor Crew를 고정합니다. 아이콘을 누르면 설정 창이 열립니다.
5. 이미 열려 있던 탭은 **새로고침**해야 펫이 나타납니다(설치 후 새로 여는 탭은 바로 동작).

로컬 파일(`file://`)에서도 쓰려면 확장 **세부정보 → 파일 URL에 대한 액세스 허용**을 켭니다.

## 개발

| 명령 | 하는 일 |
| --- | --- |
| `pnpm dev` | 파일을 고칠 때마다 `dist/`를 다시 빌드(감시 빌드). 크롬 `chrome://extensions`에서 카드의 ↻를 누르고 탭을 새로고침하면 반영 |
| `pnpm build` | 타입 검사 후 `dist/`로 빌드 |
| `pnpm zip` | `dist/`를 `cursor-crew-<버전>.zip`으로 묶기(웹 스토어 업로드용, Windows에서도 Node 로 동작) |
| `pnpm typecheck` | 타입 검사만 |
| `pnpm harness` | 확장 없이 브라우저에서 미리보기: http://localhost:5181/harness.html (펫), http://localhost:5181/options.html (설정 창). `chrome.*`는 `test/chrome-shim.ts`가 흉내 내고 저장은 그 페이지의 localStorage 에 됩니다 |
| `pnpm store:shots` | 웹 스토어용 스크린샷·프로모션 이미지를 `store/en/`, `store/ko/`에 다시 만들기(설치된 크롬을 headless로 사용) |

## 크롬 웹 스토어에 올리기

1. `package.json`의 `version`을 올립니다(manifest 버전이 여기서 나옴).
2. `pnpm build`를 한 뒤 `pnpm zip`을 실행하면 `cursor-crew-<버전>.zip`이 만들어집니다. 이 파일을 [개발자 대시보드](https://chrome.google.com/webstore/devconsole)에 올립니다.
3. 등록정보, 권한 근거, 데이터 사용 답변, 심사용 테스트 안내 문구는 [`store/LISTING.md`](store/LISTING.md)에 있습니다.
4. 개인정보처리방침 내용은 [`store/PRIVACY.md`](store/PRIVACY.md)에 있고, 공개 URL에 올려서 링크를 넣습니다.
5. 이미지는 `store/en/`, `store/ko/`에 있습니다. UI가 바뀌면 `pnpm store:shots`로 다시 찍습니다.

스택은 `chzzk-web-extension`과 같습니다: Vite 6, `@crxjs/vite-plugin` 2, TypeScript, React 19 + Tailwind 4(설정 창에만). 펫은 모든 페이지에 들어가므로 React 없이 바닐라 TS + Shadow DOM 으로 가볍게 만듭니다.

## 쓰는 법

처음 설치하고 페이지에서 마우스를 움직이면 펫 위에 "Alt를 누른 채 나를 클릭하면 실행돼요 · 평소엔 클릭이 나를 통과해요" 안내가 한 번 뜹니다.

- **따라다니기**: 마우스를 움직이면 펫들이 줄지어 마우스 뒤쪽으로 처지며 통통 따라오고, 멈추면 마우스 오른쪽 아래(화면 끝이면 반대쪽)에 나란히 앉습니다. 오래 쉬고 있으면 머리 위가 가끔 반짝입니다.
- **평소에는 투명 인간**: 펫은 클릭·호버를 가로채지 않습니다(`pointer-events: none`). 펫 위를 클릭하면 그 아래 링크·버튼이 눌리고, 커서 모양도 바뀌지 않습니다.
- **쓰기: <kbd>Alt</kbd>를 누른 채 펫 클릭**
  1. <kbd>Alt</kbd>(설정에서 바꿀 수 있음)를 누르고 있으면 펫들이 제자리에 멈추고, 펫마다 기능 이름표가 뜹니다. 이때만 펫이 클릭됩니다.
  2. 키를 누른 채 펫을 클릭하면 그 펫의 기능이 바로 실행되고, 펫 위에 짧은 말풍선으로 결과를 알려 줍니다.
  3. 키를 떼면 아무것도 실행되지 않고 원래대로 돌아갑니다.
  4. 키를 누른 채 다른 키를 치면(예: <kbd>Alt</kbd>+<kbd>←</kbd>) 단축키로 보고 바로 풀립니다.
- **브라우저 기본 동작과 겹치지 않게**: 키를 누른 채 펫을 클릭할 때만 기본 동작(예: <kbd>Alt</kbd>+클릭 = 링크 다운로드, <kbd>Ctrl</kbd>+클릭 = 새 탭)을 막습니다. 펫이 아닌 곳을 클릭하면 페이지 동작은 그대로입니다. 펫이 화면에 없거나 꺼져 있으면 키에 손대지 않습니다.
- **누르고 있을 키 바꾸기**: 설정 창 **쓰는 법**에서 <kbd>Alt</kbd> · <kbd>Ctrl</kbd> · <kbd>Shift</kbd> · <kbd>Alt</kbd>+<kbd>Shift</kbd> 중에 고릅니다. <kbd>Alt</kbd>+<kbd>Shift</kbd>는 윈도우 입력 언어 전환 단축키와 겹칠 수 있습니다.
- 링크: 그냥 = 새 탭(바로 옆), <kbd>Shift</kbd>를 같이 = 지금 탭, <kbd>Ctrl</kbd>/<kbd>⌘</kbd>를 같이 = 뒤쪽 탭. 단, 그 키가 누르고 있을 키에 들어 있으면 이 구분은 쓰지 않습니다.
- 메모: 메모 펫을 클릭하면 작은 메모장이 뜨고 페이지(주소의 경로까지)별로 자동 저장됩니다. 메모가 있는 페이지에선 메모 펫 머리 위에 보라색 점. 메모장에서 치는 키는 페이지 단축키(유튜브 `k`, 깃허브 `s` 등)로 새지 않습니다.
- 페이지 입력창에 글을 쓰기 시작하면 펫이 거의 투명해지고, 마우스를 움직이면 돌아옵니다. 창 밖으로 나가거나 전체화면이면 숨습니다.
- **켜기/끄기**: 설정 창 맨 위 스위치 또는 <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd>. 꺼지면 툴바 아이콘에 `OFF` 배지가 붙습니다. 단축키는 `chrome://extensions/shortcuts`에서 바꿀 수 있습니다.
- **다크모드**: 설정 창 **화면·언어**에서 시스템 따라가기(기본) · 라이트 · 다크. 설정 창뿐 아니라 이름표, 메모장, 안내 말풍선도 따라 바뀝니다.
- **언어**: 자동(브라우저 언어, 기본) · 한국어 · English. 확장 이름·설명은 크롬 언어를 따릅니다.

참고: 윈도우 크롬에서 <kbd>Alt</kbd>만 눌렀다 떼면 원래 크롬 메뉴 버튼으로 포커스가 가는데, 펫이 보이는 페이지에서는 이 동작을 막아 둡니다(사이트에 따라 완전히 막히지 않을 수 있음). 불편하면 누르고 있을 키를 <kbd>Ctrl</kbd>이나 <kbd>Shift</kbd>로 바꾸세요.

### How to use (English)

- Small pixel pets follow your mouse. **Each pet does one thing** (a link, a page memo, copy URL, back to top), and they **never catch clicks**: clicking on a pet clicks whatever is underneath.
- **Hold Alt and click a pet** to run its action. While you hold the key the pets stop and show name tags; that's the only time they can be clicked.
- **Releasing the key does nothing**: it just puts the pets back. Pressing another key with it (e.g. Alt+←) cancels right away.
- The key can be Alt, Ctrl, Shift or Alt+Shift (settings → **How to use**). Alt+Shift may clash with the Windows input language switch.
- Browser defaults such as Alt+click (download) or Ctrl+click (new tab) are blocked only when you click a pet while holding the key. If no pet is on screen or the extension is off, the key is left alone.
- Links open in a new tab next to this one; add Shift for this tab or Ctrl/⌘ for a background tab, when that key isn't part of the key you hold. The memo is saved per page and marked with a purple dot on the memo pet.
- On/off: the switch at the top of the settings window (toolbar icon) or Alt+Shift+C. Theme (system/light/dark) and language (auto/Korean/English) are under **Display & language**.

## 설정 창

**툴바 아이콘을 클릭**하면 웹 탭이 아니라 작은 별도 창(540×720)으로 설정이 열립니다. 이미 열려 있으면 새로 만들지 않고 그 창을 앞으로 가져옵니다. 펫 메모장의 **모든 메모 보기**도 같은 창의 메모 목록으로 엽니다.

- **맨 위 스위치**: 켜기/끄기

- **쓰는 법**: 누르고 있을 키(Alt · Ctrl · Shift · Alt+Shift), 처음 안내 다시 보기
- **펫과 기능**: 한 줄이 펫 한 마리(최대 3마리). 펫 색 · 이름표 · 기능 · 링크 주소, 순서 바꾸기, 추가·삭제
- **모양**: 스킨(슬라임 · 커서, 움직이는 미리보기), 크기(24~64px), 평소 투명도
- ~~**내 이미지·GIF로 바꾸기**~~: 지금은 꺼 둠. 아래 [내 GIF로 바꾸기 (꺼 둠)](#내-gif로-바꾸기-꺼-둠) 참고.
- **화면·언어**: 테마(시스템·라이트·다크), 언어(자동·한국어·English)
- 펫을 띄우지 않을 사이트, 저장된 메모 목록

설정은 `chrome.storage.sync`에, 메모는 `chrome.storage.local`에 저장됩니다. 바꾸면 열려 있는 탭에도 바로 반영됩니다.

## 내 GIF로 바꾸기 (꺼 둠)

> 첫 출시에서는 이 기능을 뺐습니다(저장 공간 관리가 복잡해져서). 코드는 그대로 있고, `src/shared/settings.ts`의 `CUSTOM_IMAGES`를 `true`로 바꾸고 `manifest.config.ts` 권한에 `unlimitedStorage`를 다시 넣으면 살아납니다. 아래는 켰을 때의 동작입니다.

1. 툴바 아이콘 → 설정 창 → **모양** 아래 **내 이미지·GIF로 바꾸기** 칸에 GIF를 끌어다 놓습니다(클릭해서 골라도 됨).
2. 끝. 열려 있는 탭의 펫이 바로 그 GIF로 바뀌고, GIF 그대로 움직입니다.

- **움직이는 이미지는 그대로**: GIF, 움직이는 WebP, 움직이는 PNG(APNG)는 변환하지 않고 원본 그대로 저장해서 페이지에서도 움직입니다. 정지 이미지(PNG·JPG·WebP)는 128px보다 크면 줄여서 저장합니다.
- **한 장 2MB까지**: 넘으면 설정 창에 안내가 뜹니다. GIF는 가로세로나 프레임 수를 줄이면 많이 작아집니다. 여러 장을 넣어도 막히지 않게 `unlimitedStorage` 권한을 씁니다(설치 때 따로 경고가 뜨지 않는 권한).
- **펫마다 다른 그림**: 펫(기능) 수만큼 칸이 있고 칸에 펫 이름이 적혀 있습니다. 비워 둔 칸은 첫 번째로 올린 그림을 같이 씁니다. 펫 순서를 바꾸거나 지우면 그림도 같이 따라갑니다. ✕로 지울 수 있고, 다 지우면 슬라임으로 돌아갑니다.
- **크기와 선명도**: 정해 둔 크기(24~64px) 상자 안에 비율을 유지해서 맞추고, 발밑을 기준으로 섭니다. 도트(픽셀아트) GIF가 흐려 보이면 **도트(픽셀아트) 선명하게**를 켭니다. 64px 이하의 작은 그림을 올리면 자동으로 켜집니다.
- 시험용 GIF: `test/sample-pet.gif`(24×24 도트 유령, 4프레임).

## 스킨 (겉모습)

겉모습은 `src/shared/skins.ts`, 따라다니기·메뉴는 `src/pages/content/crew.ts`, 기능은 `src/pages/content/actions.ts`로 나뉘어 있어서 스킨만 갈아 끼울 수 있습니다.

| 스킨 | 설명 |
| --- | --- |
| `slime` (기본) | 코드로 그린 16×16 도트 슬라임. 걸을 때 눌림→늘어남→공중→착지 4프레임으로 통통, 쉴 때 숨쉬기 2프레임과 깜빡임, 움직이는 방향으로 눈이 돌아감. 펫 색으로 자동 채색 |
| `cursor` | 멀티플레이어 화살표 커서 |
| `image` | (꺼 둠, `CUSTOM_IMAGES`) 설정 창에서 올린 그림·GIF(펫마다 한 장, 움직이는 GIF는 그대로). 걸을 때 통통 튀고 진행 방향으로 살짝 기울어짐 |

새 스킨 만들기: `src/shared/skins.ts`의 `SKINS`에 하나 넣고, `src/shared/i18n.ts` 사전(ko·en)에 `skin.<id>` 이름을 더합니다. 설정 창 스킨 목록에 자동으로 나타납니다.

```ts
const ghost: Skin = {
  label: "skin.ghost",
  create(color, size, opts) {
    const el = document.createElement("img"); // 기준점은 발밑 가운데: left -size/2, top -size
    return { el, update({ t, dt, vx, vy, speed, hover }) { /* 매 프레임: 프레임 바꾸기, 흔들기 */ } };
  },
};
```

## 기능 추가하는 법

1. `src/shared/settings.ts`: `ActionId`와 `ACTION_IDS`에 `"weather"`를 더하고 `ACTION_NEEDS_URL`에도 넣습니다.
2. `src/pages/content/actions.ts`의 `ACTIONS`에 함수: `weather(item, mods, host, at) { host.toast(at, host.t("toast.weather")); }`
3. `src/shared/i18n.ts`의 ko·en 사전에 `action.weather`, `action.weatherDesc`(와 쓰는 문구)를 더합니다. 한쪽만 넣으면 타입 검사가 잡아 줍니다.
4. 탭을 열거나 다른 크롬 API가 필요하면 `chrome.runtime.sendMessage`로 `src/pages/background/index.ts`에 맡깁니다.

## 다국어 · 다크모드 구조

- **화면 글자**: 모두 `src/shared/i18n.ts`의 사전 한 곳에 있습니다(`ko`가 기준, `en`은 같은 키를 다 채워야 타입 검사 통과). 코드에서는 `t("opt.look")`처럼 키로만 씁니다.
- **확장 이름·설명·단축키 이름**: manifest 에 들어가므로 `public/_locales/{ko,en}/messages.json`(`chrome.i18n`)에 있습니다.
- **다크모드**: 설정 창은 Tailwind 의 `dark:` 변형(`<html class="dark">`), 페이지 위 펫 UI는 Shadow DOM 안의 CSS 변수(`.root.dark`)로 바뀝니다. 판단은 `src/shared/theme.ts` 한 곳.

## 파일

| 경로 | 내용 |
| --- | --- |
| `manifest.config.ts` | MV3 manifest(crxjs). 권한은 `storage`, 모든 http(s) 페이지에 콘텐츠 스크립트 |
| `vite.config.ts` | 빌드 설정(`dist/`), 설정 창 페이지 입력 |
| `src/shared/settings.ts` | 설정 모양·기본값·저장 도우미 |
| `src/shared/i18n.ts` | UI 문자열 사전(ko/en)과 `t()` |
| `src/shared/theme.ts` | 다크모드 판단 |
| `src/shared/skins.ts` | 겉모습(슬라임 도트 렌더러, 커서, 이미지) |
| `src/pages/content/` | 펫(`crew.ts`), 기능(`actions.ts`), 오버레이 스타일(`styles.ts`), 진입점(`index.ts`) |
| `src/pages/background/` | 아이콘 → 설정 창(`open-dashboard.ts`), 단축키 → 켜기/끄기, 배지, 링크 탭 열기 |
| `src/pages/options/` | 설정 창(React + Tailwind): `Options.tsx`, `components/`, `hooks.ts`, `image.ts` |
| `public/` | 아이콘, `_locales` |
| `scripts/zip.mjs` | `dist/` → zip (Node) |
| `test/` | `pnpm harness`용 페이지, `chrome-shim.ts`, 시험용 `sample-pet.gif` |

## 한계

- 크롬이 확장을 막는 페이지(`chrome://`, 웹 스토어, PDF 뷰어)에선 나타나지 않습니다.
- iframe 안(예: 임베드된 에디터)에서는 마우스 이동이 최상위 페이지로 전달되지 않아, 그 위에 있는 동안은 펫이 멈춰 있습니다.
- 모든 사이트에 콘텐츠 스크립트를 넣기 때문에 설치 시 "모든 웹사이트의 데이터 읽기 및 변경" 권한 안내가 뜹니다. 페이지 내용을 읽거나 밖으로 보내는 코드는 없습니다(설정·메모만 브라우저에 저장).
