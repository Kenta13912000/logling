/** A new diary day starts at this local hour. */
export const DAY_START_HOUR = 4;

const WEEKDAYS = "日月火水木金土";

function pad(value: number): string {
  return String(value).padStart(2, "0");
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
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`;
}

/** "2026-10-28" -> "2026年10月28日（水）" */
export function formatDiaryDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(year, month - 1, day).getDay()];
  return `${year}年${month}月${day}日（${weekday}）`;
}
