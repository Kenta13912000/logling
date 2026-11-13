import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test } from "vitest";

import { openedFrom, removeMatchMedia } from "@/test/match-media";

import { SettingsPage } from "./SettingsPage";

beforeEach(() => {
  openedFrom("browser");
});

afterEach(() => {
  removeMatchMedia();
});

// pwa-reminder replaced tab-navigation AC-7's "これから増えるよ" with items.
test("pwa-reminder AC-4, AC-21: 「設定」に「ホーム画面に追加」のまとまりがあり、「これから増えるよ」はもうない", () => {
  render(<SettingsPage />);

  expect(
    screen.getByRole("heading", { level: 1, name: "設定" }),
  ).toBeInTheDocument();
  const install = screen.getByRole("region", { name: "ホーム画面に追加" });
  expect(
    within(install).getByRole("heading", {
      level: 2,
      name: "ホーム画面に追加",
    }),
  ).toBeInTheDocument();
  expect(install).toHaveTextContent(
    "ホーム画面に追加すると、アプリのように開けるよ",
  );
  expect(
    screen.queryByText("設定は、これから増えるよ"),
  ).not.toBeInTheDocument();
});
