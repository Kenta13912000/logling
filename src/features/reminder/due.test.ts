import { describe, expect, test } from "vitest";

import { dueDiaryDate, localNow } from "./due";

// November: Tokyo is UTC+9, New York is UTC-5.
const at = (iso: string) => new Date(iso);

describe("タイムゾーンごとの時刻と「その日」", () => {
  test.each([
    ["Asia/Tokyo", "2026-11-13T12:07:00Z", 21 * 60 + 7, "2026-11-13"],
    ["America/New_York", "2026-11-13T12:07:00Z", 7 * 60 + 7, "2026-11-13"],
    ["UTC", "2026-11-13T12:07:00Z", 12 * 60 + 7, "2026-11-13"],
    // 3:30 on the 14th in Tokyo is still the 13th's diary day (4 AM split).
    ["Asia/Tokyo", "2026-11-13T18:30:00Z", 3 * 60 + 30, "2026-11-13"],
    // 4:00 starts the 14th.
    ["Asia/Tokyo", "2026-11-13T19:00:00Z", 4 * 60, "2026-11-14"],
  ])("AC-12: %s で %s は、%i 分・%s", (timeZone, iso, minute, diaryDate) => {
    expect(localNow(at(iso), timeZone)).toStrictEqual({ minute, diaryDate });
  });
});

describe("送る時刻か（選んだ時刻から 60 分のうち）", () => {
  const nine = { remindMinute: 1260, timeZone: "Asia/Tokyo", lastSentOn: null };

  test.each([
    ["21:00 ちょうど", "2026-11-13T12:00:00Z"],
    ["21:07（ふつうのずれ）", "2026-11-13T12:07:00Z"],
    ["21:38（1 回飛んだ次の回）", "2026-11-13T12:38:00Z"],
    ["21:59（60 分の終わり）", "2026-11-13T12:59:00Z"],
  ])("AC-11: 21:00 にした人に、%s は送る", (_, iso) => {
    expect(dueDiaryDate(nine, at(iso))).toBe("2026-11-13");
  });

  test.each([
    ["20:58（まだ前）", "2026-11-13T11:58:00Z"],
    ["22:00（60 分を過ぎた）", "2026-11-13T13:00:00Z"],
    ["夜中の 2:00", "2026-11-13T17:00:00Z"],
  ])("AC-11: 21:00 にした人に、%s は送らない", (_, iso) => {
    expect(dueDiaryDate(nine, at(iso))).toBeNull();
  });

  test("AC-13: その日にもう送っていれば送らない。前の日に送っただけなら送る", () => {
    const now = at("2026-11-13T12:07:00Z");

    expect(dueDiaryDate({ ...nine, lastSentOn: "2026-11-13" }, now)).toBeNull();
    expect(dueDiaryDate({ ...nine, lastSentOn: "2026-11-12" }, now)).toBe(
      "2026-11-13",
    );
  });

  test("AC-12: 0 時をまたいでも数え、「その日」は前の日のまま（23:30 にした人に 0:10）", () => {
    const late = {
      remindMinute: 1410,
      timeZone: "Asia/Tokyo",
      lastSentOn: null,
    };

    expect(dueDiaryDate(late, at("2026-11-13T15:10:00Z"))).toBe("2026-11-13");
  });

  test("AC-12: 0:00 にした人の「その日」は、朝 4 時区切りで前の日", () => {
    const midnight = {
      remindMinute: 0,
      timeZone: "Asia/Tokyo",
      lastSentOn: null,
    };

    expect(dueDiaryDate(midnight, at("2026-11-13T15:20:00Z"))).toBe(
      "2026-11-13",
    );
  });

  test("AC-12: 時刻は、その宛先のタイムゾーンで数える（ニューヨークの 21:00）", () => {
    const newYork = {
      remindMinute: 1260,
      timeZone: "America/New_York",
      lastSentOn: null,
    };

    expect(dueDiaryDate(newYork, at("2026-11-13T12:07:00Z"))).toBeNull();
    expect(dueDiaryDate(newYork, at("2026-11-14T02:07:00Z"))).toBe(
      "2026-11-13",
    );
  });
});
