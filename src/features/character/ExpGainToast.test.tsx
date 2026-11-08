import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { EXP_GAIN_TOAST_MS, ExpGainToast } from "./ExpGainToast";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test("AC-9: 増えた経験値のお知らせが表示される", () => {
  render(<ExpGainToast amount={10} onDone={() => {}} />);

  expect(screen.getByRole("status")).toHaveTextContent("✨ +10 経験値！");
});

test("streak AC-9: ボーナスがあれば、2 行目に連続日数とボーナスが出る", () => {
  render(
    <ExpGainToast
      amount={10}
      bonus={{ days: 7, amount: 20 }}
      onDone={() => {}}
    />,
  );

  const toast = screen.getByRole("status");
  expect(toast).toHaveTextContent("✨ +10 経験値！");
  expect(toast).toHaveTextContent("🔥 7 日連続！ボーナス +20");
});

test("streak AC-11: ボーナスがなければ、ボーナスの行は出ない", () => {
  render(<ExpGainToast amount={10} onDone={() => {}} />);

  expect(screen.getByRole("status")).not.toHaveTextContent("ボーナス");
});

test("AC-9: お知らせは 2〜3 秒で終わったことが伝わる", () => {
  const onDone = vi.fn();
  render(<ExpGainToast amount={10} onDone={onDone} />);

  expect(EXP_GAIN_TOAST_MS).toBeGreaterThanOrEqual(2000);
  expect(EXP_GAIN_TOAST_MS).toBeLessThanOrEqual(3000);

  act(() => {
    vi.advanceTimersByTime(EXP_GAIN_TOAST_MS - 1);
  });
  expect(onDone).not.toHaveBeenCalled();

  act(() => {
    vi.advanceTimersByTime(1);
  });
  expect(onDone).toHaveBeenCalledTimes(1);
});
