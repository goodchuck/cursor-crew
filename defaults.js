// background · content · options 가 함께 쓰는 기본값과 기능 목록.
globalThis.CrewDefaults = {
  // chrome.storage.sync 에 저장되는 설정
  settings: {
    enabled: true,
    settleMs: 450, // 마우스가 이만큼 멈춰 있으면 펫이 제자리에 서서 호버·클릭할 수 있게 된다
    excluded: [], // 펫을 띄우지 않을 사이트(hostname)

    // 겉모습
    skin: "slime", // skins.js 의 id
    pets: 1, // 화면에 보이는 펫 수(1~3)
    size: 36, // 펫 크기(px)
    opacity: 0.9, // 평소 투명도(호버하면 1)
    petColors: ["#5BD16A", "#5AB8F0", "#F28AC0"],

    // 펫에 호버·클릭하면 펼쳐지는 기능 메뉴
    crew: [
      { name: "GitHub", color: "#0D99FF", action: "link", url: "https://github.com" },
      { name: "YouTube", color: "#F24E1E", action: "link", url: "https://www.youtube.com" },
      { name: "Gmail", color: "#0ACF83", action: "link", url: "https://mail.google.com" },
      { name: "메모", color: "#A259FF", action: "memo" },
    ],
  },

  // 메뉴에 넣을 수 있는 기능. 새 기능은 여기 한 줄 + content.js 의 ACTIONS 에 함수 하나를 더하면 된다.
  actions: {
    link: { label: "링크 열기", needsUrl: true },
    memo: { label: "이 페이지 메모" },
    copy: { label: "현재 URL 복사" },
    top: { label: "맨 위로" },
  },

  colors: ["#0D99FF", "#F24E1E", "#0ACF83", "#A259FF", "#FF7262", "#E8A100", "#E8467C", "#14AE5C", "#9747FF", "#00B5CE"],
  maxCrew: 8,
  maxPets: 3,
};
