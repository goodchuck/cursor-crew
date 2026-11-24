import { createRoot } from "react-dom/client";
import Options from "./Options";
import "./index.css";

const root = document.getElementById("__root");
if (!root) throw new Error("missing #__root element");
createRoot(root).render(<Options />);
