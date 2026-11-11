import { EXP_PER_ENTRY, type Character } from "@/features/character/character";
import { validateName } from "@/features/character/name";
import { validateBody, type DiaryEntry } from "@/features/diary/diary";

/*
 * Server-side checks for data sent from the browser (AC-8). EXP is computed
 * in the browser, where the device clock decides "today"; the server only
 * checks that values are in range. Changing your own EXP only affects you.
 */

/** The largest streak bonus (every 15 days after 30, see streak.ts). */
const MAX_STREAK_BONUS = 50;

/** The most EXP one entry can add or remove: a same-day entry plus a bonus. */
export const MAX_EXP_PER_ENTRY = EXP_PER_ENTRY + MAX_STREAK_BONUS;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1;
}

/** "YYYY-MM-DD" for a day that exists on the calendar. */
export function isDiaryDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function isExp(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= 0 &&
    (value as number) <= MAX_EXP_PER_ENTRY
  );
}

/** The trimmed body, or null when empty, too long or not text. */
export function parseBody(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const result = validateBody(value);
  return result.ok ? result.body : null;
}

export function parseCharacter(value: unknown): Character | null {
  if (!isRecord(value) || typeof value.name !== "string") {
    return null;
  }
  const name = validateName(value.name);
  if (
    !name.ok ||
    !Number.isInteger(value.totalExp) ||
    (value.totalExp as number) < 0 ||
    (value.startDate !== undefined && !isDiaryDate(value.startDate))
  ) {
    return null;
  }
  return {
    name: name.name,
    totalExp: value.totalExp as number,
    ...(value.startDate !== undefined
      ? { startDate: value.startDate as string }
      : {}),
  };
}

export function parseEntry(value: unknown): DiaryEntry | null {
  if (!isRecord(value) || !isDiaryDate(value.date)) {
    return null;
  }
  const body = parseBody(value.body);
  const createdAt = value.createdAt;
  const hasBonus = value.bonus !== undefined || value.bonusDays !== undefined;
  if (
    body === null ||
    typeof createdAt !== "string" ||
    Number.isNaN(Date.parse(createdAt)) ||
    (value.writtenLater !== undefined && value.writtenLater !== true) ||
    (hasBonus &&
      !(isPositiveInteger(value.bonus) && isPositiveInteger(value.bonusDays)))
  ) {
    return null;
  }
  return {
    date: value.date,
    body,
    createdAt: new Date(createdAt).toISOString(),
    ...(value.writtenLater === true ? { writtenLater: true as const } : {}),
    ...(hasBonus
      ? { bonus: value.bonus as number, bonusDays: value.bonusDays as number }
      : {}),
  };
}
