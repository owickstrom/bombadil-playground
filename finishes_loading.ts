import { now, eventually, extract } from "bombadil";

const is_loading = extract((state) => !!state.document.querySelector("progress"));

const result = extract((state) =>
  state.document.querySelector(".result")?.textContent ?? null
);

export const finishes_loading =
  now(() => is_loading.current)
    .implies(
      eventually(() =>
        !is_loading.current && result.current !== null
      ).within(5, "seconds")
    );
