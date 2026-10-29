import { expect, test } from "vitest";

import { countCharacters } from "./text";

test("見た目の 1 文字を 1 と数える", () => {
  expect(countCharacters("")).toBe(0);
  expect(countCharacters("晴れた")).toBe(3);
  expect(countCharacters("🐣🐣")).toBe(2);
  expect(countCharacters("👨‍👩‍👧")).toBe(1);
  expect(countCharacters("が")).toBe(1);
});

test("改行も 1 文字と数える", () => {
  expect(countCharacters("晴れ\nた")).toBe(4);
});
