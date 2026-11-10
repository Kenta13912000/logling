import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { BrokenDataNotice } from "./BrokenDataNotice";

test("character-evolution AC-17: キャラクターがわからないので、段階 1 の絵が飾りとして出る", () => {
  const { container } = render(<BrokenDataNotice onReset={() => {}} />);

  expect(
    screen.getByText("データを読み込めなかったみたい…"),
  ).toBeInTheDocument();
  const art = container.querySelector("img");
  expect(art).toHaveAttribute("src", "/characters/stage-1.svg");
  expect(art).toHaveAttribute("alt", "");
});
