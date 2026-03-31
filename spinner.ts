import { extract, always, now, eventually, actions } from "@antithesishq/bombadil";


// -------------------------------------------------
// Extractors
// -------------------------------------------------

const spinnerVisible = extract((state) => {
  const el = state.document.querySelector(".spinner");
  return el !== null && el.classList.contains("visible");
});

const successVisible = extract((state) => {
  const el = state.document.querySelector(".result-message");
  return el !== null && el.classList.contains("visible") && el.classList.contains("success");
});

const errorVisible = extract((state) => {
  const el = state.document.querySelector(".result-message");
  return el !== null && el.classList.contains("visible") && el.classList.contains("error");
});

const buttonDisabled = extract((state) => {
  const el = state.document.querySelector(".action-button") as HTMLButtonElement | null;
  return el !== null && el.disabled;
});

const buttonPoint = extract((state) => {
  const el = state.document.querySelector(".action-button") as HTMLElement | null;
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
});

// -------------------------------------------------
// Properties
// -------------------------------------------------

export const spinnerResolvesWithinTimeout = always(
  now(() => spinnerVisible.current).implies(
    eventually(() => successVisible.current || errorVisible.current).within(3, "seconds")
  )
);

// The button should be disabled while the spinner is showing.
export const buttonDisabledDuringSpinner = always(() => {
  if (spinnerVisible.current) {
    return buttonDisabled.current;
  }
  return true;
});

// Success and error should never both be visible at the same time.
export const mutuallyExclusiveResults = always(() => {
  return !(successVisible.current && errorVisible.current);
});

// -------------------------------------------------
// Actions
// -------------------------------------------------

export const spinnerActions = actions(() => {
  // While the spinner is active, only wait
  if (spinnerVisible.current) {
    return ["Wait"];
  }

  // Otherwise, allow clicking the button if it's enabled
  const point = buttonPoint.current;
  if (point && !buttonDisabled.current) {
    return [{ Click: { name: "action-button", point } }];
  }

  return [];
});
