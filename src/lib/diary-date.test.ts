import { describe, expect, test } from "vitest";

import {
  RECENT_DAYS,
  addDays,
  formatDiaryDate,
  getDiaryDate,
  isRecentDiaryDate,
} from "./diary-date";

// Months are 0-based in the Date constructor: 9 = October.
describe("getDiaryDate", () => {
  test("AC-15: 夜の 23 時はその日の日記", () => {
    expect(getDiaryDate(new Date(2026, 9, 28, 23, 0))).toBe("2026-10-28");
  });

  test("AC-15: 朝 4 時より前は前の日の日記", () => {
    expect(getDiaryDate(new Date(2026, 9, 29, 0, 0))).toBe("2026-10-28");
    expect(getDiaryDate(new Date(2026, 9, 29, 3, 59))).toBe("2026-10-28");
  });

  test("AC-15: 朝 4 時からは新しい日の日記", () => {
    expect(getDiaryDate(new Date(2026, 9, 29, 4, 0))).toBe("2026-10-29");
  });

  test("AC-15: 月や年をまたぐ日も前の日になる", () => {
    expect(getDiaryDate(new Date(2026, 10, 1, 2, 0))).toBe("2026-10-31");
    expect(getDiaryDate(new Date(2027, 0, 1, 3, 0))).toBe("2026-12-31");
  });
});

describe("formatDiaryDate", () => {
  test("AC-5: 年・月・日と全角かっこの曜日で表示する", () => {
    expect(formatDiaryDate("2026-10-28")).toBe("2026年10月28日（水）");
    expect(formatDiaryDate("2026-11-01")).toBe("2026年11月1日（日）");
  });
});

describe("diary-history", () => {
  describe("addDays", () => {
    test("AC-19: 日付に日数を足し引きでき、月や年をまたげる", () => {
      expect(addDays("2026-11-07", -1)).toBe("2026-11-06");
      expect(addDays("2026-11-01", -1)).toBe("2026-10-31");
      expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
      expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
      expect(addDays("2026-11-07", -6)).toBe("2026-11-01");
    });
  });

  describe("isRecentDiaryDate", () => {
    test("AC-19: 最近 7 日は今日を含めて数える", () => {
      expect(RECENT_DAYS).toBe(7);
      expect(isRecentDiaryDate("2026-11-07", "2026-11-07")).toBe(true);
      expect(isRecentDiaryDate("2026-11-01", "2026-11-07")).toBe(true);
    });

    test("AC-18: 8 日以上前は最近 7 日に入らない", () => {
      expect(isRecentDiaryDate("2026-10-31", "2026-11-07")).toBe(false);
    });

    test("AC-19: 朝 4 時前は前の日が今日になるので、最近 7 日もずれる", () => {
      // 11/7 3:59 is still diary day 11/6, so 10/31 counts as recent.
      const today = getDiaryDate(new Date(2026, 10, 7, 3, 59));
      expect(today).toBe("2026-11-06");
      expect(isRecentDiaryDate("2026-10-31", today)).toBe(true);
      expect(isRecentDiaryDate("2026-10-30", today)).toBe(false);
    });

    test("今日より後の日付は最近 7 日に入らない", () => {
      expect(isRecentDiaryDate("2026-11-08", "2026-11-07")).toBe(false);
    });
  });
});
