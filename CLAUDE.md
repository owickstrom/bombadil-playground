# Bombadil Playground

Browser testing specs using the [Bombadil](https://github.com/antithesishq/bombadil) framework, with utilities for DOM word extraction and spell checking.

## Development Environment

This project uses Nix flakes. You should already be in a Nix shell with
everything available. If not, wrap commands in `nix develop`:

```sh
nix --extra-experimental-features 'nix-command flakes' develop --command <cmd>
```

## Running Tests

Unit tests use Vitest with happy-dom:

```sh
npm test
```

## TodoMVC Testing

The Nix shell provides helper scripts:

- `todomvc-build <impl>` — Build a TodoMVC implementation (e.g. `react`, `dojo`)
- `todomvc-serve [port]` — Serve built TodoMVC on localhost (default port 8000)
- `todomvc-test <impl|all>` — Run Bombadil specs against a TodoMVC implementation

## Bombadil Temporal Logic Patterns

When writing Bombadil specifications, you can capture state values across temporal transitions:

1. Use `always()` (not `now()`) at the top level for temporal properties
2. Extract values with `.current` in the current state and close over them
3. Use `next()` to access the next state, where you can compare against the closed-over values

Example pattern:
```typescript
const propertyName = always(() => {
  const valueNow = someExtractor.current;
  const otherValueNow = anotherExtractor.current;

  return next(() => {
    const valueNext = someExtractor.current;

    // Compare valueNext to valueNow (closed over from above)
    if (someCondition(valueNow, otherValueNow)) {
      return valueNext === valueNow; // State preservation check
    }
    return true;
  });
});
```

This pattern allows you to verify state preservation across actions (e.g., pending input should survive filter changes).

## Project Structure

- `todomvc.ts` — Main TodoMVC Bombadil specification
- `spellcheck.ts` — Spell-checking specification for web pages
- `wordExtractor.ts` — Extracts spell-checkable words from DOM trees, block-element-aware
- `wordExtractor.dom.test.ts` — Unit tests for word extraction
- `custom.dic` — Custom dictionary additions for spell checking
- `flake.nix` — Nix development environment (Node.js, TypeScript, Chromium, Bombadil)
