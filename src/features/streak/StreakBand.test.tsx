import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { StreakBand } from "./StreakBand";

function renderBand(...args: Parameters<typeof status>) {
  render(<StreakBand status={status(...args)} />);
  return screen.getByRole("group", { name: "連続記録" });
}

function status(
  writtenToday: boolean,
  days: number,
  next: { days: number; bonus: number; remaining: number },
) {
  return { writtenToday, days, next };
}

test("AC-1, AC-7: 今日書いたときは、今日までの連続日数と次の区切りが出る", () => {
  const band = renderBand(true, 5, { days: 7, bonus: 20, remaining: 2 });

  expect(band).toHaveTextContent("🔥 5 日連続");
  expect(band).toHaveTextContent("あと 2 日で 7 日連続。ボーナス +20");
  expect(band).not.toHaveTextContent("今日書くと");
});

test("AC-2, AC-7: 今日まだのときは、昨日までの日数と、今日書くと何日になるかが出る", () => {
  const band = renderBand(false, 4, { days: 7, bonus: 20, remaining: 3 });

  expect(band).toHaveTextContent("🔥 4 日連続中。今日書くと 5 日！");
  expect(band).toHaveTextContent("あと 3 日で 7 日連続。ボーナス +20");
});

test("AC-3: 続いていないときは「0 日」と出さず、今日書くと 1 日目になると出る", () => {
  const band = renderBand(false, 0, { days: 3, bonus: 10, remaining: 3 });

  expect(band).toHaveTextContent("🔥 今日書くと 1 日目！");
  expect(band).toHaveTextContent("あと 3 日で 3 日連続。ボーナス +10");
  expect(band).not.toHaveTextContent("0 日");
});

test("AC-23: 帯には「連続記録」の名前があり、🔥 は飾りなので読み上げでは読まない", () => {
  renderBand(true, 5, { days: 7, bonus: 20, remaining: 2 });

  expect(screen.getByRole("group", { name: "連続記録" })).toBeInTheDocument();
  expect(screen.getByText("🔥")).toHaveAttribute("aria-hidden", "true");
});
