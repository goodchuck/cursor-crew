// 순서 중요: chrome.* 흉내를 먼저 깔고 콘텐츠 스크립트를 불러온다
import "./chrome-shim";
import "@src/pages/content/index";
