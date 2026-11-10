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

describe("diary-history", () => {
  test("AC-1: キャラクターがいると、上の帯に「ふりかえる」のリンクがある", () => {
    store(piyo(0));
    render(<Home />);

    expect(screen.getByRole("link", { name: /ふりかえる/ })).toHaveAttribute(
      "href",
      "/history",
    );
  });

  test("AC-1: 名前を付ける前は「ふりかえる」のリンクを出さない", () => {
    render(<Home />);

    expect(
      screen.queryByRole("link", { name: /ふりかえる/ }),
    ).not.toBeInTheDocument();
  });

  test("AC-24: 名前を付けると、朝 4 時で区切ったその日が始めた日として保存される", async () => {
    // 10/29 3:30 is still diary day 10/28.
    setNow(2026, 9, 29, 3, 30);
    const user = userEvent.setup();
    render(<Home />);

    await user.type(screen.getByLabelText("名前（10 文字まで）"), "ぴよ");
    await user.click(screen.getByRole("button", { name: "この名前にする" }));
    await user.click(screen.getByRole("button", { name: "これにする" }));

    expect(stored().character?.startDate).toBe("2026-10-28");
  });
});

describe("character-evolution", () => {
  // 180 EXP is Lv. 5, the first level of stage 2 (ころねこ).
  test("AC-1, AC-2, AC-5: ステータスと吹き出しに今の段階の絵が出て、開き直しても同じ", () => {
    store(piyo(180));
    const { unmount } = render(<Home />);
    unmount();
    const { container } = render(<Home />);

    expect(
      screen.getByRole("img", { name: "ぴよ のすがた（ころねこ）" }),
    ).toHaveAttribute("src", "/characters/stage-2.svg");
    expect(screen.getByText("ころねこ")).toBeInTheDocument();
    const speechArt = container.querySelector('img[alt=""]');
    expect(speechArt).toHaveAttribute("src", "/characters/stage-2.svg");
  });

  test("AC-6: 今日の日記で次の段階のレベルに上がると、すがたが変わったお知らせが出る", async () => {
    // 170 EXP is Lv. 4 (stage 1); +10 makes 180 = Lv. 5 (stage 2).
    store(piyo(170));
    render(<Home />);

    await writeDiary("晴れた。");

    const dialog = screen.getByRole("dialog", {
      name: "ぴよ が ころねこ になった！",
    });
    expect(dialog).toHaveTextContent("レベル 5 になったよ");
  });

  test("AC-7: 同じ段階の中でレベルが上がったときは、いつものお知らせが出る", async () => {
    // 20 EXP is Lv. 1; +10 makes 30 = Lv. 2, still stage 1.
    store(piyo(20));
    render(<Home />);

    await writeDiary("晴れた。");

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("ぴよ が レベル 2 になった！");
    expect(dialog).toHaveTextContent("これからもよろしくね");
    expect(dialog).not.toHaveTextContent("レベル 2 になったよ");
  });

  test("AC-3: 名前を付ける前は、段階 1 の絵が出る", () => {
    const { container } = render(<Home />);

    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "/characters/stage-1.svg",
    );
  });
});

