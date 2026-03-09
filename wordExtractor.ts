/**
 * Collects spell-checkable text from a DOM tree using stack-based traversal.
 * Ignores script/style/pre elements and elements with spellcheck="false".
 * Returns a set of unique words without punctuation.
 */
export function getSpellCheckableWords(root: HTMLElement): Set<string> {
  // Elements that should never be spell-checked
  const IGNORED_TAGS = new Set([
    'SCRIPT',
    'STYLE',
    'NOSCRIPT',
    'PRE',
    'CODE',
    'SAMP',
    'KBD',
    'VAR',
    'SVG',
    'MATH',
    'IFRAME',
    'CANVAS',
    'AUDIO',
    'VIDEO',
    'HEAD',
    'TITLE',
    'META',
    'LINK',
    'BASE',
    'TEMPLATE',
    'OBJECT',
    'EMBED',
    'AREA',
    'MAP',
  ]);

  const stack: Node[] = [root];
  const textParts = [];

  while (stack.length > 0) {
    const node = stack.pop();

    if (!node) {
      break;
    }

    // Check if this element should be skipped
    if (node instanceof Element) {
      // Skip if spellcheck attribute is explicitly set to "false"
      const spellcheck = node.getAttribute('spellcheck');
      if (spellcheck === 'false') {
        continue;
      }

      // Skip ignored element types
      if (IGNORED_TAGS.has(node.tagName)) {
        continue;
      }
    }

    // Collect text from text nodes
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text) {
        textParts.push(text);
      }
    }

    // Push children onto stack in reverse order to maintain document order
    const children = Array.from(node.childNodes);
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child) {
        stack.push(child);
      }
    }
  }

  // Join all text exactly like textContent (concatenate directly)
  // The whitespace is already in the text nodes themselves
  const fullText = textParts.join('');

  // Collapse multiple whitespace characters to single space
  // This matches how browsers handle whitespace in rendered text
  const collapsed = fullText.replace(/\s+/g, ' ');

  return extractWords(collapsed);
}

/**
 * Extracts words from text, handling contractions with apostrophes.
 * Normalizes Unicode apostrophes to ASCII and filters out numbers and code identifiers.
 */
export function extractWords(text: string): Set<string> {
  // Decode HTML entities for apostrophes (&#39;, &apos;, &#8217;, etc.)
  let decoded = text
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#8217;/g, "'")  // right single quotation mark
    .replace(/&#8216;/g, "'")  // left single quotation mark
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'");

  // Normalize all apostrophe variants to ASCII apostrophe
  const normalized = decoded.replace(/[''ʼ′`´]/g, "'");

  // Split on anything that's NOT a letter or ASCII apostrophe
  const words = normalized.split(/[^a-zA-Z']+/).filter(w => w.length > 0);

  return new Set(
    words.filter(word => {
      // Exclude empty strings
      if (word === "") return false;
      // Exclude numbers
      if (!isNaN(Number(word))) return false;
      // Exclude code identifiers (starting with underscore or containing underscore+number)
      if (word.startsWith("_") || /_\d/.test(word)) return false;
      return true;
    })
  );
}
