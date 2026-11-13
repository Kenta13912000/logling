import { expect, test } from "vitest";

import { isStandalone, type DisplayEnv } from "./display-mode";

function env({
  displayMode,
  iosStandalone,
}: {
  displayMode: "standalone" | "browser";
  iosStandalone?: boolean;
}): DisplayEnv {
  return {
    matchMedia: (query) => ({
      matches: query === `(display-mode: ${displayMode})`,
    }),
    navigator: { standalone: iosStandalone },
  };
}

test("AC-5: 開き方が standalone なら、ホーム画面から開いている", () => {
  expect(isStandalone(env({ displayMode: "standalone" }))).toBe(true);
});

test("AC-5: iPhone の navigator.standalone が true なら、ホーム画面から開いている", () => {
  expect(
    isStandalone(env({ displayMode: "browser", iosStandalone: true })),
  ).toBe(true);
});

test("AC-5: どちらでもなければ、ブラウザで開いている", () => {
  expect(isStandalone(env({ displayMode: "browser" }))).toBe(false);
  expect(
    isStandalone(env({ displayMode: "browser", iosStandalone: false })),
  ).toBe(false);
});
