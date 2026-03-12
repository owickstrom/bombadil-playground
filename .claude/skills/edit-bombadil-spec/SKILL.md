---
name: edit-bombadil-spec
description: Edits and refines Bombadil specifications (browser testing).
---

## Prerequisites

The full documentation for Bombadil is at [bombadil-manual.txt](bombadil-manual.txt).
Read it.

## Guidelines

* Interview the user in order to come up with properties; go back and forth,
  ask clarifying questions, refine the properties.
* Many properties that people will want are invariants (e.g. `always(() =>
  condition)`).
* In some cases, you need to do guarantee properties, like using nested `next`
  or `eventually` formulas.
* Study the patterns/examples in [bombadil-manual.txt](bombadil-manual.txt)
  when needed.
* You can use TypeScript fully, but there are runtime restrictions:
    - State extractors only have access to the `state` object and the
      environment they close over. They can use top-level definitions and even
      stuff imported from packages in `node_modules`, but they can't use
      anything that imports NodeJS packages.
    - Properties (formulas) can only depend on cells (state extractor values)
      and what they close over. No DOM access.
* Follow the naming style of the existing spec, but otherwise default to using
  full clear names in significance-order, i.e. `nItemsNow` should be
  `itemsNowCount`.
* Always validate your changes through type checking.

## Commands

To verify that your changes are correct, run:

```
tsc --noEmit
```

To run tests, generally use this form of command:

```bash
bombadil test --exit-on-violation https://example.com spec.ts
```
