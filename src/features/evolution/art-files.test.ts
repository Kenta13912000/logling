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
