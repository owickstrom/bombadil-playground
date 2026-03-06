import Typo from "typo-js";
import { extract, always } from "@antithesishq/bombadil";
export * from "@antithesishq/bombadil/defaults/actions";

var dictionary = new Typo("en_US");

const misspelled = extract(state => {
  const words = [...state.document.querySelectorAll("body > p")]
    .flatMap(p => p.textContent.split(/[\s.!?]/))
    .map(word => word.trim())
    .slice(0, 50)
    .filter(word => word !== "");

  return words.map(word => [word, dictionary.check(word)]);
});

export const no_spelling_errors = always(() => {
  console.log(misspelled.current);
  return misspelled.current.length === 0
});
