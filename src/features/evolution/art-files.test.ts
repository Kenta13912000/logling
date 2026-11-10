import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { STAGES } from "./stages";

/** Things an SVG must not contain before it is shown in the app. */
const FORBIDDEN: Array<[label: string, pattern: RegExp]> = [
  ["スクリプト（<script>）", /<script/i],
  ["動きの指定（onclick など）", /\son[a-z]+\s*=/i],
  ["リンクや外部の参照（href）", /href\s*=/i],
  ["画像の埋め込み（<image>）", /<image/i],
  ["ほかの形式の埋め込み（<foreignObject>）", /<foreignObject/i],
  ["外部の読み込み（url(...)）", /url\(/i],
  ["外部の読み込み（@import）", /@import/i],
  ["文字（<text>。図形にしていない文字）", /<text/i],
];

describe.each(STAGES)("段階 $stage（$name）の絵", ({ src }) => {
  const svg = readFileSync(join(process.cwd(), "public", src), "utf8");

  test("AC-15: SVG のファイルとして存在する", () => {
    expect(svg).toMatch(/<svg[\s>]/);
    expect(svg).toMatch(/viewBox="0 0 400 400"/);
  });

  test.each(FORBIDDEN)("AC-15: %s が入っていない", (_label, pattern) => {
    expect(svg).not.toMatch(pattern);
  });
});

// The favicon is a copy of stage-1.svg that shows only its crop square.
// When stage-1.svg is redrawn, copy it again and keep this viewBox.
describe("ファビコン（src/app/icon.svg）", () => {
  const svg = readFileSync(
    join(process.cwd(), "src", "app", "icon.svg"),
    "utf8",
  );

  test("AC-13: 段階 1 の絵の写しで、余白を切り取った範囲だけを見せる", () => {
    const { x, y, side } = STAGES[0].crop;
    expect(svg).toContain(`viewBox="${x} ${y} ${side} ${side}"`);
    // The body path of ねこだま, so a different picture is caught.
    expect(svg).toContain("M 104 290 C 98 248");
  });

  test.each(FORBIDDEN)("AC-15: %s が入っていない", (_label, pattern) => {
    expect(svg).not.toMatch(pattern);
  });
});
