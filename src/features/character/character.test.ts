import { describe, expect, test } from "vitest";

import {
  EXP_PER_ENTRY,
  createCharacter,
  expToNextLevel,
  gainExp,
  getLevelInfo,
} from "./character";

describe("createCharacter", () => {
  test("AC-2: 経験値 0 のキャラクターができる", () => {
    expect(createCharacter("ぴよ")).toEqual({ name: "ぴよ", totalExp: 0 });
  });
});

describe("expToNextLevel", () => {
  test("次のレベルまでに必要な量は 20 + 10 × 今のレベル", () => {
    expect(expToNextLevel(1)).toBe(30);
    expect(expToNextLevel(2)).toBe(40);
    expect(expToNextLevel(3)).toBe(50);
  });
});

describe("getLevelInfo", () => {
  test("AC-10: 経験値 0 は Lv1、0 / 30、残り 30", () => {
    expect(getLevelInfo(0)).toEqual({
      level: 1,
      expInLevel: 0,
      expToNext: 30,
      remaining: 30,
    });
  });

  test("AC-10: 経験値 29 はまだ Lv1", () => {
    expect(getLevelInfo(29)).toMatchObject({
      level: 1,
      expInLevel: 29,
      remaining: 1,
    });
  });

  test("AC-11: 経験値 30 で Lv2 になり、次は 0 / 40", () => {
    expect(getLevelInfo(30)).toEqual({
      level: 2,
      expInLevel: 0,
      expToNext: 40,
      remaining: 40,
    });
  });

  test("AC-11: 経験値 70 で Lv3、経験値 630 で Lv10", () => {
    expect(getLevelInfo(70)).toMatchObject({ level: 3, expInLevel: 0 });
    expect(getLevelInfo(630)).toMatchObject({ level: 10, expInLevel: 0 });
  });
});

describe("gainExp", () => {
  test("AC-9: 日記 1 件の経験値は 10", () => {
    expect(EXP_PER_ENTRY).toBe(10);
  });

  test("AC-9: 経験値を足したキャラクターを返し、元のデータは変えない", () => {
    const before = { name: "ぴよ", totalExp: 0 };
    const result = gainExp(before, EXP_PER_ENTRY);

    expect(result.character).toEqual({ name: "ぴよ", totalExp: 10 });
    expect(before.totalExp).toBe(0);
  });

  test("AC-11: 必要な量に達するとレベルが上がったことを返す", () => {
    const result = gainExp({ name: "ぴよ", totalExp: 20 }, EXP_PER_ENTRY);

    expect(result.leveledUp).toBe(true);
    expect(result.level).toBe(2);
  });

  test("AC-13: 必要な量に達しないときはレベルが上がらない", () => {
    const result = gainExp({ name: "ぴよ", totalExp: 0 }, EXP_PER_ENTRY);

    expect(result.leveledUp).toBe(false);
    expect(result.level).toBe(1);
  });
});
