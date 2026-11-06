import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

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

function renderList(
  entries = ENTRIES,
  onSaveEdit: (date: string, body: string) => boolean = () => true,
) {
  const handlers = {
    onSaveEdit: vi.fn(onSaveEdit),
    onRequestDelete: vi.fn(),
  };
  render(<HistoryList items={buildHistory(entries, TODAY)} {...handlers} />);
  return {
    ...handlers,
    user: userEvent.setup(),
    items: screen.getAllByRole("listitem"),
  };
}

test("AC-2: 日記が新しい日付の順に、短い日付で並ぶ", () => {
  const { items } = renderList();

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
  const { items } = renderList();

  expect(within(items[2]).getByText("あとから")).toBeInTheDocument();
  expect(within(items[0]).queryByText("あとから")).not.toBeInTheDocument();
});

test("AC-14: 空いた日には、まだ書いていないことと +5 経験値が表示される", () => {
  const { items } = renderList();

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

describe("Bolt-3：書き直しと削除", () => {
  test("AC-6, AC-10: 最近 7 日の日記には「書き直す」と「消す」がある", () => {
    const { items } = renderList();

    for (const item of [items[0], items[2]]) {
      expect(
        within(item).getByRole("button", { name: "書き直す" }),
      ).toBeInTheDocument();
      expect(
        within(item).getByRole("button", { name: "消す" }),
      ).toBeInTheDocument();
    }
  });

  test("AC-18: 8 日以上前の日記と空いた日には「書き直す」「消す」がない", () => {
    const { items } = renderList();

    for (const item of [items[1], items.at(-1)!]) {
      expect(within(item).queryByRole("button", { name: "書き直す" })).toBe(
        null,
      );
      expect(within(item).queryByRole("button", { name: "消す" })).toBe(null);
    }
  });

  test("AC-6: 「書き直す」を押すと、カードの中が今の本文の入った入力欄に変わる", async () => {
    const { user, items } = renderList();

    await user.click(
      within(items[0]).getByRole("button", { name: "書き直す" }),
    );

    expect(
      within(items[0]).getByRole("textbox", { name: "11月7日の日記" }),
    ).toHaveValue("今日は晴れた。\n公園を歩いた。");
  });

  test("書き直し中は、ほかのカードの「書き直す」「消す」が出ない", async () => {
    const { user, items } = renderList();

    await user.click(
      within(items[0]).getByRole("button", { name: "書き直す" }),
    );

    expect(screen.queryAllByRole("button", { name: "書き直す" })).toHaveLength(
      0,
    );
    expect(screen.queryAllByRole("button", { name: "消す" })).toHaveLength(0);
  });

  test("AC-7: 保存すると日付と新しい本文が渡され、保存できたら入力欄が閉じる", async () => {
    const { user, items, onSaveEdit } = renderList();

    await user.click(
      within(items[2]).getByRole("button", { name: "書き直す" }),
    );
    const textarea = screen.getByRole("textbox", { name: "11月5日の日記" });
    await user.clear(textarea);
    await user.type(textarea, "思い出した。");
    await user.click(screen.getByRole("button", { name: "保存する" }));

    expect(onSaveEdit).toHaveBeenCalledWith("2026-11-05", "思い出した。");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  test("AC-22: 保存できなかったときは、入力欄が開いたままで、書いた文章も残る", async () => {
    const { user, items } = renderList(ENTRIES, () => false);

    await user.click(
      within(items[0]).getByRole("button", { name: "書き直す" }),
    );
    const textarea = screen.getByRole("textbox", { name: "11月7日の日記" });
    await user.type(textarea, "書き足し");
    await user.click(screen.getByRole("button", { name: "保存する" }));

    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue("今日は晴れた。\n公園を歩いた。書き足し");
  });

  test("AC-9: 「やめる」を押すと入力欄が閉じ、本文は元のまま", async () => {
    const { user, items, onSaveEdit } = renderList();

    await user.click(
      within(items[0]).getByRole("button", { name: "書き直す" }),
    );
    await user.type(screen.getByRole("textbox"), "書き足し");
    await user.click(screen.getByRole("button", { name: "やめる" }));

    expect(onSaveEdit).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText(/今日は晴れた。/).textContent).toBe(
      "今日は晴れた。\n公園を歩いた。",
    );
  });

  test("AC-10: 「消す」を押すと、その日付で消す確認を頼む", async () => {
    const { user, items, onRequestDelete } = renderList();

    await user.click(within(items[2]).getByRole("button", { name: "消す" }));

    expect(onRequestDelete).toHaveBeenCalledWith("2026-11-05");
  });
});
