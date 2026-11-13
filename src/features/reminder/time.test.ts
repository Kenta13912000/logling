import { expect, test } from "vitest";

import { DEFAULT_MINUTE, REMINDER_MINUTES, formatMinute } from "./time";

test("AC-7: 時刻は 0:00〜23:30 の 30 分ごとの 48 個で、はじめは 21:00", () => {
  expect(REMINDER_MINUTES).toHaveLength(48);
  expect(REMINDER_MINUTES[0]).toBe(0);
  expect(REMINDER_MINUTES.at(-1)).toBe(1410);
  expect(REMINDER_MINUTES.every((minute) => minute % 30 === 0)).toBe(true);
  expect(DEFAULT_MINUTE).toBe(1260);
  expect(formatMinute(DEFAULT_MINUTE)).toBe("21:00");
});

test.each([
  [0, "0:00"],
  [30, "0:30"],
  [570, "9:30"],
  [1260, "21:00"],
  [1410, "23:30"],
])("AC-7: %i 分は「%s」", (minute, text) => {
  expect(formatMinute(minute)).toBe(text);
});
