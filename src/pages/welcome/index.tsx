import { createRoot } from "react-dom/client";
import Welcome from "./Welcome";
import "@src/pages/options/index.css";
// 이 페이지에도 진짜 펫을 띄운다(확장 페이지에는 콘텐츠 스크립트가 들어가지 않으므로 직접 불러온다)
import "@src/pages/content/index";

const root = document.getElementById("__root");
if (!root) throw new Error("missing #__root element");
createRoot(root).render(<Welcome />);
