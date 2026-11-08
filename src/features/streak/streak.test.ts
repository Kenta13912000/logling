import { describe, expect, test } from "vitest";

import type { DiaryEntry } from "@/features/diary/diary";
import { addDays, getDiaryDate } from "@/lib/diary-date";

import {
  bonusForStreak,
  bonusForTodayEntry,
  countStreak,
  getStreakStatus,
  nextMilestone,
} from "./streak";

const TODAY = "2026-11-08";

const entry = (date: string, writtenLater = false): DiaryEntry => ({
  date,
  body: `${date} の日記`,
  createdAt: `${date}T12:00:00.000Z`,
  ...(writtenLater ? { writtenLater: true as const } : {}),
});

/** One entry for every day from `from` to `to`, oldest first. */
function everyDay(from: string, to: string): DiaryEntry[] {
  const entries: DiaryEntry[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    entries.push(entry(date));
  }
  return entries;
}

describe("bonusForStreak", () => {
  test("AC-8: 区切りの日数では、決まった量のボーナスが入る", () => {
    expect(bonusForStreak(3)).toBe(10);
    expect(bonusForStreak(7)).toBe(20);
    expect(bonusForStreak(14)).toBe(30);
    expect(bonusForStreak(30)).toBe(50);
  });

  test("AC-8: 30 日のあとは、15 日ごとに 50 入る", () => {
    expect(bonusForStreak(45)).toBe(50);
    expect(bonusForStreak(60)).toBe(50);
    expect(bonusForStreak(75)).toBe(50);
  });

  test("AC-11: 区切りの日数でなければ、ボーナスは 0", () => {
    for (const days of [0, 1, 2, 4, 6, 8, 13, 15, 29, 31, 44, 46, 59]) {
      expect(bonusForStreak(days), `${days} 日`).toBe(0);
    }
  });
});

describe("nextMilestone", () => {
  test("AC-7, AC-8: 今の日数より先の、いちばん近い区切りとボーナスがわかる", () => {
    expect(nextMilestone(0)).toEqual({ days: 3, bonus: 10 });
    expect(nextMilestone(2)).toEqual({ days: 3, bonus: 10 });
    expect(nextMilestone(3)).toEqual({ days: 7, bonus: 20 });
    expect(nextMilestone(6)).toEqual({ days: 7, bonus: 20 });
    expect(nextMilestone(7)).toEqual({ days: 14, bonus: 30 });
    expect(nextMilestone(14)).toEqual({ days: 30, bonus: 50 });
    expect(nextMilestone(29)).toEqual({ days: 30, bonus: 50 });
  });

  test("AC-8: 30 日のあとは、15 日ごとの区切りが次になる", () => {
    expect(nextMilestone(30)).toEqual({ days: 45, bonus: 50 });
    expect(nextMilestone(44)).toEqual({ days: 45, bonus: 50 });
    expect(nextMilestone(45)).toEqual({ days: 60, bonus: 50 });
  });
});

describe("countStreak", () => {
  test("指定した日から、日記が途切れずに続いている日数を数える", () => {
    expect(countStreak(everyDay("2026-11-04", TODAY), TODAY)).toBe(5);
  });

  test("日記のない日で止まる", () => {
    const entries = everyDay("2026-11-01", TODAY).filter(
      (e) => e.date !== "2026-11-06",
    );

    expect(countStreak(entries, TODAY)).toBe(2);
  });

  test("指定した日に日記がなければ 0", () => {
    expect(countStreak(everyDay("2026-11-01", "2026-11-06"), TODAY)).toBe(0);
  });

  test("AC-5: 後から書いた日記も数える", () => {
    const entries = everyDay("2026-11-04", TODAY).map((e) =>
      e.date === "2026-11-06" ? entry(e.date, true) : e,
    );

    expect(countStreak(entries, TODAY)).toBe(5);
  });

  test("月や年をまたいでも数えられる", () => {
    expect(
      countStreak(everyDay("2026-10-30", "2026-11-02"), "2026-11-02"),
    ).toBe(4);
    expect(
      countStreak(everyDay("2026-12-30", "2027-01-02"), "2027-01-02"),
    ).toBe(4);
  });

  test("日記の並び順に関係なく数える", () => {
    expect(countStreak(everyDay("2026-11-04", TODAY).reverse(), TODAY)).toBe(5);
  });
});

