import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { STORAGE_KEY, type SaveData } from "@/features/home/save-data";

import { HistoryPage } from "./HistoryPage";

function store(data: SaveData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const withEntries = (entries: SaveData["entries"]): SaveData => ({
  version: 1,
  character: { name: "ぴよ", totalExp: 30 },
  entries,
});

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  // Months are 0-based: 10 = November.
  vi.setSystemTime(new Date(2026, 10, 7, 21, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

test("AC-1: 上の帯に、ホームへ戻るリンクがある", () => {
  store(withEntries([]));
  render(<HistoryPage />);

  // The arrow is decorative, so the link is announced as just "ホーム".
  expect(screen.getByRole("link", { name: "ホーム" })).toHaveAttribute(
    "href",
    "/",
  );
});

test("AC-5: キャラクターがいないときは、ホームで名前を付けるよう案内する", () => {
  render(<HistoryPage />);

  expect(screen.getByText(/ホームで名前を付けてね/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "ホームへ" })).toHaveAttribute(
    "href",
    "/",
  );
});

test("AC-4: 日記が 1 件もないときは、まだ日記がないことを案内する", () => {
  store(withEntries([]));
  render(<HistoryPage />);

  expect(screen.getByText(/まだ日記がないよ/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "ホームへ" })).toHaveAttribute(
    "href",
    "/",
  );
  expect(screen.queryByRole("list")).not.toBeInTheDocument();
});

test("AC-2: 日記があるときは、見出しと案内の文と一覧が表示される", () => {
  store(
    withEntries([
      {
        date: "2026-11-07",
        body: "今日は晴れた。",
        createdAt: "2026-11-07T12:00:00.000Z",
      },
    ]),
  );
  render(<HistoryPage />);

  expect(
    screen.getByRole("heading", { level: 1, name: "ふりかえり" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("最近 7 日の日記は、書き直したり消したりできるよ"),
  ).toBeInTheDocument();
  expect(screen.getByText("今日は晴れた。")).toBeInTheDocument();
});

test("AC-20: 開き直しても、保存されている日記がそのまま表示される", () => {
  store(
    withEntries([
      {
        date: "2026-11-05",
        body: "あとから書いた",
        createdAt: "2026-11-07T12:00:00.000Z",
        writtenLater: true,
      },
    ]),
  );
  const { unmount } = render(<HistoryPage />);
  unmount();
  render(<HistoryPage />);

  expect(screen.getByText("あとから書いた")).toBeInTheDocument();
  expect(screen.getByText("あとから")).toBeInTheDocument();
});

test("保存データが壊れているときは、ホームへ案内する", () => {
  localStorage.setItem(STORAGE_KEY, "{oops");
  render(<HistoryPage />);

  expect(
    screen.getByText(/データを読み込めなかったみたい/),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "ホームへ" })).toHaveAttribute(
    "href",
    "/",
  );
});
