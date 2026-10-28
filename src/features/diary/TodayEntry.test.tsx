import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { TodayEntry } from "./TodayEntry";

const entry = {
  date: "2026-10-28",
  body: "今日は久しぶりに晴れた。\n帰りに公園を歩いた。",
  createdAt: "2026-10-28T13:00:00.000Z",
};

test("AC-14: 今日の日付と、書いた日記の本文が表示される", () => {
  render(<TodayEntry entry={entry} />);

  expect(screen.getByText("2026年10月28日（水）")).toBeInTheDocument();
  const body = screen.getByText(/今日は久しぶりに晴れた。/);
  expect(body.textContent).toBe(entry.body);
});

test("AC-14: 書いてくれたお礼と、次に書ける時間が表示される", () => {
  render(<TodayEntry entry={entry} />);

  expect(
    screen.getByText("今日も書いてくれてありがとう！また明日ね"),
  ).toBeInTheDocument();
  expect(
    screen.getByText("次の日記は、明日の朝 4 時から書けるよ"),
  ).toBeInTheDocument();
});

test("AC-14: 入力欄と保存ボタンは表示されない", () => {
  render(<TodayEntry entry={entry} />);

  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
