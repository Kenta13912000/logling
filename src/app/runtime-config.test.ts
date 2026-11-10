import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "vitest";

const root = process.cwd();

// Vercel picks the newest Node major for ranges like ">=24" (ADR-0003),
// so the range must stay within the same major as .nvmrc used locally and in CI.
test("Node の指定は .nvmrc と同じ版を下限にし、同じメジャーバージョンだけに合う", () => {
  const nvmrc = readFileSync(join(root, ".nvmrc"), "utf8").trim();
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

  expect(pkg.engines.node).toBe(`^${nvmrc}`);
});

const majorOf = (version: string) =>
  Number(version.replace(/^v/, "").split(".")[0]);

// ADR-0004: move to Node 26 LTS before account-sync adds server-side code.
test("Node 26 を使う", () => {
  const nvmrc = readFileSync(join(root, ".nvmrc"), "utf8").trim();

  expect(majorOf(nvmrc)).toBe(26);
});

// Catches a local Node left behind after .nvmrc is bumped.
test("テストを動かしている Node は .nvmrc と同じメジャーバージョン", () => {
  const nvmrc = readFileSync(join(root, ".nvmrc"), "utf8").trim();

  expect(majorOf(process.version)).toBe(majorOf(nvmrc));
});
