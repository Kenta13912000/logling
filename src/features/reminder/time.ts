/** The time a reminder starts with: 21:00 (AC-7). */
export const DEFAULT_MINUTE = 0;

/** The times to choose from: every 30 minutes (AC-7). */
export const REMINDER_MINUTES: readonly number[] = [];

/** Minutes after midnight as a clock time, such as 1260 → "21:00". */
export function formatMinute(minute: number): string {
  // Bolt-4 ⑥: placeholder until ⑦ fills it in.
  void minute;
  return "";
}
