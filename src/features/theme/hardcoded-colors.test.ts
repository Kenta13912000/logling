// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { expect, test } from "vitest";

/*
 * AC-13: the screens use the color names from globals.css, so dark mode
 * reaches every part, including parts added later. A color written directly
 * is allowed only with its own dark: value on the same line (the Google
 * button) or as an SVG fill of a logo.
 */

const root = join(process.cwd(), "src");

const components = readdirSync(root, { recursive: true, encoding: "utf8" })
  .filter((file) => file.endsWith(".tsx") && !file.includes(".test."))
  .map((file) => join(root, file));

type Rule = { pattern: RegExp; use: string };

const RULES: Rule[] = [
  { pattern: /\bbg-white\b/, use: "bg-surface" },
  { pattern: /#[0-9a-fA-F]{3,8}\b/, use: "色の決まりの名前" },
  { pattern: /\bbg-ink\/|backdrop:bg-ink\b/, use: "bg-scrim" },
  { pattern: /\btext-ember\b/, use: "text-link" },
  { pattern: /\bbg-alert\b/, use: "bg-danger" },
];

/** A line that may keep a direct color. */
function allowed(line: string): boolean {
  return (
    // Logo colors drawn as SVG attributes.
    /fill="#[0-9a-fA-F]+"/.test(line) ||
    // A direct color with its own dark value next to it.
    line.includes("dark:") ||
    // The switch's knob is white in both color schemes.
    /rounded-full bg-white\b/.test(line)
  );
}

test("AC-13: 画面の部品に、色を直接書いていない（暗い色で変わらない色を使っていない）", () => {
  expect(components.length).toBeGreaterThan(20);
  const found: string[] = [];
  for (const file of components) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, index) => {
      if (allowed(line)) {
        return;
      }
      for (const rule of RULES) {
        if (rule.pattern.test(line)) {
          found.push(
            `${relative(process.cwd(), file)}:${index + 1} → ${rule.use}: ${line.trim()}`,
          );
        }
      }
    });
  }

  expect(found).toStrictEqual([]);
});
