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
