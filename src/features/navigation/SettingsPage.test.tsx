import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { SettingsPage } from "./SettingsPage";

test("AC-7: 設定を開くと、設定はこれから増えることがわかる", () => {
  render(<SettingsPage />);

  expect(
    screen.getByRole("heading", { level: 1, name: "設定" }),
  ).toBeInTheDocument();
  expect(screen.getByText("設定は、これから増えるよ")).toBeInTheDocument();
  expect(
    screen.getByText("たとえば、日記を書く時間のお知らせなど"),
  ).toBeInTheDocument();
});
