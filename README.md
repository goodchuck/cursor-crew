# Cursor Crew

작은 도트 슬라임이 내 마우스 **살짝 옆·뒤**에서 통통 튀며 따라다니는 크롬 확장(MV3)입니다.
**Alt를 누르고 있으면** 마우스 주변에 기능(자주 가는 링크, 이 페이지 메모, URL 복사, 맨 위로)이 원형으로 펼쳐지고, 원하는 쪽으로 마우스를 옮겨 Alt를 떼면 실행됩니다.

평소엔 화면을 거의 가리지 않습니다. 기본 1마리, 36px, 이름표 없음, 클릭은 페이지로 통과(펫 자체를 누를 때만 빼고).

```
              ● GitHub
                 ╎
   ● 메모 ╌╌  ▄██▄  ╌╌ ● YouTube     ← Alt 누르고 있는 동안
             █•  •█                    마우스를 → 로 옮기고 Alt 떼면 YouTube
                 ╎
              ● Gmail
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

스택은 `chzzk-web-extension`과 같습니다: Vite 6, `@crxjs/vite-plugin` 2, TypeScript, React 19 + Tailwind 4(설정 창에만). 펫은 모든 페이지에 들어가므로 React 없이 바닐라 TS + Shadow DOM 으로 가볍게 만듭니다.

## 쓰는 법

처음 설치하고 페이지에서 마우스를 움직이면 펫 위에 "Alt를 누르고 있으면 메뉴가 열려요" 안내가 한 번 뜹니다.

- **따라다니기**: 마우스를 움직이면 펫이 마우스 뒤쪽으로 처지며 통통 따라오고, 멈추면 마우스 오른쪽 아래(화면 끝이면 반대쪽)에 앉습니다. 오래 쉬고 있으면 머리 위가 가끔 반짝입니다.
- **메뉴 열기 1: 키를 누르고 있기 (주된 방법)**
  1. <kbd>Alt</kbd>를 누르고 있으면 마우스 주변에 기능들이 원형으로 펼쳐집니다(12시 방향부터 시계 방향).
  2. 마우스를 원하는 쪽으로 조금 옮기면 그 항목이 골라지고, 가운데에 무엇을 할지 보입니다.
  3. <kbd>Alt</kbd>를 떼면 실행됩니다. 항목을 직접 클릭해도 됩니다.
  4. 아무것도 안 고르고 떼거나, 다른 키와 함께 누르거나(예: <kbd>Alt</kbd>+<kbd>←</kbd>), 짧게 톡 치기만 하면 그냥 닫힙니다.
- **메뉴 열기 2: 펫 클릭**: 펫에 마우스를 천천히 가져가면 펫이 도망가지 않고 멈추고, 테두리가 빛납니다. 클릭하면 펫 주변에 같은 메뉴가 열리고, 항목을 클릭해 고릅니다. <kbd>Esc</kbd>나 빈 곳 클릭으로 닫힙니다.
- 링크: 그냥 = 새 탭(바로 옆), <kbd>Shift</kbd>를 같이 = 지금 탭, <kbd>Ctrl</kbd>/<kbd>⌘</kbd>를 같이 = 뒤쪽 탭. 결과는 짧은 말풍선으로 알려 줍니다.
- 메모: 작은 메모장이 뜨고 페이지(주소의 경로까지)별로 자동 저장. 메모가 있는 페이지에선 펫 머리 위에 보라색 점. 메모장에서 치는 키는 페이지 단축키(유튜브 `k`, 깃허브 `s` 등)로 새지 않습니다.
- 페이지 입력창에 글을 쓰기 시작하면 펫이 거의 투명해지고, 마우스를 움직이면 돌아옵니다. 창 밖으로 나가거나 전체화면이면 숨습니다.
- **켜기/끄기**: 설정 창 맨 위 스위치 또는 <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd>. 꺼지면 툴바 아이콘에 `OFF` 배지가 붙습니다. 단축키는 `chrome://extensions/shortcuts`에서 바꿀 수 있습니다.
- **다크모드**: 설정 창 **화면·언어**에서 시스템 따라가기(기본) · 라이트 · 다크. 설정 창뿐 아니라 페이지 위에 뜨는 원형 메뉴, 메모장, 안내 말풍선도 따라 바뀝니다.
- **언어**: 자동(브라우저 언어, 기본) · 한국어 · English. 확장 이름·설명은 크롬 언어를 따릅니다.

참고: 윈도우 크롬에서 <kbd>Alt</kbd>만 눌렀다 떼면 원래 크롬 메뉴 버튼으로 포커스가 가는데, 펫이 켜진 페이지에서는 이 동작을 막아 둡니다. 불편하면 설정 창에서 메뉴 키를 <kbd>Ctrl</kbd>·<kbd>Shift</kbd>로 바꾸거나 끌 수 있습니다.

