import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { CharacterStatus } from "./CharacterStatus";

test("AC-10: 名前・レベル・経験値の進み具合・残りが表示される", () => {
  render(<CharacterStatus character={{ name: "ぴよ", totalExp: 10 }} />);

  expect(screen.getByText("ぴよ")).toBeInTheDocument();
  expect(screen.getByText("Lv. 1")).toBeInTheDocument();
  expect(screen.getByText("10 / 30")).toBeInTheDocument();
  expect(screen.getByText("あと 20 でレベルアップ")).toBeInTheDocument();

  const bar = screen.getByRole("progressbar");
  expect(bar).toHaveAttribute("aria-valuenow", "10");
  expect(bar).toHaveAttribute("aria-valuemax", "30");
});

test("AC-10: レベルが上がると、新しいレベルの進み具合が表示される", () => {
  render(<CharacterStatus character={{ name: "ぴよ", totalExp: 30 }} />);

  expect(screen.getByText("Lv. 2")).toBeInTheDocument();
  expect(screen.getByText("0 / 40")).toBeInTheDocument();
  expect(screen.getByText("あと 40 でレベルアップ")).toBeInTheDocument();
});
