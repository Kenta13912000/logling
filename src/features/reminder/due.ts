/** A reminder may be sent up to this long after its time (Bolt-5 ⑤). */
export const SEND_WINDOW_MINUTES = 60;

/** The clock time and diary date (split at 4 AM) in a time zone. */
export type LocalNow = { minute: number; diaryDate: string };

export function localNow(now: Date, timeZone: string): LocalNow {
  // Bolt-5 ⑥: placeholder until ⑦ fills it in.
  void [now, timeZone];
  return { minute: -1, diaryDate: "" };
}

/** What `dueDiaryDate` reads from a stored reminder. */
export type ReminderTiming = {
  remindMinute: number;
  timeZone: string;
  lastSentOn: string | null;
};

/**
 * The diary date to remind about now, or null when this reminder is not
 * due: outside its window, or already sent for that day (AC-12, AC-13).
 */
export function dueDiaryDate(
  reminder: ReminderTiming,
  now: Date,
): string | null {
  // Bolt-5 ⑥: placeholder until ⑦ fills it in.
  void [reminder, now];
  return null;
}