## 설정 창

**툴바 아이콘을 클릭**하면 웹 탭이 아니라 작은 별도 창(540×720)으로 설정이 열립니다. 이미 열려 있으면 새로 만들지 않고 그 창을 앞으로 가져옵니다. 펫 메모장의 **모든 메모 보기**도 같은 창의 메모 목록으로 엽니다.

- **맨 위 스위치**: 켜기/끄기

- **모양**: 스킨(슬라임 · 커서 · 내 이미지·GIF, 움직이는 미리보기), 개수(1~3), 크기(24~64px), 평소 투명도, 펫별 색
- **내 이미지·GIF로 바꾸기**: 펫마다 칸이 하나씩 있어요. 파일을 칸에 끌어다 놓거나 클릭해서 고르면 바로 그 그림으로 바뀝니다(스킨도 자동으로 '내 이미지·GIF'로). 자세한 건 아래 [내 GIF로 바꾸기](#내-gif로-바꾸기).
- **메뉴 여는 법**: 메뉴 키(Alt · Ctrl · Shift · 키로 열지 않기), 처음 안내 다시 보기
- **기능 메뉴**: 원형 메뉴에 나올 항목별 색 · 이름 · 기능 · 링크 주소, 순서 바꾸기, 추가(최대 8개)·삭제
- **화면·언어**: 테마(시스템·라이트·다크), 언어(자동·한국어·English)
- 펫을 띄우지 않을 사이트, 저장된 메모 목록

설정은 `chrome.storage.sync`에, 메모와 올린 이미지는 `chrome.storage.local`에 저장됩니다. 바꾸면 열려 있는 탭에도 바로 반영됩니다.

## 내 GIF로 바꾸기

1. 툴바 아이콘 → 설정 창 → **모양** 아래 **내 이미지·GIF로 바꾸기** 칸에 GIF를 끌어다 놓습니다(클릭해서 골라도 됨).
2. 끝. 열려 있는 탭의 펫이 바로 그 GIF로 바뀌고, GIF 그대로 움직입니다.

- **움직이는 이미지는 그대로**: GIF, 움직이는 WebP, 움직이는 PNG(APNG)는 변환하지 않고 원본 그대로 저장해서 페이지에서도 움직입니다. 정지 이미지(PNG·JPG·WebP)는 128px보다 크면 줄여서 저장합니다.
- **한 장 2MB까지**: 넘으면 설정 창에 안내가 뜹니다. GIF는 가로세로나 프레임 수를 줄이면 많이 작아집니다. 여러 장을 넣어도 막히지 않게 `unlimitedStorage` 권한을 씁니다(설치 때 따로 경고가 뜨지 않는 권한).
- **펫마다 다른 그림**: 펫이 2~3마리면 칸도 2~3개. 비워 둔 칸은 펫 1의 그림을 같이 씁니다. ✕로 지울 수 있고, 다 지우면 슬라임으로 돌아갑니다.
- **크기와 선명도**: 정해 둔 크기(24~64px) 상자 안에 비율을 유지해서 맞추고, 발밑을 기준으로 섭니다. 도트(픽셀아트) GIF가 흐려 보이면 **도트(픽셀아트) 선명하게**를 켭니다. 64px 이하의 작은 그림을 올리면 자동으로 켜집니다.
- 시험용 GIF: `test/sample-pet.gif`(24×24 도트 유령, 4프레임).

## 스킨 (겉모습)

겉모습은 `src/shared/skins.ts`, 따라다니기·메뉴는 `src/pages/content/crew.ts`, 기능은 `src/pages/content/actions.ts`로 나뉘어 있어서 스킨만 갈아 끼울 수 있습니다.

| 스킨 | 설명 |
| --- | --- |
| `slime` (기본) | 코드로 그린 16×16 도트 슬라임. 걸을 때 눌림→늘어남→공중→착지 4프레임으로 통통, 쉴 때 숨쉬기 2프레임과 깜빡임, 움직이는 방향으로 눈이 돌아감. 펫 색으로 자동 채색 |
| `cursor` | 멀티플레이어 화살표 커서 |
| `image` | 설정 창에서 올린 그림·GIF(펫마다 한 장, 움직이는 GIF는 그대로). 걸을 때 통통 튀고 진행 방향으로 살짝 기울어짐 |

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
| `manifest.config.ts` | MV3 manifest(crxjs). 권한은 `storage`·`unlimitedStorage`, 모든 http(s) 페이지에 콘텐츠 스크립트 |
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
- 모든 사이트에 콘텐츠 스크립트를 넣기 때문에 설치 시 "모든 웹사이트의 데이터 읽기 및 변경" 권한 안내가 뜹니다. 페이지 내용을 읽거나 밖으로 보내는 코드는 없습니다(메모·이미지만 로컬에 저장).
