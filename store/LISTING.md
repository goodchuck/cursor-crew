# 크롬 웹 스토어 제출 자료

[Chrome Web Store 개발자 대시보드](https://chrome.google.com/webstore/devconsole)에 붙여 넣을 문구 초안입니다.
`TODO(사용자)`로 표시한 곳은 사용자가 정해야 하는 부분이고, 나머지는 코드와 맞춰 둔 사실입니다.

---

## 1. 스토어 등록정보 (Store listing)

### 짧은 설명 (manifest `description`, 132자 이하)

이 문구는 `public/_locales/{ko,en}/messages.json`의 `extDescription`에서 자동으로 들어갑니다.

- ko: 작은 도트 펫들이 마우스를 따라다녀요. Alt를 누른 채 펫을 클릭하면 자주 가는 링크 열기, URL 복사, 페이지 메모 같은 기능이 바로 실행돼요.
- en: Tiny pixel pets follow your mouse. Hold Alt and click a pet to open a favorite link, copy the URL, jot a page memo and more.

### 자세한 설명 — 한국어

```
작은 도트 펫이 마우스 옆을 졸졸 따라다니는 크롬 확장이에요.
펫 한 마리마다 기능이 하나씩 들어 있어서, Alt를 누른 채 펫을 클릭하면 그 기능이 바로 실행돼요.

■ 이렇게 써요
• 마우스를 움직이면 펫이 따라와요. 평소에는 클릭이 펫을 통과해서 페이지 사용을 방해하지 않아요.
• Alt를 누르고 있으면 펫들이 커서 둘레로 겹치지 않게 모이고, 각 펫이 하는 일이 보여요. 그 상태로 펫을 클릭하면 실행돼요.
• Alt를 그냥 떼면 아무 일도 일어나지 않아요.
• 켜기/끄기: Alt+Shift+C 또는 툴바 아이콘 → 설정 창 맨 위 스위치

■ 펫이 할 수 있는 일
• 링크 열기: 자주 가는 사이트를 펫에 등록 (Shift+클릭은 지금 탭, Ctrl+클릭은 뒤쪽 탭)
• 페이지 메모: 페이지마다 짧은 메모를 남기고, 다시 오면 이어서 보기
• URL 복사: 지금 보는 페이지 주소를 클립보드로
• 맨 위로: 페이지 맨 위로 스크롤

■ 내 마음대로 꾸미기
• 펫 최대 3마리(펫 하나에 기능 하나), 크기, 투명도, 색
• 모양: 도트 슬라임 또는 커서
• 메뉴 키: Alt / Ctrl / Shift / Alt+Shift
• 다크 모드, 한국어 / English

■ 개인정보
페이지 내용이나 방문 기록을 읽거나 어디로도 보내지 않아요. 설정과 메모는 내 브라우저에만 저장돼요.
```

### 자세한 설명 — English

```
Tiny pixel pets that tag along beside your mouse.
Each pet holds one shortcut: hold Alt and click a pet to run it.

■ How it works
• Move your mouse and the pets follow. Normally clicks pass straight through them, so they never get in your way.
• Hold Alt and the pets fan out around your cursor, never overlapping, and show what each one does. Click a pet while holding Alt to run it.
• Just letting go of Alt does nothing.
• On/off: Alt+Shift+C, or the toolbar icon → switch at the top of the settings window

■ What pets can do
• Open a link: put your favorite sites on pets (Shift+click: this tab, Ctrl+click: background tab)
• Page memo: leave a short note on any page and see it again when you come back
• Copy URL: copy the current page address
• Back to top: scroll to the top of the page

■ Make them yours
• Up to 3 pets (one shortcut each), size, opacity, colors
• Look: pixel slime or cursor
• Menu key: Alt / Ctrl / Shift / Alt+Shift
• Dark mode, Korean / English

■ Privacy
It never reads page content or browsing history, and sends nothing anywhere. Settings and memos stay in your browser.
```

### 카테고리

- 제안: **생산성 (Productivity)**. 대안: 재미 (Fun). TODO(사용자): 최종 선택

### 언어

- 기본 언어: English (`default_locale: "en"`). 한국어 등록정보도 함께 추가합니다.

### 그래픽 자산 (`store/en/`, `store/ko/`)

`pnpm store:shots`로 다시 만들 수 있습니다(설치된 크롬을 headless로 띄워 하네스 페이지를 찍음). 영어 등록정보에는 `en/`, 한국어 등록정보에는 `ko/`를 올립니다.

| 파일 | 규격 | 필수 |
| --- | --- | --- |
| `public/icons/128.png` | 128×128 스토어 아이콘(커서 + 따라오는 슬라임, `pnpm icons`로 다시 만듦) | 필수 |
| `screenshot-1-follow.png` 따라다니기 | 1280×800 | 필수(최소 1장) |
| `screenshot-2-alt.png` Alt를 누르면 이름표 | 1280×800 | |
| `screenshot-3-memo.png` 페이지 메모 | 1280×800 | |
| `screenshot-4-settings.png` 설정 창 라이트·다크 | 1280×800 | |
| `promo-tile-440x280.png` | 440×280 작은 프로모션 타일 | 필수 |
| `marquee-1400x560.png` | 1400×560 마키 | 선택 |

스크린샷 속 페이지(`test/store-scene.html`, "Field Notes")와 주소(`fieldnotes.example`)는 실제 사이트를 흉내 내지 않은 가상의 페이지입니다.

---

## 2. 개인정보 보호 관행 (Privacy practices) 탭

### 단일 목적 (Single purpose)

```
Shows small pixel pets that follow the mouse cursor and act as user-configured shortcuts (open a saved link, copy the page URL, leave a page memo, scroll to top) when clicked while holding a modifier key.
```

### 권한 사용 근거 (Permission justification)

**storage**
```
Saves the user's settings (pet count, size, colors, skin, menu key, language, theme and each pet's link) and the page memos the user writes. Nothing is sent off the device.
```

<!-- unlimitedStorage: 내 이미지·GIF 기능(CUSTOM_IMAGES)을 다시 켤 때 권한과 함께 되살린다.
Users can upload their own animated GIFs as pet images (one per pet). These are stored locally as data URLs and can exceed the default 10 MB chrome.storage.local quota.
-->

**호스트 권한 (content script on `http://*/*`, `https://*/*`, `file:///*`)**
```
The pets are drawn by a content script so they can follow the mouse on every page the user visits. The script only adds its own overlay (inside a Shadow DOM) and listens to mouse and keyboard events to move the pets and detect the menu key. It does not read, modify or transmit page content.
```

### 원격 코드 (Remote code)

- **아니요, 원격 코드를 사용하지 않습니다.** 모든 JS는 패키지에 포함되어 있습니다.

### 데이터 사용 (Data usage) 체크

수집하는 사용자 데이터 항목: **하나도 체크하지 않음**.
(설정과 메모는 기기 안 `chrome.storage`에만 저장되고, 개발자에게 전송되지 않으므로 "수집"에 해당하지 않습니다.)

아래 세 항목에 동의 체크합니다.
- 승인된 사용 사례 외의 목적으로 사용자 데이터를 판매하거나 전송하지 않음
- 단일 목적과 관련 없는 목적으로 사용자 데이터를 사용하거나 전송하지 않음
- 신용도 판단이나 대출 목적으로 사용자 데이터를 사용하거나 전송하지 않음

### 개인정보처리방침 URL

- 내용: [`store/PRIVACY.md`](PRIVACY.md)
- TODO(사용자): 공개 URL에 올리기(예: GitHub 저장소의 PRIVACY.md 링크, GitHub Pages, Notion 공개 페이지). 연락처도 채우기.

---

## 3. 심사 담당자용 테스트 안내 (Test instructions)

```
No account or login needed.
1. Open any normal web page (e.g. https://example.com) and move the mouse: a small slime follows the cursor.
2. Hold Alt: the pets gather around the cursor and show labels. While holding Alt, click a pet to run its action (default pets: GitHub link, YouTube link, page memo).
3. Click the toolbar icon to open the settings window (pets, skins, menu key, language, theme, on/off switch).
4. Alt+Shift+C toggles the extension on and off.
```

---

## 4. 배포 (Distribution)

- 공개 범위: TODO(사용자) 공개 / 미등록(링크만) / 비공개
- 국가: 전체 (기본)
- 가격: 무료
