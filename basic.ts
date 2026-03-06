import { always, extract } from "bombadil";
export * from "bombadil/defaults";

const h1 = extract(state => {
  const element = state.document.querySelector("h1");
  return { text: element?.textContent ?? "" };
});

export const has_titles = always(() => h1.current.text.trim() !== "");
