import { expect, test } from "vitest";

import { TABS, currentTab } from "./tabs";

test("AC-1: タブは「ホーム」「ふりかえる」「その他」の 3 つで、それぞれホーム・ふりかえり・その他の画面へ行く", () => {
  expect(TABS.map(({ label, href }) => [label, href])).toEqual([
    ["ホーム", "/"],
    ["ふりかえる", "/history"],
    ["その他", "/more"],
  ]);
});

test.each([
  ["/", "home"],
  ["/history", "history"],
  ["/more", "more"],
  ["/account", "more"],
  ["/privacy", "more"],
  ["/settings", "more"],
] as const)("AC-3: %s の今いるタブは %s", (pathname, tab) => {
  expect(currentTab(pathname)).toBe(tab);
});

test("AC-3: どのタブにも入らないページでは、今いるタブはない", () => {
  expect(currentTab("/no-such-page")).toBeNull();
});
