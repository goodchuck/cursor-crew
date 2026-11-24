// background · content · options 가 함께 쓰는 기본값과 기능 목록.
globalThis.CrewDefaults = {
  // chrome.storage.sync 에 저장되는 설정
  settings: {
    enabled: true,
    settleMs: 450, // 마우스가 이만큼 멈춰 있으면 커서들이 제자리에 서서 클릭할 수 있게 된다
    excluded: [], // 커서를 띄우지 않을 사이트(hostname)
    crew: [
      { name: "GitHub", color: "#0D99FF", action: "link", url: "https://github.com" },
      { name: "YouTube", color: "#F24E1E", action: "link", url: "https://www.youtube.com" },
      { name: "Gmail", color: "#0ACF83", action: "link", url: "https://mail.google.com" },
      { name: "메모", color: "#A259FF", action: "memo" },
    ],
  },

  // 커서에 맡길 수 있는 기능. 새 기능은 여기 한 줄 + content.js 의 ACTIONS 에 함수 하나를 더하면 된다.
  actions: {
    link: { label: "링크 열기", needsUrl: true },
    memo: { label: "이 페이지 메모" },
    copy: { label: "현재 URL 복사" },
    top: { label: "맨 위로" },
  },

  colors: ["#0D99FF", "#F24E1E", "#0ACF83", "#A259FF", "#FF7262", "#E8A100", "#E8467C", "#14AE5C", "#9747FF", "#00B5CE"],
  maxCrew: 8,
};
