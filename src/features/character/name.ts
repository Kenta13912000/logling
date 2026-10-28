export const NAME_MAX_LENGTH = 10;

export type NameValidation =
  { ok: true; name: string } | { ok: false; reason: "empty" | "tooLong" };

const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });

// Count what the user sees as one character (emoji, combined kana, ...).
function countCharacters(text: string): number {
  return [...segmenter.segment(text)].length;
}

export function validateName(input: string): NameValidation {
  const name = input.trim();
  if (name === "") {
    return { ok: false, reason: "empty" };
  }
  if (countCharacters(name) > NAME_MAX_LENGTH) {
    return { ok: false, reason: "tooLong" };
  }
  return { ok: true, name };
}
