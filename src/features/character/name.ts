import { countCharacters } from "@/lib/text";

export const NAME_MAX_LENGTH = 10;

export type NameValidation =
  { ok: true; name: string } | { ok: false; reason: "empty" | "tooLong" };

/** What the person is told when a name breaks the rules. */
export const NAME_ERROR_MESSAGES: Record<
  Extract<NameValidation, { ok: false }>["reason"],
  string
> = {
  empty: "名前を入れてね",
  tooLong: "名前は 10 文字までにしてね",
};

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
