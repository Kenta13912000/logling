import { describe, expect, test } from "vitest";

import {
  DAILY_COMMENT_LIMIT,
  MONTHLY_BUDGET_MICRO_USD,
  costMicroUsd,
  usageDay,
  usageMonth,
} from "./limits";

describe("上限", () => {
  test("AC-14, AC-15: 1 人 1 日 3 回、全体で月 $5", () => {
    expect(DAILY_COMMENT_LIMIT).toBe(3);
    expect(MONTHLY_BUDGET_MICRO_USD).toBe(5_000_000);
  });
});

describe("費用の計算", () => {
  test("AC-15: 入力は 100 万トークンで $0.10、出力は $0.50（100 万分の 1 ドル単位）", () => {
    expect(costMicroUsd({ inputTokens: 1_000_000, outputTokens: 0 })).toBe(
      100_000,
    );
    expect(costMicroUsd({ inputTokens: 0, outputTokens: 1_000_000 })).toBe(
      500_000,
    );
    expect(costMicroUsd({ inputTokens: 1000, outputTokens: 100 })).toBe(150);
  });

  test("AC-15: 端数は切り上げる（少なく数えない）", () => {
    expect(costMicroUsd({ inputTokens: 1, outputTokens: 1 })).toBe(1);
    expect(costMicroUsd({ inputTokens: 0, outputTokens: 0 })).toBe(0);
  });
});

describe("日本の時刻での「今日」と「今月」", () => {
  test("AC-14: 日本の朝 4 時で日が変わる", () => {
    // 2026-11-15 03:59 in Japan is still the 14th; 04:00 is the 15th.
    expect(usageDay(new Date("2026-11-14T18:59:00Z"))).toBe("2026-11-14");
    expect(usageDay(new Date("2026-11-14T19:00:00Z"))).toBe("2026-11-15");
    expect(usageDay(new Date("2026-11-15T12:00:00Z"))).toBe("2026-11-15");
  });

  test("AC-15: 月は日本の時刻のカレンダーで変わる", () => {
    // 2026-12-01 00:30 in Japan.
    expect(usageMonth(new Date("2026-11-30T15:30:00Z"))).toBe("2026-12");
    expect(usageMonth(new Date("2026-11-30T14:59:00Z"))).toBe("2026-11");
  });
});
