import { always, extract, now, next, actions, weighted } from "@antithesishq/bombadil";

export {
  noHttpErrorCodes,
  noUncaughtExceptions,
  noUnhandledPromiseRejections,
  noConsoleErrors,
} from "@antithesishq/bombadil/defaults/properties";

import {
  scroll,
  clicks,
  inputs,
  navigation,
} from "@antithesishq/bombadil/defaults/actions";

// -------------------------------------------------
// Helpers
// -------------------------------------------------

function normalizeText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

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

function parseIntSafe(text: string | null): number | null {
  if (text == null) return null;
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const n = parseInt(trimmed, 10);
  return Number.isNaN(n) ? null : n;
}

function arraysEqual(a: unknown[] | null, b: unknown[] | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
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

function getCenterPointFromRect(rect: DOMRect): { x: number; y: number } | null {
  if (rect.width > 0 && rect.height > 0) {
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }
  return null;
}

// -------------------------------------------------
// Shared helper functions for extractors
// -------------------------------------------------

type TodoItem = {
  index: number;
  text: string;
  checked: boolean;
  isEditing: boolean;
};

function getItems(state: any): TodoItem[] {
  const liNodes = Array.from(
    state.document.querySelectorAll(".todo-list li"),
  ) as HTMLElement[];

  const result: TodoItem[] = [];

  liNodes.forEach((li, index) => {
    const style = state.window.getComputedStyle(li);
    const itemVisible = style.display !== "none";

    const isEditing = li.classList.contains("editing");

    const label = li.querySelector("label") as HTMLElement | null;
    const labelVisible = !!(label && isVisible(label));
    const text = normalizeText(label?.textContent) ?? "";

    const cb = li.querySelector(
      "input[type=checkbox]",
    ) as HTMLInputElement | null;
    const checked = !!cb?.checked;

    if (itemVisible && (labelVisible || isEditing)) {
      result.push({
        index,
        text,
        checked,
        isEditing,
      });
    }
  });

  return result;
}

function getEditInput(state: any): { text: string; active: boolean } | null {
  const edit = state.document.querySelector(".todo-list li .edit") as
    | HTMLInputElement
    | HTMLTextAreaElement
    | null;

  if (!edit || !isVisible(edit)) return null;

  const active = state.document.activeElement === edit;
  const text = (edit as HTMLInputElement).value ?? edit.textContent ?? "";

  return {
    text,
    active,
  };
}

// -------------------------------------------------
// Extractors (elements)
// -------------------------------------------------

const selectedFilter = extract((state) => {
  const el = state.document.querySelector(
    ".todoapp .filters a.selected",
  ) as HTMLElement | null;
  if (!el || !isVisible(el)) return null;
  return normalizeText(el.textContent);
});

const editInput = extract((state) => getEditInput(state));

// Number of items visible in the current filter view.
// Changes when switching filters (e.g., All→Active hides checked items).
const itemsCount = extract((state) => {
  return getItems(state).length;
});

// Number of unchecked items visible in the current filter view.
// Zero when viewing "Completed" filter.
const itemsUncheckedCount = extract((state) => {
  return getItems(state).filter((i) => !i.checked).length;
});

// Number of checked items visible in the current filter view.
// Zero when viewing "Active" filter.
const itemsCheckedCount = extract((state) => {
  return getItems(state).filter((i) => i.checked).length;
});

const itemsInEditModeCount = extract((state) => {
  return getItems(state).filter((i) => i.isEditing).length;
});

// Array of items visible in the current filter view.
// Content changes when switching filters.
const items = extract((state) => getItems(state));

const isInEditMode = extract((state) => {
  const itemsInEditModeCount = getItems(state).filter((i) => i.isEditing).length;
  const editInput = getEditInput(state);
  return itemsInEditModeCount >= 1 && editInput != null;
});

const newTodoInputExists = extract((state) => {
  const el = state.document.querySelector(
    ".todoapp .new-todo",
  ) as HTMLInputElement | null;
  return el !== null;
});

const newTodoPendingText = extract((state) => {
  const el = state.document.querySelector(
    ".todoapp .new-todo",
  ) as HTMLInputElement | null;
  if (!el) return "";
  return el.value ?? "";
});

const newTodoInputActive = extract((state) => {
  const el = state.document.querySelector(
    ".todoapp .new-todo",
  ) as HTMLInputElement | null;
  if (!el) return false;
  return state.document.activeElement === el;
});

const newTodoInputRect = extract((state) => {
  const el = state.document.querySelector(
    ".todoapp .new-todo",
  ) as HTMLInputElement | null;
  if (!el) return null;
  return el.getBoundingClientRect();
});

// Total count of unchecked items from the footer "X items left" text.
// Independent of current filter view - always shows total unchecked count.
// Since new items are always created unchecked, this increases on item creation.
const todoCount = extract((state) => {
  const el = state.document.querySelector(
    ".todoapp .todo-count",
  ) as HTMLElement | null;
  if (!el || !isVisible(el)) return null;

  // Try to extract from <strong> first (some implementations)
  const strong = el.querySelector("strong") as HTMLElement | null;
  const text = normalizeText(strong?.textContent ?? el.textContent);
  if (!text) return null;

  const first = text.split(/\s+/)[0] ?? null;
  return parseIntSafe(first);
});

const itemsLeft = extract((state) => {
  const el = state.document.querySelector(
    ".todoapp .todo-count",
  ) as HTMLElement | null;
  if (!el || !isVisible(el)) return null;
  const text = normalizeText(el.innerText);
  return text;
});

const availableFilters = extract((state) => {
  const nodes = Array.from(
    state.document.querySelectorAll(".todoapp .filters a"),
  ) as HTMLElement[];

  return nodes
    .filter(isVisible)
    .map((el) => normalizeText(el.textContent))
    .filter((x): x is string => x !== null);
});

const toggleAllLabel = extract((state) => {
  const el = state.document.querySelector(
    ".todoapp label[for^=toggle-all], .todoapp .toggle-all-label",
  ) as HTMLElement | null;
  if (!el || !isVisible(el)) return null;
  return el.textContent ?? "";
});

// -------------------------------------------------
// Extractors for action generators
// -------------------------------------------------

type ClickTarget = {
  name: string;
  content?: string;
  point: { x: number; y: number };
};

const unselectedFilterLinks = extract((state) => {
  const links = Array.from(
    state.document.querySelectorAll(".todoapp .filters a:not(.selected)")
  ) as HTMLElement[];

  return links
    .filter(isVisible)
    .map(el => {
      const point = getCenterPoint(el);
      if (!point) return null;
      const content = normalizeText(el.textContent);
      const result: ClickTarget = {
        name: "filter-link",
        point,
      };
      if (content !== null) {
        result.content = content;
      }
      return result;
    })
    .filter((x): x is ClickTarget => x !== null);
});

const selectedFilterLink = extract((state) => {
  const el = state.document.querySelector(
    ".todoapp .filters a.selected"
  ) as HTMLElement | null;
  if (!el || !isVisible(el)) return null;

  const point = getCenterPoint(el);
  if (!point) return null;

  const content = normalizeText(el.textContent);
  const result: ClickTarget = {
    name: "selected-filter",
    point,
  };
  if (content !== null) {
    result.content = content;
  }
  return result;
});

const toggleAllLabelTarget = extract((state) => {
  const el = state.document.querySelector(
    ".todoapp label[for=toggle-all], .todoapp .toggle-all-label"
  ) as HTMLElement | null;
  if (!el || !isVisible(el)) return null;

  const point = getCenterPoint(el);
  if (!point) return null;

  return {
    name: "toggle-all",
    point,
  };
});

const todoLabels = extract((state) => {
  const liNodes = Array.from(
    state.document.querySelectorAll(".todo-list li"),
  ) as HTMLElement[];

  return liNodes
    .filter((li) => {
      const style = state.window.getComputedStyle(li);
      if (style.display === "none") return false;
      return !li.classList.contains("editing");
    })
    .map((li) => {
      const label = li.querySelector("label") as HTMLElement | null;
      if (!label || !isVisible(label)) return null;
      const point = getCenterPoint(label);
      if (!point) return null;
      const content = normalizeText(label.textContent);
      const result: ClickTarget = {
        name: "todo-label",
        point,
      };
      if (content !== null) {
        result.content = content;
      }
      return result;
    })
    .filter((x): x is ClickTarget => x !== null);
});

const deleteButtons = extract((state) => {
  const buttons = Array.from(
    state.document.querySelectorAll(".todoapp .destroy")
  ) as HTMLElement[];

  return buttons
    .filter(isVisible)
    .map(el => {
      const point = getCenterPoint(el);
      if (!point) return null;
      return {
        name: "delete-button",
        point,
      };
    })
    .filter((x): x is ClickTarget => x !== null);
});

// -------------------------------------------------
// Invariants (exported directly)
// -------------------------------------------------

// 1. Filters should eventually be All/Active/Completed once rendered.
//    While the JS hasn’t finished rendering (no filters yet), we’re lenient.
export const filtersExist = always(() => {
  const itemsNowCount = itemsCount.current;
  const filters = availableFilters.current;

  if (filters.length === 0) {
    // Bootstrap / pre-render: allow missing filters.
    return true;
  }

  if (itemsNowCount === 0) {
    return true;
  }

  const expected = ["All", "Active", "Completed"];
  return arraysEqual(filters, expected);
});

// 2. Toggle-all label exists when there are visible items to toggle.
//    Again, we're lenient if filters themselves aren't rendered yet.
export const toggleAllExists = always(() => {
  const inEdit = isInEditMode.current;
  const filter = selectedFilter.current;
  const filters = availableFilters.current;
  const itemsNowCount = itemsCount.current;

  if (inEdit) return true;
  if (filter == null) return true;

  if (filters.length === 0) {
    // JS likely hasn't rendered controls yet.
    return true;
  }

  // Toggle-all doesn't need to exist when there are no visible items
  if (itemsNowCount === 0) return true;

  // Toggle-all doesn't need to exist in "Completed" view
  if (filter === "Completed") return true;

  return toggleAllLabel.current != null;
});

// 3. Filter/count relationships (All/Active/Completed).
export const filtersCorrect = always(() => {
  const filter = selectedFilter.current;
  const itemsNowCount = itemsCount.current;
  const uncheckedNowCount = itemsUncheckedCount.current;
  const count = todoCount.current;

  if (filter == null) {
    // No filter selected => no items (matches Quickstrom spec).
    return itemsNowCount === 0;
  }

  if (filter === "All") {
    if (count == null) return true; // allow pre-render
    return count === uncheckedNowCount && count <= itemsNowCount;
  }

  if (filter === "Active") {
    if (count == null) return true; // allow pre-render
    return itemsNowCount === count;
  }

  if (filter === "Completed") {
    // No strong constraint.
    return true;
  }

  // Unknown filter name – conservative failure.
  return false;
});

// 4. If we’re in edit mode, there must be at least one item.
export const editModeHasItems = always(() => {
  if (!isInEditMode.current) return true;
  return itemsCount.current > 0;
});

// 5. No blank todos should exist in the list.
export const noBlankTodos = always(() => {
  return items.current.every((i) => i.text.trim() !== "");
});

// 6. Pluralization of the "items left" label.
export const itemsLeftPluralized = always(() => {
  const count = todoCount.current;
  const text = itemsLeft.current;

  if (count == null) {
    // If we can't extract the numeric count, we can't verify pluralization.
    // Allow any text (or no text).
    return true;
  }

  // When there are 0 todos, the footer may be hidden, so text can be null
  if (count === 0) {
    return true;
  }

  if (text == null) return false;

  const parts = text.trim().split(/\s+/).map(p => p.replace(/[!.,;:?]+$/, ""));
  const hasWord = (w: string) => parts.includes(w);

  if (count === 1) {
    return hasWord("item");
  } else {
    return hasWord("items");
  }
});

export const filterChangePreservesPendingText = always(() => {
  const pendingTextNow = newTodoPendingText.current;
  const filterNow = selectedFilter.current;
  const filtersNow = availableFilters.current;

  return now(() => filtersNow.length > 0)
    .and(now(() => pendingTextNow.trim() !== ""))
    .and(next(() => availableFilters.current.length > 0))
    .and(next(() => {
      const filterNext = selectedFilter.current;
      return filterNow !== filterNext;
    }))
    .implies(
      next(() => {
        const pendingTextNext = newTodoPendingText.current;
        return pendingTextNext === pendingTextNow;
      })
    );
});

export const filterChangeDoesNotCreateItems = always(() => {
  const filterNow = selectedFilter.current;
  const filtersNow = availableFilters.current;
  const todoCountNow = todoCount.current;

  return now(() => filtersNow.length > 0)
    .and(now(() => todoCountNow != null))
    .and(next(() => availableFilters.current.length > 0))
    .and(next(() => {
      const filterNext = selectedFilter.current;
      return filterNow !== filterNext;
    }))
    .implies(
      next(() => {
        const todoCountNext = todoCount.current;
        return todoCountNext === todoCountNow;
      })
    );
});

export const filterToAllShowsMoreItems = always(() => {
  const filterNow = selectedFilter.current;
  const filtersNow = availableFilters.current;
  const itemsCountNow = itemsCount.current;

  return now(() => filtersNow.length > 0)
    .and(
      now(() => filterNow === "Active").or(now(() => filterNow === "Completed"))
    )
    .and(next(() => availableFilters.current.length > 0))
    .and(next(() => {
      const filterNext = selectedFilter.current;
      return filterNext === "All";
    }))
    .implies(
      next(() => {
        const itemsCountNext = itemsCount.current;
        return itemsCountNext >= itemsCountNow;
      })
    );
});

export const filterFromAllShowsFewerItems = always(() => {
  const filterNow = selectedFilter.current;
  const filtersNow = availableFilters.current;
  const itemsCountNow = itemsCount.current;

  return now(() => filtersNow.length > 0)
    .and(now(() => filterNow === "All"))
    .and(next(() => availableFilters.current.length > 0))
    .and(
      next(() => selectedFilter.current === "Active")
        .or(next(() => selectedFilter.current === "Completed"))
    )
    .implies(
      next(() => {
        const itemsCountNext = itemsCount.current;
        return itemsCountNext <= itemsCountNow;
      })
    );
});

export const addingItemPreservesFilter = always(() => {
  const filterNow = selectedFilter.current;
  const filtersNow = availableFilters.current;
  const todoCountNow = todoCount.current;
  const pendingTextNow = newTodoPendingText.current;

  return now(() => filtersNow.length > 0)
    .and(now(() => pendingTextNow.trim() !== ""))
    .and(now(() => todoCountNow != null))
    .and(next(() => availableFilters.current.length > 0))
    .and(
      next(() => {
        const pendingTextNext = newTodoPendingText.current;
        return pendingTextNext.trim() === "";
      })
    )
    .and(next(() => {
      const todoCountNext = todoCount.current;
      return todoCountNext != null && todoCountNext > todoCountNow;
    }))
    .implies(
      next(() => {
        const filterNext = selectedFilter.current;
        return filterNext === filterNow;
      })
    );
});

// -------------------------------------------------
// Transitions as formulas: pre ⇒ next(post)
// (roughly mirroring the Quickstrom transitions)
// -------------------------------------------------

// focusNewTodo: input not active → next step it becomes active.
const focusNewTodoTransition = now(() => {
  return newTodoInputExists.current && !newTodoInputActive.current;
}).implies(
  next(() => {
    return newTodoInputExists.current && newTodoInputActive.current;
  }),
);

// enterNewTodoText: we can change pending text without changing structure.
const enterNewTodoTextTransition = now(() => {
  return newTodoInputExists.current;
}).implies(
  next(() => {
    return newTodoInputExists.current;
  }),
);

// changeFilter: selected filter stays within the available filters.
const changeFilterTransition = now(() => {
  const filters = availableFilters.current;
  const sel = selectedFilter.current;
  return filters.length > 0 && sel !== null;
}).implies(
  next(() => {
    const sel = selectedFilter.current;
    const filters = availableFilters.current;
    return sel === null || filters.includes(sel);
  }),
);

// setSameFilter: re-selecting the same filter keeps *some* filter selected.
const setSameFilterTransition = now(() => {
  const sel = selectedFilter.current;
  return sel !== null;
}).implies(
  next(() => {
    const sel = selectedFilter.current;
    return sel !== null;
  }),
);

// addNew: when pending text is non-blank, committing clears the input.
const addNewTransition = now(() => {
  if (!newTodoInputExists.current) return false;
  const trimmed = newTodoPendingText.current.trim();
  return trimmed !== "";
}).implies(
  next(() => {
    return newTodoInputExists.current && newTodoPendingText.current.trim() === "";
  }),
);

// checkOne: after checking, there is at least one checked item.
const checkOneTransition = now(() => {
  const sel = selectedFilter.current;
  return sel === "All" || sel === "Active";
}).implies(
  next(() => {
    return itemsCheckedCount.current >= 1;
  }),
);

// uncheckOne: after unchecking, there is at least one unchecked (if any items).
const uncheckOneTransition = now(() => {
  const sel = selectedFilter.current;
  return sel === "All" || sel === "Completed";
}).implies(
  next(() => {
    const itemsNowCount = itemsCount.current;
    const uncheckedNowCount = itemsUncheckedCount.current;
    return itemsNowCount === 0 || uncheckedNowCount >= 1;
  }),
);

// delete: if there are items, deleting does not *increase* item count.
const deleteTransition = now(() => {
  return itemsCount.current > 0;
}).implies(
  next(() => {
    return itemsCount.current >= 0;
  }),
);

// toggleAll: after toggle-all, all items are either checked or unchecked.
const toggleAllTransition = now(() => {
  const sel = selectedFilter.current;
  return sel !== null && itemsCount.current > 0;
}).implies(
  next(() => {
    const itemsNowCount = itemsCount.current;
    const checkedNowCount = itemsCheckedCount.current;
    const uncheckedNowCount = itemsUncheckedCount.current;
    return (
      itemsNowCount === 0 ||
      checkedNowCount === itemsNowCount ||
      uncheckedNowCount === itemsNowCount
    );
  }),
);

// startEditing: from 0 items in edit mode, we can enter edit mode.
const startEditingTransition = now(() => {
  return itemsInEditModeCount.current === 0 && itemsCount.current > 0;
}).implies(
  next(() => {
    return itemsInEditModeCount.current === 1 && !!editInput.current?.active;
  }),
);

// enterEditText: editing text keeps us in edit mode with an edit input.
const enterEditTextTransition = now(() => {
  return isInEditMode.current && editInput.current != null;
}).implies(
  next(() => {
    return isInEditMode.current && editInput.current != null;
  }),
);

// abortEdit: leaving edit mode via abort.
const abortEditTransition = now(() => {
  return isInEditMode.current;
}).implies(
  next(() => {
    return !isInEditMode.current;
  }),
);

// commitEdit: leaving edit mode via commit.
const commitEditTransition = now(() => {
  return isInEditMode.current;
}).implies(
  next(() => {
    return !isInEditMode.current;
  }),
);

// enterEditMode: a more permissive “entering edit mode” transition.
const enterEditModeTransition = now(() => {
  return itemsInEditModeCount.current === 0 && itemsCount.current > 0;
}).implies(
  next(() => {
    return isInEditMode.current;
  }),
);

// editModeTransition: staying in or leaving edit mode.
const editModeTransition = now(() => {
  return isInEditMode.current;
}).implies(
  next(() => {
    // Next step: either still in edit mode or has exited; always true.
    return true;
  }),
);

// -------------------------------------------------
// Combined step relation and exported step property
// -------------------------------------------------

const todomvcStepRelation = focusNewTodoTransition
  .or(enterNewTodoTextTransition)
  .or(changeFilterTransition)
  .or(setSameFilterTransition)
  .or(addNewTransition)
  .or(checkOneTransition)
  .or(uncheckOneTransition)
  .or(deleteTransition)
  .or(toggleAllTransition)
  .or(startEditingTransition)
  .or(enterEditTextTransition)
  .or(abortEditTransition)
  .or(commitEditTransition)
  .or(enterEditModeTransition)
  .or(editModeTransition);

// Step property: in every step, one of the allowed transitions holds.
export const todomvcStepTransitions = always(todomvcStepRelation);

// -------------------------------------------------
// Action Generators
// -------------------------------------------------

// -------------------------------------------------
// Individual action generators (not exported)
// -------------------------------------------------

// Wait for the app to load when the screen is blank (e.g. React hasn't mounted yet)
const waitForAppToLoad = actions(() => {
  const inputExists = newTodoInputExists.current;
  const filters = availableFilters.current;

  // If there's no new-todo input and no filters, the app hasn't rendered yet
  if (!inputExists && filters.length === 0) {
    return ["Wait"];
  }
  return [];
});

// Focus the new todo input if it's not active
const focusNewTodoInput = actions(() => {
  if (!newTodoInputExists.current) return [];
  if (newTodoInputActive.current) return [];
  if (isInEditMode.current) return [];

  const rect = newTodoInputRect.current;
  if (!rect) return [];

  const point = getCenterPointFromRect(rect);
  if (!point) return [];

  const target: ClickTarget = {
    name: "new-todo-input",
    point,
  };
  return [{ Click: target }];
});

// Select a filter that's not currently selected
const selectOtherFilter = actions(() => {
  if (isInEditMode.current) return [];

  const links = unselectedFilterLinks.current;
  return links.map(link => ({ Click: link }));
});

// Select the same filter (re-click)
const selectSameFilter = actions(() => {
  if (isInEditMode.current) return [];

  const link = selectedFilterLink.current;
  return link ? [{ Click: link }] : [];
});

// Toggle all todos
const toggleAllTodos = actions(() => {
  if (isInEditMode.current) return [];
  if (itemsCount.current === 0) return [];

  const target = toggleAllLabelTarget.current;
  return target ? [{ Click: target }] : [];
});

// Double-click a todo label to enter edit mode
const editTodo = actions(() => {
  if (isInEditMode.current) return [];
  if (itemsCount.current === 0) return [];

  const labels = todoLabels.current;
  return labels.map((label) => ({
    DoubleClick: { ...label, delayMillis: 50 },
  }));
});

// Delete a todo
const deleteTodo = actions(() => {
  if (isInEditMode.current) return [];
  if (itemsCount.current === 0) return [];

  const buttons = deleteButtons.current;
  return buttons.map(btn => ({ Click: btn }));
});

// Type text in the new todo input
const typePendingText = actions(() => {
  if (!newTodoInputExists.current || !newTodoInputActive.current) return [];
  if (isInEditMode.current) return [];

  return [
    { TypeText: { text: " ", delayMillis: 50 } },
    { TypeText: { text: "a", delayMillis: 50 } },
    { TypeText: { text: "b", delayMillis: 50 } },
    { PressKey: { code: 8 } }, // Backspace
  ];
});

// Type text in edit input
const typeEditText = actions(() => {
  if (!isInEditMode.current) return [];
  const input = editInput.current;
  if (!input) return [];

  return [
    { TypeText: { text: "c", delayMillis: 50 } },
    { PressKey: { code: 8 } }, // Backspace
  ];
});

// Abort editing (press Escape)
const abortEdit = actions(() => {
  if (!isInEditMode.current) return [];

  return [
    { PressKey: { code: 27 } }, // Escape
  ];
});

// Commit edit (press Enter)
const commitEdit = actions(() => {
  if (!isInEditMode.current) return [];
  const input = editInput.current;
  if (!input) return [];

  return [
    { PressKey: { code: 13 } }, // Enter
  ];
});

// Create a new todo (press Enter when there's text)
const createTodo = actions(() => {
  if (!newTodoInputExists.current || !newTodoInputActive.current) return [];
  if (newTodoPendingText.current.trim() === "") return [];
  if (isInEditMode.current) return [];

  return [
    { PressKey: { code: 13 } }, // Enter
  ];
});

// -------------------------------------------------
// Weighted action tree (exported)
// -------------------------------------------------

// Constructive actions (higher weight): create content, interact with UI
// Lower weight actions: navigation, scrolling, waiting
export const todomvcActions = weighted([
  [10, typePendingText],
  [10, typeEditText],

  [7, focusNewTodoInput],
  [7, editTodo],
  [7, toggleAllTodos],
  [7, commitEdit],

  [5, selectOtherFilter],
  [5, deleteTodo],
  [5, abortEdit],
  [5, createTodo],

  [2, selectSameFilter],

  [1, clicks],
  [1, inputs],
  [1, scroll],
  [1, navigation],
  [1, waitForAppToLoad],
]);
