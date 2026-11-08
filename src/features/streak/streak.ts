import type { DiaryEntry } from "@/features/diary/diary";
import { addDays } from "@/lib/diary-date";

/** Milestones up to 30 days. After 30, every 15 days pays LATE_BONUS. */
const FIRST_MILESTONES: ReadonlyArray<{ days: number; bonus: number }> = [
  { days: 3, bonus: 10 },
  { days: 7, bonus: 20 },
  { days: 14, bonus: 30 },
  { days: 30, bonus: 50 },
];
const LAST_FIRST_MILESTONE = 30;
const LATE_INTERVAL = 15;
const LATE_BONUS = 50;

export type Milestone = { days: number; bonus: number };

export type StreakStatus = {
  writtenToday: boolean;
  /** Through today if written, otherwise through yesterday (0 if neither). */
  days: number;
  /** `remaining` counts today when today is not written yet. */
  next: Milestone & { remaining: number };
};

/** Bonus EXP for reaching a streak of `days`, or 0 if it is no milestone. */
export function bonusForStreak(days: number): number {
  const first = FIRST_MILESTONES.find((m) => m.days === days);
  if (first) {
    return first.bonus;
  }
  const isLate =
    days > LAST_FIRST_MILESTONE &&
    (days - LAST_FIRST_MILESTONE) % LATE_INTERVAL === 0;
  return isLate ? LATE_BONUS : 0;
}

/** The nearest milestone after `days`. */
export function nextMilestone(days: number): Milestone {
  const first = FIRST_MILESTONES.find((m) => m.days > days);
  if (first) {
    return first;
  }
  const steps = Math.floor((days - LAST_FIRST_MILESTONE) / LATE_INTERVAL) + 1;
  return {
    days: LAST_FIRST_MILESTONE + steps * LATE_INTERVAL,
    bonus: LATE_BONUS,
  };
}

/** Days in a row with an entry, counting back from `endDate`. */
export function countStreak(entries: DiaryEntry[], endDate: string): number {
  // Entries written later count too: filling a gap reconnects the streak.
  const dates = new Set(entries.map((entry) => entry.date));
  let days = 0;
  for (let date = endDate; dates.has(date); date = addDays(date, -1)) {
    days += 1;
  }
  return days;
}

export function getStreakStatus(
  entries: DiaryEntry[],
  today: string,
): StreakStatus {
  const writtenToday = entries.some((entry) => entry.date === today);
  // Until today is over, a streak through yesterday is still alive.
  const days = countStreak(entries, writtenToday ? today : addDays(today, -1));
  const next = nextMilestone(days);
  return {
    writtenToday,
    days,
    next: { ...next, remaining: next.days - days },
  };
}

/** Bonus for writing today's entry now: only same-day entries earn one. */
export function bonusForTodayEntry(
  entries: DiaryEntry[],
  today: string,
): number {
  return bonusForStreak(countStreak(entries, addDays(today, -1)) + 1);
}
