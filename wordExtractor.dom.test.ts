import { describe, it, expect, beforeEach } from 'vitest';
import { getSpellCheckableWords, extractWords } from './wordExtractor.ts';

describe('getSpellCheckableWords - DOM equivalence with textContent', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  function testEquivalence(html: string) {
    container.innerHTML = html;

    const expectedText = container.textContent || '';
    const expectedWords = extractWords(expectedText);

    const actualWords = getSpellCheckableWords(container);

    expect(actualWords).toEqual(expectedWords);
  }

  it('should match textContent for simple text', () => {
    testEquivalence('Hello world this is a test');
  });

  it('should match textContent for text with contractions', () => {
    testEquivalence("I've been working and I don't think it doesn't work");
  });

  it('should match textContent for nested elements', () => {
    testEquivalence('<p>Hello <span>world</span> and <strong>goodbye</strong></p>');
  });

  it('should match textContent for text split across multiple elements', () => {
    testEquivalence('<div>I<span>\'</span>ve been working</div>');
  });

  it('should match textContent for text with newlines and formatting', () => {
    testEquivalence(
      `<div>
        <p>First paragraph</p>
        <p>Second paragraph</p>
      </div>`
    );
  });

  it('should match textContent for deeply nested structure', () => {
    testEquivalence('<div><ul><li><strong>Item</strong> one</li><li>Item <em>two</em></li></ul></div>');
  });

  it('should match textContent for text with punctuation', () => {
    testEquivalence("Hello, world! How are you? I'm fine.");
  });

  it('should match textContent for text with multiple spaces', () => {
    testEquivalence('Hello     world    with    spaces');
  });

  it('should match textContent for empty elements', () => {
    testEquivalence('<div><span></span><p>Text</p><span></span></div>');
  });

  it('should match textContent for text with line breaks', () => {
    testEquivalence('<div>Line one<br>Line two<br>Line three</div>');
  });

  it('should exclude script elements (unlike textContent)', () => {
    container.innerHTML = '<div>Hello <script>alert("bad")</script> world</div>';

    const words = getSpellCheckableWords(container);

    // Should have Hello and world, but not alert or bad
    expect(words.has('Hello')).toBe(true);
    expect(words.has('world')).toBe(true);
    expect(words.has('alert')).toBe(false);
    expect(words.has('bad')).toBe(false);
  });

  it('should exclude code elements (unlike textContent)', () => {
    container.innerHTML = '<div>This is <code>someCode</code> text</div>';

    const words = getSpellCheckableWords(container);

    // Should have "This", "is", "text" but not "someCode"
    expect(words.has('This')).toBe(true);
    expect(words.has('is')).toBe(true);
    expect(words.has('text')).toBe(true);
    expect(words.has('someCode')).toBe(false);
  });

  it('should exclude elements with spellcheck=false', () => {
    container.innerHTML = '<div>Check this <span spellcheck="false">notChecked</span> text</div>';

    const words = getSpellCheckableWords(container);

    expect(words.has('Check')).toBe(true);
    expect(words.has('this')).toBe(true);
    expect(words.has('text')).toBe(true);
    expect(words.has('notChecked')).toBe(false);
  });

  it('should match textContent for complex real-world HTML', () => {
    testEquivalence(
      `<article>
        <h1>Title Here</h1>
        <p>I've been working on a project that doesn't work properly.</p>
        <ul>
          <li>First item</li>
          <li>Second item</li>
        </ul>
        <p>It's really <strong>important</strong> to get this right.</p>
      </article>`
    );
  });
});
