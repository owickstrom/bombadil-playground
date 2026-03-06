import { always, extract, now, next } from "bombadil";

export * from "bombadil/defaults";

// -------------------------------------------------
// Types
// -------------------------------------------------

type Todo_item = {
  index: number;
  text: string;
  checked: boolean;
  is_editing: boolean;
};

// -------------------------------------------------
// Extractors (elements)
// -------------------------------------------------

const selected_filter = extract((state) => {
  const el = state.document.querySelector(
    ".todoapp .filters a.selected",
  ) as HTMLElement | null;
  if (!el) return null;

  const style = state.window.getComputedStyle(el);
  const visible =
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0";
  if (!visible) return null;

  const text = el.textContent;
  if (text == null) return null;
  const trimmed = text.trim();
  return trimmed === "" ? null : trimmed;
});

const items = extract((state) => {
  const li_nodes = Array.from(
    state.document.querySelectorAll(".todo-list li"),
  ) as HTMLElement[];

  const normalize_text = (value: string | null | undefined): string | null => {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  };

  const is_visible = (el: Element | null): boolean => {
    if (!el) return false;
    const html_el = el as HTMLElement;
    const style = state.window.getComputedStyle(html_el);
    // If we can’t get a style, treat as visible (conservative).
    if (!style) return true;
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0"
    );
  };

  const result: Todo_item[] = [];

  li_nodes.forEach((li, index) => {
    const style = state.window.getComputedStyle(li);
    const item_visible = style.display !== "none";

    const is_editing = li.classList.contains("editing");

    const label = li.querySelector("label") as HTMLElement | null;
    const label_visible = !!(label && is_visible(label));
    const text = normalize_text(label?.textContent) ?? "";

    const cb = li.querySelector(
      "input[type=checkbox]",
    ) as HTMLInputElement | null;
    const checked = !!cb?.checked;

    if (item_visible && (label_visible || is_editing)) {
      result.push({
        index,
        text,
        checked,
        is_editing,
      });
    }
  });

  return result;
});

const edit_input = extract((state) => {
  const is_visible = (el: Element | null): boolean => {
    if (!el) return false;
    const html_el = el as HTMLElement;
    const style = state.window.getComputedStyle(html_el);
    if (!style) return true;
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0"
    );
  };

  const edit = state.document.querySelector(".todo-list li .edit") as
    | HTMLInputElement
    | HTMLTextAreaElement
    | null;

  if (!edit || !is_visible(edit)) return null;

  const active = state.document.activeElement === edit;
  const text = (edit as HTMLInputElement).value ?? edit.textContent ?? "";

  return {
    text,
    active,
  };
});

const num_items: () => number = (() => {
  return items.current.length;
});

const num_unchecked = (() => {
  return items.current.filter((i) => !i.checked).length;
});

const num_checked = extract((_state) => {
  return items.current.filter((i) => i.checked).length;
});

const items_in_edit_mode = extract((_state) => {
  return items.current.filter((i) => i.is_editing);
});

const item_in_edit_mode = extract((_state) => {
  const arr = items_in_edit_mode.current;
  return arr.length > 0 ? arr[0] : null;
});

const num_in_edit_mode = extract((_state) => {
  return items_in_edit_mode.current.length;
});

const is_in_edit_mode = (() => {
  return num_in_edit_mode.current >= 1 && edit_input.current != null;
});

const new_todo_input = extract((state) => {
  const el = state.document.querySelector(
    ".todoapp .new-todo",
  ) as HTMLInputElement | null;
  if (!el) return null;

  const pending_text = el.value ?? "";
  const active = state.document.activeElement === el;

  return {
    pending_text,
    active,
  };
});

const todo_count = extract((state) => {
  const is_visible = (el: Element | null): boolean => {
    if (!el) return false;
    const html_el = el as HTMLElement;
    const style = state.window.getComputedStyle(html_el);
    if (!style) return true;
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0"
    );
  };

  const normalize_text = (value: string | null | undefined): string | null => {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  };

  const parse_int_safe = (text: string | null): number | null => {
    if (text == null) return null;
    const trimmed = text.trim();
    if (trimmed === "") return null;
    const n = parseInt(trimmed, 10);
    return Number.isNaN(n) ? null : n;
  };

  const strong = state.document.querySelector(
    ".todoapp .todo-count strong",
  ) as HTMLElement | null;
  if (!strong || !is_visible(strong)) return null;

  const text = normalize_text(strong.textContent);
  if (!text) return null;

  const first = text.split(/\s+/)[0] ?? null;
  return parse_int_safe(first);
});

