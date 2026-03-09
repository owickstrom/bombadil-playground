---
name: spell-check-loop
description: Iteratively runs Bombadil spell checker against a site, triaging flagged words until the test passes or true positives are found.
user_invocable: true
---

## Workflow

Run the spell checker in a loop. Each iteration:

1. Run Bombadil spell check against the target site
2. Extract all flagged words
3. Triage each word into one of three outcomes
4. Apply fixes (dictionary or checker)
5. Re-run until stable

The user provides the target URL. Default spec is `spellcheck.ts`.

## Running the test

```bash
nix --extra-experimental-features 'nix-command flakes' develop --command bash -c \
  'RUST_LOG=debug bombadil test --headless --exit-on-violation <URL> spellcheck.ts' \
  > /tmp/spellcheck_output.txt 2>&1
```

The test does not terminate on its own — it explores indefinitely until a
violation is found or the timeout expires. Use a 2-minute timeout. Exit code
2 = violation (misspelled words found). Exit code 1 = error/panic. Timeout
(no violations found during the run) means the test passed.

## Extracting flagged words

Parse `snapshot misspelled: [...]` lines from the output:

```python
import json, re
with open('/tmp/spellcheck_output.txt') as f:
    content = f.read()
words = set()
for m in re.finditer(r'snapshot misspelled: (\[.+\])', content):
    data = json.loads(m.group(1))
    for item in data:
        words.add(item if isinstance(item, str) else item[0])
```

## Three outcomes

### 1. True positive (actual typo) -> stop and report

The word is genuinely misspelled on the website.

**Action:** Stop iterating. Report all true positives as a plain text list:

```
typo -> correction
similiar -> similar
occured -> occurred
```

Do NOT add true positives to the dictionary. The site owner needs to fix them.

### 2. False positive (real word) -> add to personal dictionary

The word is a legitimate word, name, or term that the spell checker doesn't
know. Examples: proper nouns, brand names, place names, regional spellings,
domain-specific terminology.

**Action:** Add to `custom.dic`. The file uses nspell's personal dictionary
format — just a plain list of words, one per line. No count header.

```
Oskar
Wickström
Bombadil
```

Lines starting with `*` mark forbidden words. A `/` models a word after an
existing one (`foo/bar` means foo behaves like bar).

### 3. False positive (noise) -> fix the spell checker

The word is something that shouldn't be spell-checked at all — it was
extracted from the page by mistake. Fix the extraction rather than polluting
the dictionary.

**Action:** Fix `wordExtractor.ts` (DOM traversal and word filtering) or
`spellcheck.ts` (the Bombadil spec). Read both files to understand the
current filters before making changes.

After any extractor changes, run the unit tests:

```bash
nix --extra-experimental-features 'nix-command flakes' develop --command \
  npm test
```

Add tests for new filtering logic.

## Debugging extraction issues

If unexpected words appear and you can't tell where they come from, add a
separate `extract` to `spellcheck.ts` for debugging. Extractors that aren't
used in a property are still logged in the snapshot output but don't affect
test results:

```typescript
const debug = extract(state => {
  const body = state.document.querySelector("body");
  if (!body) return {};
  return {
    contentType: state.document.contentType,
    url: state.document.URL,
    // add whatever diagnostic info you need
  };
});
```

This shows up in the Bombadil debug output as `snapshot debug: {...}` without
triggering violations.

You can also fetch the page directly to check the HTML context of a word:

```bash
curl -sL '<url>' | grep -n 'suspiciousword'
```
