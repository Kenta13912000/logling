import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";

import type { DiaryEntry } from "@/features/diary/diary";
import { companionMock } from "@/test/mocks";

import { useComments } from "./useComments";

const entry = (date: string, comment?: string): DiaryEntry => ({
  date,
  body: "日記",
  createdAt: `${date}T12:00:00.000Z`,
  ...(comment ? { comment } : {}),
});

beforeEach(() => {
  companionMock.getCompanionSetting.mockResolvedValue({
    ok: true,
    enabled: true,
  });
  companionMock.requestComment.mockResolvedValue({
    status: "ok",
    comment: "いいね",
  });
});

async function enabledHook() {
  const hook = renderHook(() => useComments(true));
  await waitFor(() => expect(hook.result.current.enabled).toBe(true));
  return hook;
}

describe("オンかどうか", () => {
  test("AC-9: 保管場所を使っていない（ログインしていない）ときは読まず、オフ", () => {
    const { result } = renderHook(() => useComments(false));

    expect(result.current.enabled).toBe(false);
    expect(companionMock.getCompanionSetting).not.toHaveBeenCalled();
  });

  test("AC-9: 保管場所を使っているときは 1 回読む。読めなければオフ", async () => {
    companionMock.getCompanionSetting.mockResolvedValue({
      ok: false,
      reason: "failed",
    });
    const { result } = renderHook(() => useComments(true));

    await waitFor(() =>
      expect(companionMock.getCompanionSetting).toHaveBeenCalledTimes(1),
    );
    expect(result.current.enabled).toBe(false);
  });
});

describe("頼む", () => {
  test("AC-9: オフのときは頼まない", async () => {
    companionMock.getCompanionSetting.mockResolvedValue({
      ok: true,
      enabled: false,
    });
    const { result } = renderHook(() => useComments(true));
    await waitFor(() =>
      expect(companionMock.getCompanionSetting).toHaveBeenCalled(),
    );

    act(() => result.current.request("2026-11-15"));

    expect(companionMock.requestComment).not.toHaveBeenCalled();
    expect(result.current.stateOf(entry("2026-11-15"))).toBeNull();
  });

  test("AC-5: オンなら頼み、作っている間は「作っている」、できたらコメントになる", async () => {
    let finish: (value: { status: "ok"; comment: string }) => void = () => {};
    companionMock.requestComment.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = await enabledHook();

    await act(async () => result.current.request("2026-11-15"));
    expect(companionMock.requestComment).toHaveBeenCalledWith("2026-11-15");
    expect(result.current.stateOf(entry("2026-11-15"))).toStrictEqual({
      kind: "pending",
    });

    await act(async () => finish({ status: "ok", comment: "いいね" }));
    expect(result.current.stateOf(entry("2026-11-15"))).toStrictEqual({
      kind: "comment",
      text: "いいね",
    });
    expect(result.current.stateOf(entry("2026-11-14"))).toBeNull();
  });

  test("AC-5: オンかどうかを読み終わる前に保存しても、読み終わってから頼む（すぐ書いた人にもコメントが届く）", async () => {
    let answer: (value: { ok: true; enabled: boolean }) => void = () => {};
    companionMock.getCompanionSetting.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    const { result } = renderHook(() => useComments(true));

    act(() => result.current.request("2026-11-15"));
    expect(companionMock.requestComment).not.toHaveBeenCalled();
    await act(async () => answer({ ok: true, enabled: true }));

    expect(companionMock.requestComment).toHaveBeenCalledWith("2026-11-15");
    await waitFor(() =>
      expect(result.current.stateOf(entry("2026-11-15"))).toStrictEqual({
        kind: "comment",
        text: "いいね",
      }),
    );
  });

  test("AC-13〜AC-15: 作れなかった・今日はここまで・今月はお休みを、その日記の状態にする。通信の失敗も「作れなかった」", async () => {
    const { result } = await enabledHook();
    const cases = [
      ["2026-11-12", { status: "failed" }, { kind: "failed" }],
      ["2026-11-13", { status: "dailyLimit" }, { kind: "dailyLimit" }],
      ["2026-11-14", { status: "monthlyLimit" }, { kind: "monthlyLimit" }],
    ] as const;

    for (const [date, answer, state] of cases) {
      companionMock.requestComment.mockResolvedValueOnce(answer);
      await act(async () => result.current.request(date));
      expect(result.current.stateOf(entry(date)), date).toStrictEqual(state);
    }

    companionMock.requestComment.mockRejectedValueOnce(new TypeError("fetch"));
    await act(async () => result.current.request("2026-11-15"));
    expect(result.current.stateOf(entry("2026-11-15"))).toStrictEqual({
      kind: "failed",
    });
  });

  test("AC-9: 「オフ」「日記がない」「オンにする前の日記」などの答えでは、何も出さない", async () => {
    const { result } = await enabledHook();

    for (const status of [
      "off",
      "noEntry",
      "beforeEnabled",
      "invalid",
      "unauthorized",
    ] as const) {
      companionMock.requestComment.mockResolvedValueOnce({ status });
      await act(async () => result.current.request("2026-11-15"));
      expect(result.current.stateOf(entry("2026-11-15")), status).toBeNull();
    }
  });
});

describe("出すもの", () => {
  test("AC-3, AC-10: 日記にコメントがあれば、オフでも、頼んでいなくても、そのコメント", () => {
    const { result } = renderHook(() => useComments(false));

    expect(
      result.current.stateOf(entry("2026-11-15", "前のコメント")),
    ).toStrictEqual({
      kind: "comment",
      text: "前のコメント",
    });
  });
});
