import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { CharacterStatus } from "./CharacterStatus";

describe("character-evolution", () => {
  // 180 EXP is exactly Lv. 5 (30 + 40 + 50 + 60).
  test("AC-1, AC-4: Lv. 4 では、ねこだまの絵と段階の名前が出て、絵の説明が読める", () => {
    render(<CharacterStatus character={{ name: "ぴよ", totalExp: 179 }} />);

    expect(
      screen.getByRole("img", { name: "ぴよ のすがた（ねこだま）" }),
    ).toHaveAttribute("src", "/characters/stage-1.svg");
    expect(screen.getByText("ねこだま")).toBeInTheDocument();
  });

  test("AC-1: Lv. 5 になると、ころねこの絵と段階の名前になる", () => {
    render(<CharacterStatus character={{ name: "ぴよ", totalExp: 180 }} />);

    expect(
      screen.getByRole("img", { name: "ぴよ のすがた（ころねこ）" }),
    ).toHaveAttribute("src", "/characters/stage-2.svg");
    expect(screen.getByText("ころねこ")).toBeInTheDocument();
  });
});

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
