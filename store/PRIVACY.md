# Cursor Crew 개인정보처리방침 / Privacy Policy

시행일 / Effective date: 2026-11-26

> 공개용 페이지는 [`site/privacy.html`](../site/privacy.html)입니다. 내용을 바꾸면 두 곳을 같이 고칩니다.

## 한국어

Cursor Crew(이하 "확장")는 사용자의 개인정보를 수집하거나 개발자에게 전송하지 않습니다.

**저장하는 정보 (모두 사용자의 브라우저 안에만 저장)**

| 무엇 | 어디에 | 왜 |
| --- | --- | --- |
| 설정(켜기/끄기, 펫 개수·크기·색·모양, 펫별 기능과 링크 주소·이름, 단축키, 따라오는 모양, 언어, 테마, 펫을 띄우지 않을 사이트 목록, 저장 데이터 버전) | `chrome.storage.sync` | 설정 유지. 크롬 동기화를 켠 경우 크롬이 사용자의 Google 계정을 통해 다른 크롬 기기와 동기화합니다. 개발자는 이 데이터에 접근할 수 없습니다. |
| 페이지 메모(메모 내용, 그 페이지의 주소와 제목, 수정 시각) | `chrome.storage.local` | 사용자가 직접 쓴 메모를 그 페이지에서 다시 보여 주기 위해 |
| 첫 안내를 봤는지 여부, 업데이트 직전 데이터 사본(업데이트로 데이터 모양이 바뀔 때만) | `chrome.storage.local` | 안내를 한 번만 보여 주기 위해, 업데이트가 잘못되면 되돌리기 위해 |

**하지 않는 것**

- 방문한 페이지의 내용, 방문 기록, 입력한 내용을 읽어서 저장하거나 전송하지 않습니다.
- 개발자의 서버, 분석 도구, 광고, 제3자에게 어떤 데이터도 보내지 않습니다.
- 원격 코드를 내려받아 실행하지 않습니다.

**사용자가 실행할 때만 하는 일**

- **검색·링크 열기:** 사용자가 펫의 검색이나 링크 기능을 실행하면, 그 펫에 설정된 주소(예: 구글 검색)를 새 탭으로 엽니다. 주소에 고른 글자나 지금 페이지 주소를 넣도록 설정한 경우 그 값이 주소에 담겨 해당 사이트로 전달됩니다. 이는 사용자가 직접 그 사이트를 방문하는 것과 같으며, 확장이 따로 데이터를 보내지는 않습니다.
- **클립보드:** "URL 복사", "[제목](주소)로 복사"를 실행했을 때만 클립보드에 씁니다. 클립보드를 읽지는 않습니다.
- **백업 파일:** 설정 창의 "파일로 내보내기"를 누르면 설정과 메모가 담긴 파일이 사용자의 컴퓨터에 내려받아집니다. 이 파일은 어디로도 전송되지 않으며, 사용자가 직접 고른 파일만 가져옵니다.

**삭제:** 설정 창에서 메모를 지울 수 있습니다. 확장을 삭제하면 저장된 모든 데이터가 함께 삭제됩니다.

**문의:** <!-- TODO(사용자): 연락처 이메일 또는 GitHub 이슈 주소 -->

## English

Cursor Crew ("the extension") does not collect personal data or send it to the developer.

**What is stored (only inside your browser)**

| What | Where | Why |
| --- | --- | --- |
| Settings (on/off, pet count, size, colors and look, each pet's actions and link URLs and names, shortcut keys, following style, language, theme, sites where pets are hidden, data format version) | `chrome.storage.sync` | To keep your settings. If Chrome Sync is on, Chrome syncs them across your Chrome devices through your Google account. The developer has no access to this data. |
| Page memos (memo text, that page's URL and title, last edit time) | `chrome.storage.local` | To show the memo you wrote on that page again |
| Whether you've seen the first-run tip; a copy of your data from just before an update (only when an update changes the data format) | `chrome.storage.local` | To show the tip only once; to be able to roll back if an update goes wrong |

**What it does not do**

- It does not read, store or send page content, browsing history or anything you type into pages.
- It sends no data to the developer's servers, analytics services, advertisers or any other third party.
- It does not download or run remote code.

**Only when you run an action**

- **Search and links:** When you run a pet's search or link action, it opens that pet's URL (for example a Google search) in a new tab. If you set the URL to include the selected text or the current page address, that value is part of the URL and reaches that site. This is the same as visiting the site yourself; the extension sends nothing on its own.
- **Clipboard:** It writes to the clipboard only when you run "Copy URL" or "Copy as [title](url)". It never reads the clipboard.
- **Backup file:** "Export to file" in the settings window downloads a file with your settings and memos to your own computer. It is never sent anywhere, and only a file you pick yourself is imported.

**Deletion:** You can delete memos in the settings window. Removing the extension deletes all of its stored data.

**Contact:** <!-- TODO(owner): contact email or GitHub issues URL -->
