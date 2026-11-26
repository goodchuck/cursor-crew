# Cursor Crew 개인정보처리방침 / Privacy Policy

시행일 / Effective date: 2026-11-24

## 한국어

Cursor Crew(이하 "확장")는 사용자의 개인정보를 수집하거나 외부로 전송하지 않습니다.

**저장하는 정보 (모두 사용자의 브라우저 안에만 저장)**

| 무엇 | 어디에 | 왜 |
| --- | --- | --- |
| 설정(켜기/끄기, 펫 개수·크기·색·스킨, 메뉴 키, 언어, 테마, 펫별 링크 주소와 이름) | `chrome.storage.sync` | 설정 유지. 크롬 동기화를 켠 경우 사용자의 다른 크롬 기기와 Google 계정을 통해 동기화됩니다. 이 동기화는 크롬이 처리하며, 개발자는 이 데이터에 접근할 수 없습니다. |
| 페이지 메모(메모 내용, 그 페이지의 주소와 제목, 수정 시각) | `chrome.storage.local` | 사용자가 직접 쓴 메모를 그 페이지에서 다시 보여 주기 위해 |
| 첫 안내를 봤는지 여부 | `chrome.storage.local` | 안내를 한 번만 보여 주기 위해 |

**하지 않는 것**

- 방문한 페이지의 내용, 방문 기록, 입력한 내용을 읽어서 저장하거나 전송하지 않습니다. 메모는 사용자가 메모장에 직접 쓴 내용과 그 페이지의 주소·제목만 저장합니다.
- 서버, 분석 도구, 광고, 제3자에게 어떤 데이터도 보내지 않습니다. 확장에는 네트워크 요청 코드가 없습니다.
- 원격 코드를 내려받아 실행하지 않습니다.

**클립보드:** "URL 복사" 기능을 사용자가 실행했을 때만 현재 페이지 주소를 클립보드에 씁니다. 클립보드를 읽지는 않습니다.

**백업 파일:** 설정 창의 "파일로 내보내기"를 누르면 설정과 메모가 담긴 파일이 사용자의 컴퓨터에 내려받아집니다. 이 파일은 어디로도 전송되지 않으며, 사용자가 직접 고른 파일만 가져옵니다.

**삭제:** 설정 창에서 메모를 지울 수 있습니다. 확장을 삭제하면 저장된 모든 데이터가 함께 삭제됩니다.

**문의:** <!-- TODO(사용자): 연락처 이메일 또는 GitHub 이슈 주소 -->

## English

Cursor Crew ("the extension") does not collect or transmit any personal data.

**What is stored (only inside your browser)**

| What | Where | Why |
| --- | --- | --- |
| Settings (on/off, pet count, size, colors and skin, menu key, language, theme, each pet's link URL and name) | `chrome.storage.sync` | To keep your settings. If Chrome Sync is on, Chrome syncs them across your Chrome devices through your Google account. Chrome handles this sync, and the developer has no access to the data. |
| Page memos (memo text, that page's URL and title, last edit time) | `chrome.storage.local` | To show the memo you wrote on that page again |
| Whether you've seen the first-run hint | `chrome.storage.local` | To show the hint only once |

**What it does not do**

- It does not read, store or send page content, browsing history or anything you type into pages. A memo stores only what you type into the memo pad, plus that page's URL and title.
- It sends no data to any server, analytics service, advertiser or other third party. The extension contains no network requests.
- It does not download or run remote code.

**Clipboard:** It writes the current page URL to the clipboard only when you run "Copy URL". It never reads the clipboard.

**Backup file:** "Export to file" in the settings window downloads a file with your settings and memos to your own computer. It is never sent anywhere, and only a file you pick yourself is imported.

**Deletion:** You can delete memos in the settings window. Removing the extension deletes all of its stored data.

**Contact:** <!-- TODO(owner): contact email or GitHub issues URL -->
