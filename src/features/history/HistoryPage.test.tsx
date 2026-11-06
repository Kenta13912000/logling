import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { DiaryEntry } from "@/features/diary/diary";
import { Home } from "@/features/home/Home";
import { STORAGE_KEY, type SaveData } from "@/features/home/save-data";

import { HistoryPage } from "./HistoryPage";

function store(data: SaveData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function stored(): SaveData {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
}

const withEntries = (
  entries: SaveData["entries"],
  totalExp = 30,
): SaveData => ({
  version: 1,
  character: { name: "ぴよ", totalExp },
  entries,
});

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

function failSaving() {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("full", "QuotaExceededError");
  });
}

/** The list item (card) that shows the given text. */
function card(text: string | RegExp): HTMLElement {
  return screen.getByText(text).closest("li")!;
}

beforeEach(() => {
  localStorage.clear();
  // Fake only Date so userEvent's timers keep running.
  vi.useFakeTimers({ toFake: ["Date"] });
  // Months are 0-based: 10 = November.
  vi.setSystemTime(new Date(2026, 10, 7, 21, 0));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
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

describe("Bolt-3：書き直しと削除", () => {
  async function rewrite(cardText: string, label: string, body: string) {
    const user = userEvent.setup();
    await user.click(
      within(card(cardText)).getByRole("button", { name: "書き直す" }),
    );
    const textarea = screen.getByRole("textbox", { name: label });
    await user.clear(textarea);
    await user.type(textarea, body);
    await user.click(screen.getByRole("button", { name: "保存する" }));
    return textarea;
  }

  async function openDelete(cardText: string) {
    const user = userEvent.setup();
    await user.click(
      within(card(cardText)).getByRole("button", { name: "消す" }),
    );
    return { user, dialog: screen.getByRole("dialog") };
  }

  test("AC-7, AC-20: 書き直して保存すると本文が変わり、経験値は変わらず、開き直しても残る", async () => {
    store(withEntries([entry("2026-11-07", "今日は晴れた。")], 30));
    const { unmount } = render(<HistoryPage />);

    await rewrite("今日は晴れた。", "11月7日の日記", "今日は雨だった。");

    expect(screen.getByText("今日は雨だった。")).toBeInTheDocument();
    expect(screen.queryByText("今日は晴れた。")).not.toBeInTheDocument();
    expect(stored()).toEqual(
      withEntries([entry("2026-11-07", "今日は雨だった。")], 30),
    );

    unmount();
    render(<HistoryPage />);
    expect(screen.getByText("今日は雨だった。")).toBeInTheDocument();
  });

  test("AC-10, AC-12, AC-20: 後から書いた日記を消すと、5 減って空いた日に戻り、開き直しても残る", async () => {
    store(
      withEntries(
        [
          entry("2026-11-05", "あとから書いた", true),
          entry("2026-11-07", "今日の日記"),
        ],
        35,
      ),
    );
    const { unmount } = render(<HistoryPage />);

    const { user, dialog } = await openDelete("あとから書いた");
    expect(dialog).toHaveTextContent("11月5日の日記を消す？");
    expect(dialog).toHaveTextContent("消すと経験値が 5 減るよ。");
    await user.click(within(dialog).getByRole("button", { name: "消す" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("あとから書いた")).not.toBeInTheDocument();
    expect(card(/11月5日/)).toHaveTextContent("この日はまだ書いていないよ");
    expect(stored()).toEqual(
      withEntries([entry("2026-11-07", "今日の日記")], 30),
    );

    unmount();
    render(<HistoryPage />);
    expect(screen.queryByText("あとから書いた")).not.toBeInTheDocument();
  });

  test("AC-11, AC-21: 書き方の記録がない日記は 10 減り、レベルが下がるときは確認で伝わる", async () => {
    store(
      withEntries(
        [entry("2026-11-06", "昨日の日記"), entry("2026-11-07", "今日の日記")],
        30,
      ),
    );
    render(<HistoryPage />);

    const { user, dialog } = await openDelete("今日の日記");
    expect(dialog).toHaveTextContent("消すと経験値が 10 減るよ。");
    expect(dialog).toHaveTextContent("ぴよ のレベルが 2 から 1 に下がるよ。");
    await user.click(within(dialog).getByRole("button", { name: "消す" }));

    expect(stored().character?.totalExp).toBe(20);
  });

  test("AC-12: 確認で「やめる」を選ぶと、何も変わらない", async () => {
    const data = withEntries([entry("2026-11-07", "今日の日記")], 30);
    store(data);
    render(<HistoryPage />);

    const { user, dialog } = await openDelete("今日の日記");
    await user.click(within(dialog).getByRole("button", { name: "やめる" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("今日の日記")).toBeInTheDocument();
    expect(stored()).toEqual(data);
  });

  test("AC-13: 今日の日記を消したあとは、ホームで今日の日記をもう一度書ける", async () => {
    store(
      withEntries([
        entry("2026-11-06", "昨日の日記"),
        entry("2026-11-07", "今日の日記"),
      ]),
    );
    const { unmount } = render(<HistoryPage />);

    const { user, dialog } = await openDelete("今日の日記");
    await user.click(within(dialog).getByRole("button", { name: "消す" }));
    unmount();
    render(<Home />);

    expect(
      screen.getByRole("textbox", { name: "今日の日記" }),
    ).toBeInTheDocument();
  });

  test("AC-22: 書き直しの保存に失敗すると、メッセージが出て、入力欄と書いた文章が残り、日記は変わらない", async () => {
    const data = withEntries([entry("2026-11-07", "今日は晴れた。")]);
    store(data);
    failSaving();
    render(<HistoryPage />);

    const textarea = await rewrite(
      "今日は晴れた。",
      "11月7日の日記",
      "今日は雨だった。",
    );

    expect(screen.getByText(/保存できなかった/)).toBeInTheDocument();
    expect(textarea).toHaveValue("今日は雨だった。");
    expect(stored()).toEqual(data);
  });

  test("AC-22: 削除の保存に失敗すると、メッセージが出て、日記も経験値も変わらない", async () => {
    const data = withEntries([entry("2026-11-07", "今日の日記")]);
    store(data);
    failSaving();
    render(<HistoryPage />);

    const { user, dialog } = await openDelete("今日の日記");
    await user.click(within(dialog).getByRole("button", { name: "消す" }));

    expect(screen.getByText(/保存できなかった/)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("今日の日記")).toBeInTheDocument();
    expect(stored()).toEqual(data);
  });

  test("開いたまま朝 4 時を過ぎて 8 日以上前になった日記は、書き直さずに伝える", async () => {
    const data = withEntries([
      entry("2026-11-01", "一週間前の日記"),
      entry("2026-11-07", "今日の日記"),
    ]);
    store(data);
    render(<HistoryPage />);
    const user = userEvent.setup();

    await user.click(
      within(card("一週間前の日記")).getByRole("button", { name: "書き直す" }),
    );
    // The diary day moves to 11/8, so 11/1 is now 8 days ago.
    vi.setSystemTime(new Date(2026, 10, 8, 4, 30));
    await user.type(screen.getByRole("textbox"), "書き足し");
    await user.click(screen.getByRole("button", { name: "保存する" }));

    expect(
      screen.getByText(/この日記は、もう書き直したり消したりできないよ/),
    ).toBeInTheDocument();
    expect(stored()).toEqual(data);
  });

  test("開いたまま朝 4 時を過ぎて 8 日以上前になった日記は、消さずに伝える", async () => {
    const data = withEntries([
      entry("2026-11-01", "一週間前の日記"),
      entry("2026-11-07", "今日の日記"),
    ]);
    store(data);
    render(<HistoryPage />);

    const { user, dialog } = await openDelete("一週間前の日記");
    vi.setSystemTime(new Date(2026, 10, 8, 4, 30));
    await user.click(within(dialog).getByRole("button", { name: "消す" }));

    expect(
      screen.getByText(/この日記は、もう書き直したり消したりできないよ/),
    ).toBeInTheDocument();
    expect(stored()).toEqual(data);
  });
});