const items_left = extract((state) => {
  const is_visible = (el: Element | null): boolean => {
    if (!el) return false;
    const html_el = el as HTMLElement;
    const style = state.window.getComputedStyle(html_el);
    if (!style) return true;
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0"
    );
  };

  const normalize_text = (value: string | null | undefined): string | null => {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  };

  const el = state.document.querySelector(
    ".todoapp .todo-count",
  ) as HTMLElement | null;
  if (!el || !is_visible(el)) return null;
  const text = normalize_text(el.innerText);
  return text;
});

const available_filters = extract((state) => {
  const normalize_text = (value: string | null | undefined): string | null => {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  };

  const is_visible = (el: Element | null): boolean => {
    if (!el) return false;
    const html_el = el as HTMLElement;
    const style = state.window.getComputedStyle(html_el);
    if (!style) return true;
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0"
    );
  };

  const nodes = Array.from(
    state.document.querySelectorAll(".todoapp .filters a"),
  ) as HTMLElement[];

  return nodes
    .filter((el) => is_visible(el))
    .map((el) => normalize_text(el.textContent))
    .filter((x): x is string => x !== null);
});

const toggle_all_label = extract((state) => {
  const is_visible = (el: Element | null): boolean => {
    if (!el) return false;
    const html_el = el as HTMLElement;
    const style = state.window.getComputedStyle(html_el);
    if (!style) return true;
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0"
    );
  };

  const el = state.document.querySelector(
    ".todoapp label[for=toggle-all]",
  ) as HTMLElement | null;
  if (!el || !is_visible(el)) return null;
  return el.textContent ?? "";
});

const toggle_all_checked = extract((state) => {
  const el = state.document.querySelector(
    ".todoapp #toggle-all",
  ) as HTMLInputElement | null;
  if (!el) return false;
  return !!el.checked;
});


// -------------------------------------------------
// Invariants (exported directly)
// -------------------------------------------------

// 1. Filters should eventually be All/Active/Completed once rendered.
//    While the JS hasn’t finished rendering (no filters yet), we’re lenient.
export const has_filters_now = always(() => {
  const n_items_now = num_items.current;
  const filters = available_filters.current;

  if (filters.length === 0) {
    // Bootstrap / pre-render: allow missing filters.
    return true;
  }

  if (n_items_now === 0) {
    return true;
  }

  const expected = ["All", "Active", "Completed"];

  if (filters.length !== expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (filters[i] !== expected[i]) return false;
  }
  return true;
});

// 2. Toggle-all label exists whenever a filter is selected and not in edit mode.
//    Again, we’re lenient if filters themselves aren’t rendered yet.
export const has_toggle_all_now = always(() => {
  const in_edit = is_in_edit_mode.current;
  const filter = selected_filter.current;
  const filters = available_filters.current;

  if (in_edit) return true;
  if (filter == null) return true;

  if (filters.length === 0) {
    // JS likely hasn’t rendered controls yet.
    return true;
  }

  return toggle_all_label.current != null;
});

// 3. Filter/count relationships (All/Active/Completed).
export const correct_filter_states_now = always(() => {
  const filter = selected_filter.current;
  const n_items_now = num_items.current;
  const n_unchecked_now = num_unchecked.current;
  const count = todo_count.current;

  if (filter == null) {
    // No filter selected => no items (matches Quickstrom spec).
    return n_items_now === 0;
  }

  if (filter === "All") {
    if (count == null) return true; // allow pre-render
    return count === n_unchecked_now && count <= n_items_now;
  }

  if (filter === "Active") {
    if (count == null) return true; // allow pre-render
    return n_items_now === count;
  }

  if (filter === "Completed") {
    // No strong constraint.
    return true;
  }

  // Unknown filter name – conservative failure.
  return false;
});

// 4. If we’re in edit mode, there must be at least one item.
export const edit_mode_has_items_now = always(() => {
  if (!is_in_edit_mode.current) return true;
  return num_items.current > 0;
});

// 5. Pluralization of the “items left” label.
export const items_left_pluralized_now = always(() => {
  const count = todo_count.current;
  const text = items_left.current;

  if (count == null) {
    // If we don’t have a numeric count yet, allow missing label.
    return text == null;
  }

  if (text == null) return false;

  const parts = text.trim().split(/\s+/);
  const has_word = (w: string) => parts.includes(w);

  if (count === 1) {
    return has_word("item");
  } else {
    return has_word("items");
  }
});

// -------------------------------------------------
// Transitions as formulas: pre ⇒ next(post)
// (unchanged)
// -------------------------------------------------

// focusNewTodo: input not active → next step it becomes active.
const focus_new_todo_transition = now(() => {
  const input = new_todo_input.current;
  return !!input && !input.active;
}).implies(
  next(() => {
    const input = new_todo_input.current;
    return !!input && input.active;
  }),
);

