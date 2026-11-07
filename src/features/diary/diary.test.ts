import { describe, expect, test } from "vitest";

import { BODY_MAX_LENGTH, bodyErrorMessage, validateBody } from "./diary";

describe("diary-history: bodyErrorMessage", () => {
  test("AC-8: 書き直しでも diary-exp と同じ文言を使う（空のとき）", () => {
    expect(bodyErrorMessage({ ok: false, reason: "empty", length: 0 })).toBe(
      "なにか書いてくれるとうれしいな",
    );
  });

  test("AC-8: 書き直しでも diary-exp と同じ文言を使う（長すぎるとき）", () => {
    expect(
      bodyErrorMessage({ ok: false, reason: "tooLong", length: 2001 }),
    ).toBe("2000 文字までにしてね（いま 2001 文字）");
  });
});

describe("validateBody", () => {
  test("本文の上限は 2000 文字", () => {
    expect(BODY_MAX_LENGTH).toBe(2000);
  });

  test("AC-6: 1 文字以上の本文は保存できる", () => {
    expect(validateBody("晴れた")).toEqual({ ok: true, body: "晴れた" });
  });

  test("AC-6: 前後の空白・改行は取り除き、途中の改行は残す", () => {
    expect(validateBody("\n  晴れた。\n公園を歩いた。 \n\n")).toEqual({
      ok: true,
      body: "晴れた。\n公園を歩いた。",
    });
  });

  test("AC-7: 空、または空白や改行だけの本文は保存できない", () => {
    expect(validateBody("")).toEqual({ ok: false, reason: "empty", length: 0 });
    expect(validateBody(" \n　\n ")).toEqual({
      ok: false,
      reason: "empty",
      length: 0,
    });
  });

  test("AC-8: 2000 文字までは保存できる", () => {
    const body = "あ".repeat(2000);
    expect(validateBody(body)).toEqual({ ok: true, body });
  });

  test("AC-8: 2001 文字以上は保存できず、文字数を返す", () => {
    expect(validateBody("あ".repeat(2001))).toEqual({
      ok: false,
      reason: "tooLong",
      length: 2001,
    });
  });
});
