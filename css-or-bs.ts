import { extract, actions, weighted } from "@antithesishq/bombadil";
import cssProps from "./css-properties.json" with { type: "json" };

export {
  noHttpErrorCodes,
  noUncaughtExceptions,
  noUnhandledPromiseRejections,
  noConsoleErrors,
} from "@antithesishq/bombadil/defaults/properties";

// -------------------------------------------------
// Helpers
// -------------------------------------------------

function isVisible(el: Element | null): boolean {
  if (!el) return false;
  const htmlEl = el as HTMLElement;
  const style = htmlEl.ownerDocument.defaultView?.getComputedStyle(htmlEl);
  if (!style) return true;
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0"
  );
}

function getCenterPoint(el: Element): { x: number; y: number } | null {
  const rect = el.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }
  return null;
}

function isValidCSSProperty(state: any, propertyName: string): boolean {
  try {
    // Method 1: Check MDN CSS properties database (most comprehensive)
    if (cssProps.properties[propertyName]) {
      return true;
    }

    // Convert kebab-case to camelCase for browser checks
    const camelCase = propertyName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

    // Method 2: Try CSS.supports() (for properties the browser knows about)
    if (state.window.CSS && typeof state.window.CSS.supports === 'function') {
      const testValues = ["initial", "inherit"];
      for (const value of testValues) {
        if (state.window.CSS.supports(propertyName, value)) {
          return true;
        }
      }
    }

    // Method 3: Check if property exists in computed style
    const testEl = state.document.createElement("div");
    const computedStyle = state.window.getComputedStyle(testEl);
    if (camelCase in computedStyle || propertyName in computedStyle) {
      return true;
    }

    return false;
  } catch (e) {
    return false;
  }
}

// -------------------------------------------------
// Extractors
// -------------------------------------------------

type ClickTarget = {
  name: string;
  point: { x: number; y: number };
};

const startButton = extract((state) => {
  const btn = state.document.querySelector(
    "button[command='--start']"
  ) as HTMLElement | null;

  if (!btn || !isVisible(btn)) return null;

  const point = getCenterPoint(btn);
  if (!point) return null;

  return {
    name: "start-button",
    point,
  };
});

const propertyName = extract((state) => {
  const el = state.document.querySelector("#property-name") as HTMLElement | null;
  if (!el || !isVisible(el)) return null;

  const text = el.textContent?.trim();
  return text || null;
});

const cssButton = extract((state) => {
  const btn = state.document.querySelector("#label-css") as HTMLElement | null;

  if (!btn || !isVisible(btn)) return null;

  const point = getCenterPoint(btn);
  if (!point) return null;

  return {
    name: "css-button",
    point,
  };
});

const bsButton = extract((state) => {
  const btn = state.document.querySelector("#label-bs") as HTMLElement | null;

  if (!btn || !isVisible(btn)) return null;

  const point = getCenterPoint(btn);
  if (!point) return null;

  return {
    name: "bs-button",
    point,
  };
});

const blocked = extract((state) => {
  const el = state.document.querySelector(".persist.show") as HTMLElement | null;
  if (!el || !isVisible(el)) return false;

  const text = el.textContent?.trim();
  return text ? true : false;
});

const isPropertyValid = extract((state) => {
  const propName = state.document.querySelector("#property-name")?.textContent?.trim();
  if (!propName) return null;

  return isValidCSSProperty(state, propName);
});

// -------------------------------------------------
// Action Generators
// -------------------------------------------------

const clickStartButton = actions(() => {
  // Don't click anything if persist show element is visible
  if (blocked.current) return [];

  const start = startButton.current;
  if (!start) return [];

  return [{ Click: start }];
});

const answerCssOrBs = actions(() => {
  // Don't click anything if persist show element is visible
  if (blocked.current) return [];

  const propName = propertyName.current;
  const cssBtn = cssButton.current;
  const bsBtn = bsButton.current;
  const isValid = isPropertyValid.current;

  // Need all to be present and property name must be non-empty
  if (!propName || !cssBtn || !bsBtn) return [];
  if (propName.trim() === "") return [];
  if (isValid === null) return [];

  // Debug logging
  console.log(`Property: ${propName}, isValid: ${isValid}`);

  // Return the appropriate button to click
  if (isValid) {
    return [{ Click: cssBtn }];
  } else {
    return [{ Click: bsBtn }];
  }
});

const waitForGame = actions(() => {
  // Wait if persist show element is visible
  if (blocked.current) {
    return ["Wait"];
  }

  const start = startButton.current;
  const cssBtn = cssButton.current;
  const bsBtn = bsButton.current;
  const propName = propertyName.current;

  // Wait during transition: buttons are visible but no property name yet
  if (cssBtn && bsBtn && !propName) {
    return ["Wait"];
  }
  if (cssBtn && bsBtn && propName && propName.trim() === "") {
    return ["Wait"];
  }

  // If neither start button nor game buttons are visible, wait
  if (!start && (!cssBtn || !bsBtn)) {
    return ["Wait"];
  }

  return [];
});

// -------------------------------------------------
// Weighted action tree (exported)
// -------------------------------------------------

export const cssOrBsActions = weighted([
  // High priority: answer the question when both buttons are available
  [10, answerCssOrBs],

  // Medium priority: start the game when start button is available
  [5, clickStartButton],

  // Low priority: wait for elements to appear
  [1, waitForGame],
]);
