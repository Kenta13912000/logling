import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import type { DiaryEntry } from "@/features/diary/diary";

import { buildHistory } from "./history";
import { HistoryList } from "./HistoryList";

const TODAY = "2026-11-07";

const entry = (
  date: string,
  body: string,
  writtenLater = false,
): DiaryEntry => ({
  date,
  body,
  createdAt: `${date}T12:00:00.000Z`,
  ...(writtenLater ? { writtenLater: true as const } : {}),
});

const ENTRIES: DiaryEntry[] = [
  entry("2026-10-31", "ハロウィン"),
  entry("2026-11-05", "あとから書いた", true),
  entry("2026-11-07", "今日は晴れた。\n公園を歩いた。"),
];

function renderList(entries = ENTRIES) {
  render(<HistoryList items={buildHistory(entries, TODAY)} />);
  return screen.getAllByRole("listitem");
}

test("AC-2: 日記が新しい日付の順に、短い日付で並ぶ", () => {
  const items = renderList();

  expect(items[0]).toHaveTextContent("11月7日（土）");
  expect(items[1]).toHaveTextContent("11月6日（金）");
  expect(items[2]).toHaveTextContent("11月5日（木）");
  expect(items.at(-1)).toHaveTextContent("10月31日（土）");
});

test("AC-2: 本文は改行もそのまま表示される", () => {
  renderList();

  expect(screen.getByText(/今日は晴れた。/).textContent).toBe(
    "今日は晴れた。\n公園を歩いた。",
  );
});

test("AC-3: 後から書いた日記にだけ「あとから」の印が付く", () => {
  const items = renderList();

  expect(within(items[2]).getByText("あとから")).toBeInTheDocument();
  expect(within(items[0]).queryByText("あとから")).not.toBeInTheDocument();
});

test("AC-14: 空いた日には、まだ書いていないことと +5 経験値が表示される", () => {
  const items = renderList();

  expect(items[1]).toHaveTextContent(
    "この日はまだ書いていないよ（あとから書くと +5 経験値）",
  );
});

test("AC-18: 8 日以上前の日記の前に、読むだけの区切りの文が出る", () => {
  renderList();

  const divider = screen.getByText(
    "― ここから下は 8 日以上前の日記（読むだけ） ―",
  );
  const old = screen.getByText("ハロウィン");
  expect(
    divider.compareDocumentPosition(old) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});

test("AC-18: 8 日以上前の日記がなければ、区切りの文は出ない", () => {
  renderList(ENTRIES.filter((e) => e.date !== "2026-10-31"));

  expect(screen.queryByText(/8 日以上前の日記/)).not.toBeInTheDocument();
});
