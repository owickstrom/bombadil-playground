import { always, extract } from "@antithesishq/bombadil";

const title = extract((state) => state.document.querySelector("h1")?.textContent ?? "");

export const has_title = always(() => title.current.trim() !== "");
