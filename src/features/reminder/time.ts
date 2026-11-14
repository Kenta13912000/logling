/** The time a reminder starts with: 21:00 (AC-7). */
export const DEFAULT_MINUTE = 1260;

/** The times to choose from: every 30 minutes, 0:00 to 23:30 (AC-7). */
export const REMINDER_MINUTES: readonly number[] = Array.from(
  { length: 48 },
  (_, index) => index * 30,
);

/** Minutes after midnight as a clock time, such as 1260 → "21:00". */
export function formatMinute(minute: number): string {
  const hours = Math.floor(minute / 60);
  const minutes = String(minute % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}