describe("getStreakStatus", () => {
  test("AC-1, AC-7: 今日の日記があれば、今日までの連続日数と次の区切りまでがわかる", () => {
    expect(getStreakStatus(everyDay("2026-11-04", TODAY), TODAY)).toEqual({
      writtenToday: true,
      days: 5,
      next: { days: 7, bonus: 20, remaining: 2 },
    });
  });

  test("AC-2, AC-7: 今日まだ書いていなければ、昨日までの日数と、今日を含めたあと何日かがわかる", () => {
    expect(
      getStreakStatus(everyDay("2026-11-04", "2026-11-07"), TODAY),
    ).toEqual({
      writtenToday: false,
      days: 4,
      next: { days: 7, bonus: 20, remaining: 3 },
    });
  });

  test("AC-3: 昨日も今日も日記がなければ 0 日で、次は 3 日", () => {
    expect(
      getStreakStatus(everyDay("2026-11-01", "2026-11-05"), TODAY),
    ).toEqual({
      writtenToday: false,
      days: 0,
      next: { days: 3, bonus: 10, remaining: 3 },
    });
  });

  test("AC-3: 日記が 1 件もなくても 0 日", () => {
    expect(getStreakStatus([], TODAY)).toMatchObject({
      writtenToday: false,
      days: 0,
    });
  });

  test("AC-7: 区切りに届いた日は、次の区切りが目標になる", () => {
    expect(getStreakStatus(everyDay("2026-11-02", TODAY), TODAY).next).toEqual({
      days: 14,
      bonus: 30,
      remaining: 7,
    });
  });

  test("AC-4: 朝 4 時より前は、前の日を今日として数える", () => {
    // 11/9 3:00 is still diary day 11/8.
    const today = getDiaryDate(new Date(2026, 10, 9, 3, 0));

    expect(getStreakStatus(everyDay("2026-11-04", TODAY), today)).toMatchObject(
      { writtenToday: true, days: 5 },
    );
  });
});

describe("bonusForTodayEntry", () => {
  test("AC-9: 今日書くと区切りに届くなら、そのボーナスが入る", () => {
    // 6 days through yesterday + today = 7.
    expect(
      bonusForTodayEntry(everyDay("2026-11-02", "2026-11-07"), TODAY),
    ).toBe(20);
    expect(
      bonusForTodayEntry(everyDay("2026-11-06", "2026-11-07"), TODAY),
    ).toBe(10);
  });

  test("AC-11: 今日書いても区切りに届かなければ 0", () => {
    expect(
      bonusForTodayEntry(everyDay("2026-11-04", "2026-11-07"), TODAY),
    ).toBe(0);
    expect(bonusForTodayEntry([], TODAY)).toBe(0);
  });

  test("AC-5: 後から書いた日記でつながった連続も、今日の区切りに数える", () => {
    const entries = everyDay("2026-11-02", "2026-11-07").map((e) =>
      e.date === "2026-11-04" ? entry(e.date, true) : e,
    );

    expect(bonusForTodayEntry(entries, TODAY)).toBe(20);
  });

  test("AC-13: 連続が途切れたあと、また区切りに届けば、もう一度入る", () => {
    const entries = [
      ...everyDay("2026-10-20", "2026-10-26"),
      ...everyDay("2026-11-06", "2026-11-07"),
    ];

    expect(bonusForTodayEntry(entries, TODAY)).toBe(10);
  });

  test("AC-17: 今日の日記を消したあと、その日のうちに書き直しても、区切りならまた入る", () => {
    // After the deletion, only the days before today remain.
    const afterDelete = everyDay("2026-11-02", "2026-11-07");

    expect(bonusForTodayEntry(afterDelete, TODAY)).toBe(20);
  });
});
