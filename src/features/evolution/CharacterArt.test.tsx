import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { CharacterArt } from "./CharacterArt";
import { getStage } from "./stages";

// Level 6 is stage 2 (ころねこ): crop x 85, y 126, side 240.
const KORONEKO = getStage(6);

test("AC-4: 説明を渡すと、読み上げで「<名前> のすがた（<段階の名前>）」と読める", () => {
  render(
    <CharacterArt stage={KORONEKO} size={64} alt="ぴよ のすがた（ころねこ）" />,
  );

  expect(
    screen.getByRole("img", { name: "ぴよ のすがた（ころねこ）" }),
  ).toHaveAttribute("src", "/characters/stage-2.svg");
});

test("AC-4: 説明を渡さなければ、飾りとして読み上げない", () => {
  const { container } = render(<CharacterArt stage={KORONEKO} size={48} />);

  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(container.querySelector("img")).toHaveAttribute("alt", "");
});

test("切り取らないときは、絵全体を指定の大きさで出す", () => {
  const { container } = render(<CharacterArt stage={KORONEKO} size={240} />);

  const img = container.querySelector("img");
  expect(img).toHaveAttribute("width", "240");
  expect(img).toHaveAttribute("height", "240");
});

test("切り取るときは、枠が指定の大きさになり、表の範囲が枠いっぱいになるよう絵を拡大する", () => {
  const { container } = render(
    <CharacterArt stage={KORONEKO} size={64} crop />,
  );

  const img = container.querySelector("img")!;
  const frame = img.parentElement!;
  expect(frame.style.width).toBe("64px");
  expect(frame.style.height).toBe("64px");
  expect(frame.style.overflow).toBe("hidden");

  // scale = 64 / 240: the 400px art becomes 106.67px wide.
  expect(parseFloat(img.style.width)).toBeCloseTo((400 * 64) / 240, 2);
  expect(parseFloat(img.style.left)).toBeCloseTo((-85 * 64) / 240, 2);
  expect(parseFloat(img.style.top)).toBeCloseTo((-126 * 64) / 240, 2);
});
