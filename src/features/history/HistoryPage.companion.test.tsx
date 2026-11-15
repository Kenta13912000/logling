import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { DiaryEntry } from "@/features/diary/diary";
import type { SaveData } from "@/features/home/save-data";
import { cloudMock, companionMock, signInAs } from "@/test/mocks";

import { HistoryPage } from "./HistoryPage";

// ai-companion Bolt-4: comments under entries in the history list.

const entry = (date: string, body: string, comment?: string): DiaryEntry => ({
  date,
  body,
  createdAt: `${date}T12:00:00.000Z`,
  ...(comment ? { comment } : {}),
});

const chibi = (entries: DiaryEntry[]): SaveData => ({
  version: 1,
  character: { name: "ちびすけ", totalExp: 30, startDate: "2026-11-01" },
  entries,
});

const card = (text: string | RegExp) => screen.getByText(text).closest("li")!;

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 7, 21, 0));
  signInAs("you@example.com");
  companionMock.getCompanionSetting.mockResolvedValue({
    ok: true,
    enabled: true,
  });
  companionMock.requestComment.mockResolvedValue({
    status: "ok",
    comment: "思い出してくれてうれしい！",
  });
});

afterEach(() => {
  vi.useRealTimers();
});

test("AC-10: コメントのある日記には、本文の下に「<名前>より」とコメントが出る", async () => {
  cloudMock.loadCloudData.mockResolvedValue({
    ok: true,
    data: chibi([
      entry("2026-11-06", "きのうの日記"),
      entry("2026-11-07", "きょうの日記", "おつかれさま！"),
    ]),
  });
  render(<HistoryPage />);

  expect(await screen.findByText("おつかれさま！")).toBeInTheDocument();
  expect(card("きょうの日記")).toHaveTextContent("ちびすけより");
  expect(card("きのうの日記")).not.toHaveTextContent("ちびすけより");
});

test("AC-6: 書き忘れた日を後から書くと、その日付で頼み、その日記の下にコメントが出る", async () => {
  const user = userEvent.setup();
  const today = entry("2026-11-07", "きょうの日記");
  cloudMock.loadCloudData.mockResolvedValue({ ok: true, data: chibi([today]) });
  cloudMock.addCloudEntry.mockImplementation(async (added) => ({
    ok: true,
    data: chibi([added, today]),
  }));
  render(<HistoryPage />);
  await screen.findByText("きょうの日記");

  await user.click(
    within(card(/11月6日/)).getByRole("button", { name: "この日の日記を書く" }),
  );
  await user.type(screen.getByRole("textbox"), "思い出した。");
  await user.click(screen.getByRole("button", { name: "日記をのこす" }));

  expect(
    await screen.findByText("思い出してくれてうれしい！"),
  ).toBeInTheDocument();
  expect(companionMock.requestComment).toHaveBeenCalledWith("2026-11-06");
});

test("AC-11: 書き直しでは頼まない", async () => {
  const user = userEvent.setup();
  cloudMock.loadCloudData.mockResolvedValue({
    ok: true,
    data: chibi([entry("2026-11-07", "きょうの日記", "おつかれさま！")]),
  });
  cloudMock.editCloudEntry.mockResolvedValue({
    ok: true,
    data: chibi([entry("2026-11-07", "書き直した", "おつかれさま！")]),
  });
  render(<HistoryPage />);
  await screen.findByText("きょうの日記");

  await user.click(screen.getByRole("button", { name: "書き直す" }));
  const textarea = screen.getByRole("textbox");
  await user.clear(textarea);
  await user.type(textarea, "書き直した");
  await user.click(screen.getByRole("button", { name: "保存する" }));

  expect(await screen.findByText("書き直した")).toBeInTheDocument();
  expect(screen.getByText("おつかれさま！")).toBeInTheDocument();
  expect(companionMock.requestComment).not.toHaveBeenCalled();
});
