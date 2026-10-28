import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { Home } from "./Home";
import { STORAGE_KEY, type SaveData } from "./save-data";

// Months are 0-based in the Date constructor: 9 = October.
function setNow(...args: [number, number, number, number, number]) {
  vi.setSystemTime(new Date(...args));
}

function store(data: SaveData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function stored(): SaveData {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
}

const piyo = (totalExp: number): SaveData => ({
  version: 1,
  character: { name: "ぴよ", totalExp },
  entries: [],
});

async function writeDiary(text: string) {
  const user = userEvent.setup();
  await user.type(screen.getByRole("textbox", { name: "今日の日記" }), text);
  await user.click(screen.getByRole("button", { name: "日記をのこす" }));
  return user;
}

beforeEach(() => {
  localStorage.clear();
  // Fake only Date so userEvent's timers keep running.
  vi.useFakeTimers({ toFake: ["Date"] });
  setNow(2026, 9, 28, 21, 0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("初めて開いたとき", () => {
  test("AC-1: アプリ名と名前の入力欄が表示される", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "logling" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("名前（10 文字まで）")).toBeInTheDocument();
  });

  test("AC-5: 名前を付けると、ステータスと今日の日記の入力欄が表示され、保存される", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.type(screen.getByLabelText("名前（10 文字まで）"), "ぴよ");
    await user.click(screen.getByRole("button", { name: "この名前にする" }));

    expect(screen.getByText("Lv. 1")).toBeInTheDocument();
    expect(screen.getByText("2026年10月28日（水）")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "今日の日記" }),
    ).toBeInTheDocument();
    expect(stored()).toEqual(piyo(0));
  });
});

describe("日記を保存したとき", () => {
  test("AC-6, AC-9, AC-14: 今日の日記に切り替わり、経験値が 10 増えて、保存される", async () => {
    store(piyo(0));
    render(<Home />);

    await writeDiary("晴れた。");

    expect(screen.getByText("晴れた。")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("10 / 30")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("✨ +10 経験値！");

    const data = stored();
    expect(data.character).toEqual({ name: "ぴよ", totalExp: 10 });
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0]).toMatchObject({
      date: "2026-10-28",
      body: "晴れた。",
    });
  });

  test("AC-11, AC-12: 必要な経験値に達すると、レベルが上がりお知らせが出る", async () => {
    store(piyo(20));
    render(<Home />);

    await writeDiary("晴れた。");

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "ぴよ が レベル 2 になった！",
    );
    expect(screen.getByText("Lv. 2")).toBeInTheDocument();
  });

  test("AC-12: お知らせは「とじる」で閉じられる", async () => {
    store(piyo(20));
    render(<Home />);

    const user = await writeDiary("晴れた。");
    await user.click(screen.getByRole("button", { name: "とじる" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("AC-13: レベルが上がらなかったときは、お知らせは出ない", async () => {
    store(piyo(0));
    render(<Home />);

    await writeDiary("晴れた。");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("AC-22: 保存に失敗したら、メッセージが出て、文章は残り、経験値は入らない", async () => {
    store(piyo(0));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    render(<Home />);

    await writeDiary("晴れた。");

    expect(screen.getByText(/保存できなかった/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "今日の日記" })).toHaveValue(
      "晴れた。",
    );
    expect(screen.getByText("0 / 30")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("開き直したとき", () => {
  test("AC-16: 保存した名前・レベル・経験値と、今日の日記が表示される", async () => {
    store(piyo(0));
    const { unmount } = render(<Home />);
    await writeDiary("晴れた。");
    unmount();

    render(<Home />);

    expect(screen.getByText("ぴよ")).toBeInTheDocument();
    expect(screen.getByText("Lv. 1")).toBeInTheDocument();
    expect(screen.getByText("10 / 30")).toBeInTheDocument();
    expect(screen.getByText("晴れた。")).toBeInTheDocument();
  });

  test("AC-15: 朝 4 時より前に開くと、前の日の日記を書いた状態のまま", () => {
    store({
      ...piyo(10),
      entries: [
        {
          date: "2026-10-28",
          body: "晴れた。",
          createdAt: "2026-10-28T14:00:00.000Z",
        },
      ],
    });
    setNow(2026, 9, 29, 3, 59);

    render(<Home />);

    expect(screen.getByText("晴れた。")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  test("AC-15: 開いたまま朝 4 時を過ぎて画面に戻ると、次の日の日記を書ける", () => {
    store({
      ...piyo(10),
      entries: [
        {
          date: "2026-10-28",
          body: "晴れた。",
          createdAt: "2026-10-28T14:00:00.000Z",
        },
      ],
    });
    render(<Home />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    setNow(2026, 9, 29, 4, 30);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(screen.getByText("2026年10月29日（木）")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "今日の日記" }),
    ).toBeInTheDocument();
  });
});

describe("保存データが壊れているとき", () => {
  test("AC-21: お知らせが出て、データは勝手に消されない", () => {
    localStorage.setItem(STORAGE_KEY, "{oops");

    render(<Home />);

    expect(
      screen.getByText(/データを読み込めなかったみたい/),
    ).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBe("{oops");
  });

  test("AC-21: 「はじめからにする」を選ぶと、控えを残して名前の入力に戻る", async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_KEY, "{oops");
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "はじめからにする" }));

    expect(screen.getByLabelText("名前（10 文字まで）")).toBeInTheDocument();
    const backupKeys = Object.keys(localStorage).filter((key) =>
      key.startsWith(`${STORAGE_KEY}:broken:`),
    );
    expect(backupKeys).toHaveLength(1);
    expect(localStorage.getItem(backupKeys[0])).toBe("{oops");
  });
});

describe("外部への送信", () => {
  test("AC-17: 名前を付けて日記を保存するまで、外部に何も送らない", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const sendSpy = vi.spyOn(XMLHttpRequest.prototype, "send");
    const user = userEvent.setup();
    render(<Home />);

    await user.type(screen.getByLabelText("名前（10 文字まで）"), "ぴよ");
    await user.click(screen.getByRole("button", { name: "この名前にする" }));
    await writeDiary("晴れた。");

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(sendSpy).not.toHaveBeenCalled();
  });
});
