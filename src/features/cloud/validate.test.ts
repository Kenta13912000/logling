import { describe, expect, test } from "vitest";

import { BODY_MAX_LENGTH } from "@/features/diary/diary";

import {
  MAX_EXP_PER_ENTRY,
  isDiaryDate,
  isExp,
  parseBody,
  parseCharacter,
  parseEntry,
  parseName,
} from "./validate";

// AC-8: the server stores only well-formed data sent from the browser.
describe("日付", () => {
  test("AC-8: 「年-月-日」の形で、実際にある日付だけを受け付ける", () => {
    expect(isDiaryDate("2026-11-12")).toBe(true);
    expect(isDiaryDate("2026-02-30")).toBe(false);
    expect(isDiaryDate("2026-11-12T00:00:00Z")).toBe(false);
    expect(isDiaryDate(20261112)).toBe(false);
  });
});

describe("経験値", () => {
  test("AC-8: 0 から 1 件の日記で入る最大（いつもの 10 ＋ ボーナス 50）までの整数だけを受け付ける", () => {
    expect(MAX_EXP_PER_ENTRY).toBe(60);
    expect(isExp(0)).toBe(true);
    expect(isExp(60)).toBe(true);
    expect(isExp(61)).toBe(false);
    expect(isExp(-1)).toBe(false);
    expect(isExp(1.5)).toBe(false);
    expect(isExp("10")).toBe(false);
  });
});

describe("本文", () => {
  test("AC-8: 空や長すぎる本文は受け付けず、前後の空白は落とす", () => {
    expect(parseBody("  今日の日記  ")).toBe("今日の日記");
    expect(parseBody("   ")).toBeNull();
    expect(parseBody("あ".repeat(BODY_MAX_LENGTH + 1))).toBeNull();
    expect(parseBody(42)).toBeNull();
  });
});

describe("キャラクター", () => {
  test("AC-8: 正しい名前と経験値、始めた日（なくてもよい）のキャラクターを受け付ける", () => {
    expect(
      parseCharacter({ name: "ぴよ", totalExp: 0, startDate: "2026-11-12" }),
    ).toStrictEqual({ name: "ぴよ", totalExp: 0, startDate: "2026-11-12" });
    expect(parseCharacter({ name: "ぴよ", totalExp: 120 })).toStrictEqual({
      name: "ぴよ",
      totalExp: 120,
    });
  });

  test("AC-8: 名前が空・長すぎる、経験値がおかしい、始めた日の形が違うキャラクターは受け付けない", () => {
    expect(parseCharacter({ name: "", totalExp: 0 })).toBeNull();
    expect(parseCharacter({ name: "あ".repeat(11), totalExp: 0 })).toBeNull();
    expect(parseCharacter({ name: "ぴよ", totalExp: -1 })).toBeNull();
    expect(
      parseCharacter({ name: "ぴよ", totalExp: 0, startDate: "11/12" }),
    ).toBeNull();
    expect(parseCharacter(null)).toBeNull();
  });
});

describe("新しい名前", () => {
  test("settings AC-3: 名前を付けるときと同じ決まりで、前後の空白を落とした名前を受け付ける", () => {
    expect(parseName(" ちびすけ ")).toBe("ちびすけ");
    expect(parseName("あ".repeat(10))).toBe("あ".repeat(10));
  });

  test("settings AC-3: 空・空白だけ・11 文字以上・文字でない名前は受け付けない", () => {
    expect(parseName("")).toBeNull();
    expect(parseName("   ")).toBeNull();
    expect(parseName("あ".repeat(11))).toBeNull();
    expect(parseName(42)).toBeNull();
    expect(parseName(null)).toBeNull();
  });
});

describe("日記", () => {
  const base = {
    date: "2026-11-12",
    body: "今日の日記",
    createdAt: "2026-11-12T12:34:56.789Z",
  };

  test("AC-8: ふつうの日記・後から書いた日記・ボーナスの付いた日記を、そのままの形で受け付ける", () => {
    expect(parseEntry(base)).toStrictEqual(base);
    expect(parseEntry({ ...base, writtenLater: true })).toStrictEqual({
      ...base,
      writtenLater: true,
    });
    expect(parseEntry({ ...base, bonus: 20, bonusDays: 7 })).toStrictEqual({
      ...base,
      bonus: 20,
      bonusDays: 7,
    });
  });

  test("AC-8: 形の違う日記は受け付けない", () => {
    expect(parseEntry({ ...base, date: "2026-13-01" })).toBeNull();
    expect(parseEntry({ ...base, body: "" })).toBeNull();
    expect(parseEntry({ ...base, createdAt: "きのう" })).toBeNull();
    expect(parseEntry({ ...base, writtenLater: false })).toBeNull();
    // The bonus and its streak always come together.
    expect(parseEntry({ ...base, bonus: 20 })).toBeNull();
    expect(parseEntry({ ...base, bonus: 0, bonusDays: 7 })).toBeNull();
  });
});
