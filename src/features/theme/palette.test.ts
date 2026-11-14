// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { contrastRatio } from "./contrast";
import { readPalette } from "./palette";
import { THEME_COLORS } from "./theme-color";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const { light, dark } = readPalette(css);

/** Every pair of `front` on `back` reaches `min`. */
function expectContrast(front: string[], back: string[], min: number) {
  for (const f of front) {
    for (const b of back) {
      const ratio = contrastRatio(dark[f] ?? f, dark[b] ?? b);
      expect(ratio, `${f} / ${b}`).toBeGreaterThanOrEqual(min);
    }
  }
}

describe("明るい色", () => {
  test("AC-11: 明るい色の値は今と同じ（新しい色の決まりも、今まで直接書いていた色と同じ）", () => {
    expect(light).toMatchObject({
      cream: "#fff8ec",
      ink: "#3f2d1c",
      "ink-muted": "#7a6450",
      line: "#ecdcc4",
      ember: "#c2410c",
      honey: "#d97706",
      "honey-track": "#f6e7cf",
      alert: "#b42318",
      surface: "#ffffff",
      link: "#c2410c",
      danger: "#b42318",
      "ember-soft": "#fde7d6",
      "switch-off": "#d8cbb8",
      "line-strong": "#d8c4a6",
      ok: "#3f6b2a",
    });
    expect(light.scrim).toMatch(/^rgb\(63 45 28 \/ 0?\.45\)$/);
  });
});

describe("暗い色", () => {
  test("AC-11: 暗い色の設定では、背景・カード・文字の色が変わる", () => {
    for (const name of ["cream", "surface", "ink", "ink-muted", "line"]) {
      expect(dark[name], name).toBeDefined();
      expect(dark[name], name).not.toBe(light[name]);
    }
    // The background is dark: black on it is much weaker than white on it.
    expect(contrastRatio(dark.cream!, "#ffffff")).toBeGreaterThan(
      contrastRatio(dark.cream!, "#000000"),
    );
  });

  test("AC-12: 文字・薄い文字・リンク・注意の文字は、背景・カード・案内の枠の上で 4.5 : 1 以上", () => {
    expectContrast(
      ["ink", "ink-muted", "link", "alert"],
      ["cream", "surface", "ember-soft"],
      4.5,
    );
    expectContrast(["ok"], ["cream", "surface"], 4.5);
  });

  test("AC-12: ボタンの白い文字と、お知らせ（トースト）の文字は 4.5 : 1 以上", () => {
    expectContrast(["#ffffff"], ["ember", "danger"], 4.5);
    expectContrast(["surface"], ["ink"], 4.5);
  });

  test("AC-12, AC-13: 経験値のバー・今いるタブ・ほかのタブ・切りかえのオンは、まわりと 3 : 1 以上", () => {
    expectContrast(["honey"], ["honey-track"], 3);
    expectContrast(["link", "ink-muted", "ember"], ["surface"], 3);
  });

  test("AC-13: 確認の窓の後ろの幕は、暗い色では黒", () => {
    expect(dark.scrim).toMatch(/^rgb\(0 0 0 \/ 0?\.6\)$/);
  });

  test("AC-12: ボタンの地の色は、明るい色と同じ", () => {
    expect(dark.ember).toBe("#c2410c");
    expect(dark.danger).toBe("#b42318");
  });
});

describe("ブラウザの上の帯の色", () => {
  test("AC-14: 明るい色・暗い色それぞれの背景の色と同じ", () => {
    expect(THEME_COLORS.light).toBe(light.cream);
    expect(THEME_COLORS.dark).toBe(dark.cream);
  });
});
