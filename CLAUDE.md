# Bombadil Playground

Browser testing specs using the [Bombadil](https://github.com/antithesishq/bombadil) framework, with utilities for DOM word extraction and spell checking.

## Development Environment

This project uses Nix flakes. All commands must be wrapped in `nix develop`:

```sh
nix --extra-experimental-features 'nix-command flakes' develop --command <cmd>
```

Or if you have `direnv` set up, `.envrc` will load the shell automatically.

## Running Tests

Unit tests use Vitest with happy-dom:

```sh
nix --extra-experimental-features 'nix-command flakes' develop --command npm test
```

## TodoMVC Testing

The Nix shell provides helper scripts:

- `todomvc-build <impl>` — Build a TodoMVC implementation (e.g. `react`, `dojo`)
- `todomvc-serve [port]` — Serve built TodoMVC on localhost (default port 8000)
- `todomvc-test <impl|all>` — Run Bombadil specs against a TodoMVC implementation

## Project Structure

- `todomvc.ts` — Main TodoMVC Bombadil specification
- `spellcheck.ts` — Spell-checking specification for web pages
- `wordExtractor.ts` — Extracts spell-checkable words from DOM trees, block-element-aware
- `wordExtractor.dom.test.ts` — Unit tests for word extraction
- `custom.dic` — Custom dictionary additions for spell checking
- `flake.nix` — Nix development environment (Node.js, TypeScript, Chromium, Bombadil)
