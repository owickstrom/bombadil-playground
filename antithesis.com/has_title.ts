import { always, extract } from "@antithesishq/bombadil";
export * from "@antithesishq/bombadil/defaults";

const title = extract((state) => state.document.querySelector("h1")?.textContent ?? "");

export const has_title = always(() => title.current.trim() !== "");
