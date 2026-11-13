import { DAY_START_HOUR } from "@/lib/diary-date";

/**
 * A reminder may be sent up to this long after its time (Bolt-5 ⑤): the
 * 30-minute runs land up to 15 minutes late, so one missed run is caught by
 * the next, but nobody is woken hours later.
 */
export const SEND_WINDOW_MINUTES = 60;

const DAY_MINUTES = 24 * 60;

/** The clock time and diary date (split at 4 AM) in a time zone. */
export type LocalNow = { minute: number; diaryDate: string };

/** "2026-11-14" → "2026-11-13", independent of the server's time zone. */
function previousDate(date: string): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - 1);
  return day.toISOString().slice(0, 10);
}

export function localNow(now: Date, timeZone: string): LocalNow {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const date = `${part("year")}-${part("month")}-${part("day")}`;
  const hour = Number(part("hour"));
  return {
    minute: hour * 60 + Number(part("minute")),
    diaryDate: hour < DAY_START_HOUR ? previousDate(date) : date,
  };
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
 * The day is the one at the reminder's own time, so a window that crosses
 * midnight (or 4 AM) still reminds about the right day.
 */
export function dueDiaryDate(
  reminder: ReminderTiming,
  now: Date,
): string | null {
  const local = localNow(now, reminder.timeZone);
  const elapsed =
    (local.minute - reminder.remindMinute + DAY_MINUTES) % DAY_MINUTES;
  if (elapsed >= SEND_WINDOW_MINUTES) {
    return null;
  }
  const remindedAt = new Date(now.getTime() - elapsed * 60_000);
  const diaryDate = localNow(remindedAt, reminder.timeZone).diaryDate;
  return reminder.lastSentOn === diaryDate ? null : diaryDate;
}
