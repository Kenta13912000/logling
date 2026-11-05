import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "vitest";

const PUBLIC_URL = "https://logling.vercel.app";

test("AC-11: README の上のほう（最初の 10 行）に、公開の URL が載っている", () => {
  const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");
  const top = readme.split("\n").slice(0, 10).join("\n");

  expect(top).toContain(PUBLIC_URL);
});
