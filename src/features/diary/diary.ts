import { countCharacters } from "@/lib/text";

export type DiaryEntry = {
  /** Diary date split at 4 AM, e.g. "2026-10-28". */
  date: string;
  body: string;
  /** When it was saved (ISO 8601). */
  createdAt: string;
  /** Set only for entries written later for a missed day. */
  writtenLater?: true;
};

export const BODY_MAX_LENGTH = 2000;

export type BodyValidation =
  | { ok: true; body: string }
  | { ok: false; reason: "empty" | "tooLong"; length: number };

export function validateBody(input: string): BodyValidation {
  const body = input.trim();
  if (body === "") {
    return { ok: false, reason: "empty", length: 0 };
  }
  const length = countCharacters(body);
  if (length > BODY_MAX_LENGTH) {
    return { ok: false, reason: "tooLong", length };
  }
  return { ok: true, body };
}
