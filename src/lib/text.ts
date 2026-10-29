const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });

// Count what the user sees as one character (emoji, combined kana, ...).
export function countCharacters(text: string): number {
  return [...segmenter.segment(text)].length;
}
