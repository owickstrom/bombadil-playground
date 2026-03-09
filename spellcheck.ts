import NSpell from "nspell";
import { extract, always } from "@antithesishq/bombadil";
import { getSpellCheckableWords } from "./wordExtractor.ts";
export * from "@antithesishq/bombadil/defaults/actions";

// @ts-ignore
import aff from "./node_modules/dictionary-en/index.aff" with { type: "text" };
// @ts-ignore
import dicUs from "./node_modules/dictionary-en/index.dic" with { type: "text" };
// @ts-ignore
import customDic from "./custom.dic" with { type: "text" };

const misspelled = extract(state => {
  const spell = new NSpell(aff, dicUs).personal(customDic);

  const body = state.document.querySelector("body");
  if (!body) { return []; }

  const ct = state.document.contentType || "";
  if (!ct.includes("html")) { return []; }

  const words = [...getSpellCheckableWords(body)];

  return words.filter(word => !spell.correct(word));
});

export const no_spelling_errors = always(() => {
  return misspelled.current.length === 0
});
