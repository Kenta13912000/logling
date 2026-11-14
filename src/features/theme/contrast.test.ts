import { expect, test } from "vitest";

import { contrastRatio } from "./contrast";

test("AC-12: 白と黒は 21、同じ色どうしは 1 で、並べる順番によらない", () => {
  expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
  expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  expect(contrastRatio("#c2410c", "#c2410c")).toBeCloseTo(1, 5);
});

test("AC-12: WCAG の計算どおりの値になる（オレンジのボタンの白い文字は 5.18）", () => {
  expect(contrastRatio("#ffffff", "#c2410c")).toBeCloseTo(5.18, 2);
  expect(contrastRatio("#7a6450", "#fff8ec")).toBeCloseTo(5.28, 2);
});

test("AC-12: 大文字の色の書き方でも同じ値になる", () => {
  expect(contrastRatio("#FFFFFF", "#C2410C")).toBeCloseTo(5.18, 2);
});
