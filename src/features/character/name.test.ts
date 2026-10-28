import { describe, expect, test } from "vitest";

import { validateName } from "./name";

describe("validateName", () => {
  test("AC-2: 1〜10 文字の名前は決定できる", () => {
    expect(validateName("ぴよ")).toEqual({ ok: true, name: "ぴよ" });
    expect(validateName("あいうえおかきくけこ")).toEqual({
      ok: true,
      name: "あいうえおかきくけこ",
    });
  });

  test("AC-3: 前後の空白は取り除く", () => {
    expect(validateName("　ぴよ ")).toEqual({ ok: true, name: "ぴよ" });
  });

  test("AC-3: 空や空白だけの名前は決定できない", () => {
    expect(validateName("")).toEqual({ ok: false, reason: "empty" });
    expect(validateName("  　 ")).toEqual({ ok: false, reason: "empty" });
  });

  test("AC-4: 11 文字以上の名前は決定できない", () => {
    expect(validateName("あいうえおかきくけこさ")).toEqual({
      ok: false,
      reason: "tooLong",
    });
  });

  test("AC-2: 絵文字は見た目の 1 文字を 1 と数える", () => {
    expect(validateName("🐣".repeat(10))).toEqual({
      ok: true,
      name: "🐣".repeat(10),
    });
    expect(validateName("👨‍👩‍👧")).toEqual({ ok: true, name: "👨‍👩‍👧" });
    expect(validateName("🐣".repeat(11))).toEqual({
      ok: false,
      reason: "tooLong",
    });
  });
});
