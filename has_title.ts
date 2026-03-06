import { always, extract } from "bombadil";

const title = extract((state) => state.document.querySelector("h1")?.textContent ?? "");

export const has_title = always(() => title.current.trim() !== "");
