import { describe, expect, test } from "vitest";

import { formatDiaryDate, getDiaryDate } from "./diary-date";

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
