/** A new diary day starts at this local hour. */
export const DAY_START_HOUR = 4;

/** Recent entries (today and the days before it) can be edited. */
export const RECENT_DAYS = 7;

const WEEKDAYS = "日月火水木金土";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toDiaryDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Returns the diary date ("YYYY-MM-DD") in local time, split at 4 AM. */
export function getDiaryDate(now: Date): string {
  // The Date constructor rolls negative hours back into the previous day.
  const shifted = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours() - DAY_START_HOUR,
  );
  return toDiaryDate(shifted);
}

/** "2026-11-01" + -1 -> "2026-10-31" */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return toDiaryDate(new Date(year, month - 1, day + days));
}

/** True for today and the RECENT_DAYS - 1 days before it. */
export function isRecentDiaryDate(date: string, today: string): boolean {
  // "YYYY-MM-DD" strings sort in date order.
  return date <= today && date >= addDays(today, -(RECENT_DAYS - 1));
}

/** "2026-10-28" -> "2026年10月28日（水）" */
export function formatDiaryDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(year, month - 1, day).getDay()];
  return `${year}年${month}月${day}日（${weekday}）`;
}
