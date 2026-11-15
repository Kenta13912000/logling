import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { cloudMock, companionMock, signInAs } from "@/test/mocks";

import { Home } from "./Home";
import { STORAGE_KEY, type SaveData } from "./save-data";

// ai-companion Bolt-4: the character's comment under today's entry.

const chibi = (entries: SaveData["entries"] = []): SaveData => ({
  version: 1,
  character: { name: "ちびすけ", totalExp: 0, startDate: "2026-11-01" },
  entries,
});

async function writeDiary(text: string) {
  const user = userEvent.setup();
  await user.type(screen.getByRole("textbox", { name: "今日の日記" }), text);
  await user.click(screen.getByRole("button", { name: "日記をのこす" }));
  return user;
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  // 21:00 on 2026-11-15 (months are 0-based).
  vi.setSystemTime(new Date(2026, 10, 15, 21, 0));
  signInAs("you@example.com");
  cloudMock.loadCloudData.mockResolvedValue({ ok: true, data: chibi() });
  cloudMock.addCloudEntry.mockImplementation(async (entry, exp) => ({
    ok: true,
    data: {
      ...chibi([entry]),
      character: { ...chibi().character!, totalExp: exp },
    },
  }));
  companionMock.getCompanionSetting.mockResolvedValue({
    ok: true,
    enabled: true,
  });
  companionMock.requestComment.mockResolvedValue({
    status: "ok",
    comment: "発表おつかれさま！",
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("オンのとき", () => {
  test("AC-5: 今日の日記を保存すると、その日付で頼み、本文の下にコメントが出る。経験値のお知らせはそのまま出る", async () => {
    render(<Home />);
    await screen.findByText("ちびすけ");

    await writeDiary("発表があった。");

    expect(await screen.findByText("発表おつかれさま！")).toBeInTheDocument();
    expect(screen.getByText("ちびすけより")).toBeInTheDocument();
    expect(companionMock.requestComment).toHaveBeenCalledWith("2026-11-15");
    expect(screen.getByText("✨ +10 経験値！")).toBeInTheDocument();
    // The thanks bubble stays (mockup 案 A).
    expect(
      screen.getByText("今日も書いてくれてありがとう！また明日ね"),
    ).toBeInTheDocument();
  });

  test("AC-5: 作っている間は「<名前>が読んでいるよ…」が出る", async () => {
    companionMock.requestComment.mockReturnValue(new Promise(() => {}));
    render(<Home />);
    await screen.findByText("ちびすけ");

    await writeDiary("発表があった。");

    expect(
      await screen.findByText("ちびすけが読んでいるよ…"),
    ).toBeInTheDocument();
  });

  test("AC-13: 作れなかったら「もう一度」が出て、押すと頼み直してコメントになる", async () => {
    companionMock.requestComment.mockResolvedValueOnce({ status: "failed" });
    render(<Home />);
    await screen.findByText("ちびすけ");

    const user = await writeDiary("発表があった。");
    await user.click(await screen.findByRole("button", { name: "もう一度" }));

    expect(await screen.findByText("発表おつかれさま！")).toBeInTheDocument();
    expect(companionMock.requestComment).toHaveBeenCalledTimes(2);
  });

  test("AC-10: 開いたとき、今日の日記にコメントがあれば、頼まずに出す", async () => {
    cloudMock.loadCloudData.mockResolvedValue({
      ok: true,
      data: chibi([
        {
          date: "2026-11-15",
          body: "発表があった。",
          createdAt: "2026-11-15T11:00:00.000Z",
          comment: "前に作ったコメント",
        },
      ]),
    });
    render(<Home />);

    expect(await screen.findByText("前に作ったコメント")).toBeInTheDocument();
    expect(companionMock.requestComment).not.toHaveBeenCalled();
  });
});

describe("オフ・ログインしていないとき", () => {
  test("AC-9: オフなら、保存しても頼まず、吹き出しも出ない", async () => {
    companionMock.getCompanionSetting.mockResolvedValue({
      ok: true,
      enabled: false,
    });
    render(<Home />);
    await screen.findByText("ちびすけ");

    await writeDiary("発表があった。");

    expect(await screen.findByText("発表があった。")).toBeInTheDocument();
    expect(companionMock.requestComment).not.toHaveBeenCalled();
    expect(screen.queryByText(/が読んでいるよ/)).not.toBeInTheDocument();
  });

  test("AC-9: ログインしていない（ブラウザの中に保存）ときは、オンかどうかも読まず、頼まない", async () => {
    const { authMock } = await import("@/test/mocks");
    authMock.session = null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chibi()));
    render(<Home />);

    await writeDiary("発表があった。");

    expect(await screen.findByText("発表があった。")).toBeInTheDocument();
    expect(companionMock.getCompanionSetting).not.toHaveBeenCalled();
    expect(companionMock.requestComment).not.toHaveBeenCalled();
  });
});