describe("streak", () => {
  // Today is 2026-10-28 (see beforeEach).
  const withEntries = (...dates: string[]): SaveData => ({
    ...piyo(30),
    entries: dates.map((date) => ({
      date,
      body: `${date} の日記`,
      createdAt: `${date}T12:00:00.000Z`,
    })),
  });

  const band = () => screen.getByRole("group", { name: "連続記録" });

  test("AC-1, AC-7: 今日の日記があれば、今日までの連続日数と次の区切りが出る", () => {
    store(withEntries("2026-10-26", "2026-10-27", "2026-10-28"));
    render(<Home />);

    expect(band()).toHaveTextContent("🔥 3 日連続");
    expect(band()).toHaveTextContent("あと 4 日で 7 日連続。ボーナス +20");
  });

  test("AC-2: 今日まだなら「今日書くと」が出て、日記を書くと今日までの日数に変わる", async () => {
    store(withEntries("2026-10-26", "2026-10-27"));
    render(<Home />);

    expect(band()).toHaveTextContent("🔥 2 日連続中。今日書くと 3 日！");

    await writeDiary("晴れた。");

    expect(band()).toHaveTextContent("🔥 3 日連続");
    expect(band()).not.toHaveTextContent("今日書くと");
  });

  test("AC-3: 昨日も今日も日記がなければ、今日書くと 1 日目になると出る", () => {
    store(withEntries("2026-10-20"));
    render(<Home />);

    expect(band()).toHaveTextContent("🔥 今日書くと 1 日目！");
  });

  test("AC-6: 開き直しても、同じ連続日数が出る", () => {
    store(withEntries("2026-10-27", "2026-10-28"));
    const { unmount } = render(<Home />);
    unmount();
    render(<Home />);

    expect(band()).toHaveTextContent("🔥 2 日連続");
  });

  // 10/22–10/27 is 6 days, so writing today (10/28) makes 7.
  const SIX_DAYS = [
    "2026-10-22",
    "2026-10-23",
    "2026-10-24",
    "2026-10-25",
    "2026-10-26",
    "2026-10-27",
  ];

  test("AC-9, AC-19: 今日書いて 7 日に届くと、ボーナスが入り、お知らせに 2 行出て、日記に記録される", async () => {
    store(withEntries(...SIX_DAYS));
    render(<Home />);

    await writeDiary("1 週間続いた！");

    const toast = screen.getByRole("status");
    expect(toast).toHaveTextContent("✨ +10 経験値！");
    expect(toast).toHaveTextContent("🔥 7 日連続！ボーナス +20");
    const data = stored();
    expect(data.character?.totalExp).toBe(60);
    expect(data.entries.at(-1)).toMatchObject({
      date: "2026-10-28",
      bonus: 20,
      bonusDays: 7,
    });
    expect(band()).toHaveTextContent("あと 7 日で 14 日連続。ボーナス +30");
  });

  test("AC-10: ボーナスを含めて必要な量に届けば、レベルアップのお知らせが出る", async () => {
    // 40 = Lv2 (10 / 40); +30 makes 70 = Lv3.
    store({
      ...withEntries(...SIX_DAYS),
      character: { name: "ぴよ", totalExp: 40 },
    });
    render(<Home />);

    await writeDiary("1 週間続いた！");

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "ぴよ が レベル 3 になった！",
    );
  });

  test("AC-11: 区切りでない日は、ボーナスの行が出ず、日記にもボーナスを記録しない", async () => {
    // 4 days through yesterday + today = 5.
    store(withEntries(...SIX_DAYS.slice(2)));
    render(<Home />);

    await writeDiary("5 日目。");

    expect(screen.getByRole("status")).not.toHaveTextContent("ボーナス");
    const data = stored();
    expect(data.character?.totalExp).toBe(40);
    expect(data.entries.at(-1)).not.toHaveProperty("bonus");
    expect(data.entries.at(-1)).not.toHaveProperty("bonusDays");
  });

  test("AC-20: 保存に失敗したら、ボーナスも入らず、お知らせも出ない", async () => {
    const data = withEntries(...SIX_DAYS);
    store(data);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    render(<Home />);

    await writeDiary("1 週間続いた！");

    expect(screen.getByText(/保存できなかった/)).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(stored()).toEqual(data);
  });

  test("名前を付ける前は、連続記録の帯を出さない", () => {
    render(<Home />);

    expect(
      screen.queryByRole("group", { name: "連続記録" }),
    ).not.toBeInTheDocument();
  });
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
    await user.click(screen.getByRole("button", { name: "これにする" }));

    expect(screen.getByText("Lv. 1")).toBeInTheDocument();
    expect(screen.getByText("2026年10月28日（水）")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "今日の日記" }),
    ).toBeInTheDocument();
    expect(stored()).toEqual({
      ...piyo(0),
      character: { name: "ぴよ", totalExp: 0, startDate: "2026-10-28" },
    });
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

describe("名前の保存に失敗したとき", () => {
  test("AC-24: メッセージが出て、確認の画面のまま、もう一度「これにする」を押せる", async () => {
    const user = userEvent.setup();
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("full", "QuotaExceededError");
      });
    render(<Home />);

    await user.type(screen.getByLabelText("名前（10 文字まで）"), "ぴよ");
    await user.click(screen.getByRole("button", { name: "この名前にする" }));
    await user.click(screen.getByRole("button", { name: "これにする" }));

    expect(screen.getByText(/保存できなかった/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "これにする" }),
    ).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    setItem.mockRestore();
    await user.click(screen.getByRole("button", { name: "これにする" }));

    expect(screen.getByText("Lv. 1")).toBeInTheDocument();
    expect(screen.queryByText(/保存できなかった/)).not.toBeInTheDocument();
  });
});

describe("別のタブで保存されたとき", () => {
  test("AC-25: 別のタブで今日の日記が保存されたら、入力欄の代わりにその日記が表示される", () => {
    store(piyo(0));
    render(<Home />);
    expect(
      screen.getByRole("textbox", { name: "今日の日記" }),
    ).toBeInTheDocument();

    // Another tab writes today's entry, then the browser fires "storage".
    act(() => {
      store({
        ...piyo(10),
        entries: [
          {
            date: "2026-10-28",
            body: "別のタブで書いた。",
            createdAt: "2026-10-28T12:00:00.000Z",
          },
        ],
      });
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    });

    expect(screen.getByText("別のタブで書いた。")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("10 / 30")).toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: "これにする" }));
    await writeDiary("晴れた。");

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(sendSpy).not.toHaveBeenCalled();
  });
});
