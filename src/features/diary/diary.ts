import { countCharacters } from "@/lib/text";

export type DiaryEntry = {
  /** Diary date split at 4 AM, e.g. "2026-10-28". */
  date: string;
  body: string;
  /** When it was saved (ISO 8601). */
  createdAt: string;
  /** Set only for entries written later for a missed day. */
  writtenLater?: true;
  /**
   * Bonus EXP earned when this same-day entry made the streak reach a
   * milestone. Deleting the entry removes it too.
   */
  bonus?: number;
  /** Streak length that earned `bonus` (e.g. 7). Always set together. */
  bonusDays?: number;
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

/** Shared by every body input so the wording stays the same. */
export function bodyErrorMessage(
  result: Extract<BodyValidation, { ok: false }>,
): string {
  return result.reason === "empty"
    ? "なにか書いてくれるとうれしいな"
    : `${BODY_MAX_LENGTH} 文字までにしてね（いま ${result.length} 文字）`;
}