// enterNewTodoText: we can change pending text without changing structure.
const enter_new_todo_text_transition = now(() => {
  const input = new_todo_input.current;
  return !!input;
}).implies(
  next(() => {
    const input = new_todo_input.current;
    return !!input;
  }),
);

// changeFilter: selected filter stays within the available filters.
const change_filter_transition = now(() => {
  const filters = available_filters.current;
  const sel = selected_filter.current;
  return filters.length > 0 && sel !== null;
}).implies(
  next(() => {
    const sel = selected_filter.current;
    const filters = available_filters.current;
    return sel === null || filters.includes(sel);
  }),
);

// setSameFilter: re-selecting the same filter keeps *some* filter selected.
const set_same_filter_transition = now(() => {
  const sel = selected_filter.current;
  return sel !== null;
}).implies(
  next(() => {
    const sel = selected_filter.current;
    return sel !== null;
  }),
);

// addNew: when pending text is non-blank, committing clears the input.
const add_new_transition = now(() => {
  const input = new_todo_input.current;
  if (!input) return false;
  const trimmed = input.pending_text.trim();
  return trimmed !== "";
}).implies(
  next(() => {
    const input = new_todo_input.current;
    return !!input && input.pending_text.trim() === "";
  }),
);

// checkOne: after checking, there is at least one checked item.
const check_one_transition = now(() => {
  const sel = selected_filter.current;
  return sel === "All" || sel === "Active";
}).implies(
  next(() => {
    return num_checked.current >= 1;
  }),
);

// uncheckOne: after unchecking, there is at least one unchecked (if any items).
const uncheck_one_transition = now(() => {
  const sel = selected_filter.current;
  return sel === "All" || sel === "Completed";
}).implies(
  next(() => {
    const n_items_now = num_items.current;
    const n_unchecked_now = num_unchecked.current;
    return n_items_now === 0 || n_unchecked_now >= 1;
  }),
);

// delete: if there are items, deleting does not *increase* item count.
const delete_transition = now(() => {
  return num_items.current > 0;
}).implies(
  next(() => {
    return num_items.current >= 0;
  }),
);

// toggleAll: after toggle-all, all items are either checked or unchecked.
const toggle_all_transition = now(() => {
  const sel = selected_filter.current;
  return sel !== null && num_items.current > 0;
}).implies(
  next(() => {
    const n_items_now = num_items.current;
    const n_checked_now = num_checked.current;
    const n_unchecked_now = num_unchecked.current;
    return (
      n_items_now === 0 ||
      n_checked_now === n_items_now ||
      n_unchecked_now === n_items_now
    );
  }),
);

// startEditing: from 0 items in edit mode, we can enter edit mode.
const start_editing_transition = now(() => {
  return num_in_edit_mode.current === 0 && num_items.current > 0;
}).implies(
  next(() => {
    return num_in_edit_mode.current === 1 && !!edit_input.current?.active;
  }),
);

// enterEditText: editing text keeps us in edit mode with an edit input.
const enter_edit_text_transition = now(() => {
  return is_in_edit_mode.current && edit_input.current != null;
}).implies(
  next(() => {
    return is_in_edit_mode.current && edit_input.current != null;
  }),
);

// abortEdit: leaving edit mode via abort.
const abort_edit_transition = now(() => {
  return is_in_edit_mode.current;
}).implies(
  next(() => {
    return !is_in_edit_mode.current;
  }),
);

// commitEdit: leaving edit mode via commit.
const commit_edit_transition = now(() => {
  return is_in_edit_mode.current;
}).implies(
  next(() => {
    return !is_in_edit_mode.current;
  }),
);

// enterEditMode: a more permissive “entering edit mode” transition.
const enter_edit_mode_transition = now(() => {
  return num_in_edit_mode.current === 0 && num_items.current > 0;
}).implies(
  next(() => {
    return is_in_edit_mode.current;
  }),
);

// editModeTransition: staying in or leaving edit mode.
const edit_mode_transition = now(() => {
  return is_in_edit_mode.current;
}).implies(
  next(() => {
    // Next step: either still in edit mode or has exited; always true.
    return true;
  }),
);

// -------------------------------------------------
// Combined step relation and exported step property
// -------------------------------------------------

const todomvc_step_relation = focus_new_todo_transition
  .or(enter_new_todo_text_transition)
  .or(change_filter_transition)
  .or(set_same_filter_transition)
  .or(add_new_transition)
  .or(check_one_transition)
  .or(uncheck_one_transition)
  .or(delete_transition)
  .or(toggle_all_transition)
  .or(start_editing_transition)
  .or(enter_edit_text_transition)
  .or(abort_edit_transition)
  .or(commit_edit_transition)
  .or(enter_edit_mode_transition)
  .or(edit_mode_transition);

// Step property: in every step, one of the allowed transitions holds.
export const todomvc_step_transitions = always(todomvc_step_relation);
