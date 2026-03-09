import { describe, it, expect } from 'vitest';
import { extractWords } from './wordExtractor.ts';

describe('extractWords', () => {
  it('should extract simple words', () => {
    const text = "Hello world this is a test";
    const words = extractWords(text);
    expect(words).toEqual(new Set(["Hello", "world", "this", "is", "a", "test"]));
  });

  it('should handle contractions with ASCII apostrophes', () => {
    const text = "I've been working and I don't think it doesn't work";
    const words = extractWords(text);
    expect(words.has("I've")).toBe(true);
    expect(words.has("don't")).toBe(true);
    expect(words.has("doesn't")).toBe(true);
    // Should NOT have split fragments
    expect(words.has("ve")).toBe(false);
    expect(words.has("doesn")).toBe(false);
    expect(words.has("don")).toBe(false);
    expect(words.has("t")).toBe(false);
  });

  it('should normalize Unicode apostrophes to ASCII', () => {
    const text = "I've been working"; // Using Unicode right single quotation mark
    const words = extractWords(text);
    expect(words.has("I've")).toBe(true);
    expect(words.has("ve")).toBe(false);
  });

  it('should handle multiple apostrophes', () => {
    const text = "we're, they've, shouldn't, won't";
    const words = extractWords(text);
    expect(words.has("we're")).toBe(true);
    expect(words.has("they've")).toBe(true);
    expect(words.has("shouldn't")).toBe(true);
    expect(words.has("won't")).toBe(true);
  });

  it('should exclude numbers', () => {
    const text = "There are 42 items and 3.14 is pi";
    const words = extractWords(text);
    expect(words.has("42")).toBe(false);
    expect(words.has("3")).toBe(false);
    expect(words.has("14")).toBe(false);
    expect(words.has("There")).toBe(true);
    expect(words.has("are")).toBe(true);
  });

  it('should exclude code identifiers starting with underscore', () => {
    const text = "_private _internal someVariable";
    const words = extractWords(text);
    expect(words.has("_private")).toBe(false);
    expect(words.has("_internal")).toBe(false);
    expect(words.has("someVariable")).toBe(true);
  });

  it('should exclude code identifiers with underscore and number', () => {
    const text = "test_1 test_2 normal";
    const words = extractWords(text);
    expect(words.has("test_1")).toBe(false);
    expect(words.has("test_2")).toBe(false);
    expect(words.has("test")).toBe(true);
    expect(words.has("normal")).toBe(true);
  });

  it('should handle text with punctuation', () => {
    const text = "Hello, world! How are you? I'm fine.";
    const words = extractWords(text);
    expect(words.has("Hello")).toBe(true);
    expect(words.has("world")).toBe(true);
    expect(words.has("I'm")).toBe(true);
    expect(words.has("m")).toBe(false);
  });

  it('should handle empty text', () => {
    const words = extractWords("");
    expect(words.size).toBe(0);
  });

  it('should return unique words', () => {
    const text = "test test test";
    const words = extractWords(text);
    expect(words.size).toBe(1);
    expect(words.has("test")).toBe(true);
  });

  it('should handle all Unicode apostrophe variants', () => {
    // Test various apostrophe characters that might appear in web content
    const variants = [
      "I've",      // ASCII apostrophe U+0027
      "I've",      // Right single quotation mark U+2019
      "I've",      // Left single quotation mark U+2018
      "I've",      // Modifier letter apostrophe U+02BC
      "I've",      // Prime U+2032
    ];

    variants.forEach((text, i) => {
      const words = extractWords(text);
      expect(words.has("I've"), `Variant ${i} should extract "I've"`).toBe(true);
      expect(words.has("ve"), `Variant ${i} should NOT have "ve"`).toBe(false);
      expect(words.has("I"), `Variant ${i} should NOT have "I"`).toBe(false);
    });
  });

  it('should handle text nodes concatenated without spaces (like textContent)', () => {
    // This simulates what textContent does when DOM text nodes are split by elements
    // For example: <span>I</span>'<span>ve</span> becomes "I've" (no spaces)
    const text = "I've and doesn't work";
    const words = extractWords(text);

    // Should extract contractions correctly
    expect(words.has("I've")).toBe(true);
    expect(words.has("doesn't")).toBe(true);
    // Should NOT have fragments
    expect(words.has("ve")).toBe(false);
    expect(words.has("doesn")).toBe(false);
    expect(words.has("t")).toBe(false);
  });
});
