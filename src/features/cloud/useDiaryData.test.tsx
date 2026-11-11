import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";

import type { DiaryEntry } from "@/features/diary/diary";
import { STORAGE_KEY, type SaveData } from "@/features/home/save-data";
import { authMock, cloudMock, signInAs } from "@/test/mocks";

import { useDiaryData } from "./useDiaryData";

const entry: DiaryEntry = {
  date: "2026-11-12",
  body: "今日の日記",
  createdAt: "2026-11-12T12:00:00.000Z",
};

const before: SaveData = {
  version: 1,
  character: { name: "ぴよ", totalExp: 0, startDate: "2026-11-10" },
  entries: [],
};

const after: SaveData = {
  version: 1,
  character: { name: "ぴよ", totalExp: 10, startDate: "2026-11-10" },
  entries: [entry],
};

const ADD = { type: "addEntry", entry, exp: 10 } as const;

beforeEach(() => {
  localStorage.clear();
});

describe("ログインしていないとき", () => {
  test("AC-1: ブラウザの中のデータを読み、保存もブラウザの中にする。クラウドには送らない", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(before));
    const { result } = renderHook(() => useDiaryData());
    expect(result.current.state).toStrictEqual({
      status: "ok",
      storage: "local",
      data: before,
    });

    let outcome;
    await act(async () => {
      outcome = await result.current.save(ADD, after);
    });

    expect(outcome).toBe("saved");
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"),
    ).toStrictEqual(after);
    expect(result.current.state).toMatchObject({ data: after });
    expect(cloudMock.addCloudEntry).not.toHaveBeenCalled();
  });

  test("AC-12: ログインしているかを調べている間は、読み込み中", () => {
    authMock.isPending = true;
    const { result } = renderHook(() => useDiaryData());

    expect(result.current.state).toStrictEqual({ status: "loading" });
  });
});

describe("ログイン中", () => {
  beforeEach(() => {
    signInAs("you@example.com");
    // Data from before signing in must be left alone (AC-10).
    localStorage.setItem(STORAGE_KEY, JSON.stringify(before));
  });

  test("AC-12: クラウドから読み込む間は読み込み中で、読み込めたらクラウドのデータになる", async () => {
    cloudMock.loadCloudData.mockResolvedValue({ ok: true, data: after });
    const { result } = renderHook(() => useDiaryData());

    expect(result.current.state).toStrictEqual({ status: "loading" });
    await waitFor(() =>
      expect(result.current.state).toStrictEqual({
        status: "ok",
        storage: "cloud",
        data: after,
      }),
    );
  });

  test("AC-10: 日記を足すと、クラウドに経験値と始めた日つきで送り、返ってきた最新のデータになる。ブラウザの中には書き込まない", async () => {
    cloudMock.loadCloudData.mockResolvedValue({ ok: true, data: before });
    cloudMock.addCloudEntry.mockResolvedValue({ ok: true, data: after });
    const { result } = renderHook(() => useDiaryData());
    await waitFor(() => expect(result.current.state.status).toBe("ok"));

    let outcome;
    await act(async () => {
      outcome = await result.current.save(ADD, after);
    });

    expect(outcome).toBe("saved");
    expect(cloudMock.addCloudEntry).toHaveBeenCalledWith(
      entry,
      10,
      "2026-11-10",
    );
    expect(result.current.state).toMatchObject({ data: after });
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"),
    ).toStrictEqual(before);
  });

  test("AC-8: キャラクターを作る・書き直す・消すも、それぞれのサーバーの処理に送る", async () => {
    cloudMock.loadCloudData.mockResolvedValue({ ok: true, data: before });
    for (const action of [
      cloudMock.createCloudCharacter,
      cloudMock.editCloudEntry,
      cloudMock.deleteCloudEntry,
    ]) {
      action.mockResolvedValue({ ok: true, data: after });
    }
    const { result } = renderHook(() => useDiaryData());
    await waitFor(() => expect(result.current.state.status).toBe("ok"));
    const character = { name: "ぴよ", totalExp: 0 };

    await act(async () => {
      await result.current.save({ type: "createCharacter", character }, after);
      await result.current.save(
        { type: "editEntry", date: "2026-11-12", body: "書き直し" },
        after,
      );
      await result.current.save(
        { type: "deleteEntry", date: "2026-11-12", exp: 10 },
        after,
      );
    });

    expect(cloudMock.createCloudCharacter).toHaveBeenCalledWith(character);
    expect(cloudMock.editCloudEntry).toHaveBeenCalledWith(
      "2026-11-12",
      "書き直し",
      "2026-11-10",
    );
    expect(cloudMock.deleteCloudEntry).toHaveBeenCalledWith(
      "2026-11-12",
      10,
      "2026-11-10",
    );
  });

  test("AC-11: 保存できなかったときは「保存できなかった」を返し、データは変わらない", async () => {
    cloudMock.loadCloudData.mockResolvedValue({ ok: true, data: before });
    cloudMock.addCloudEntry.mockResolvedValue({ ok: false, reason: "failed" });
    const { result } = renderHook(() => useDiaryData());
    await waitFor(() => expect(result.current.state.status).toBe("ok"));

    let outcome;
    await act(async () => {
      outcome = await result.current.save(ADD, after);
    });

    expect(outcome).toBe("failed");
    expect(result.current.state).toMatchObject({ data: before });
  });

  test("AC-11: 通信そのものに失敗したときも「保存できなかった」を返す", async () => {
    cloudMock.loadCloudData.mockResolvedValue({ ok: true, data: before });
    cloudMock.addCloudEntry.mockRejectedValue(new TypeError("fetch failed"));
    const { result } = renderHook(() => useDiaryData());
    await waitFor(() => expect(result.current.state.status).toBe("ok"));

    let outcome;
    await act(async () => {
      outcome = await result.current.save(ADD, after);
    });

    expect(outcome).toBe("failed");
    expect(result.current.state).toMatchObject({ data: before });
  });

  test("AC-13: ほかの端末で先に変わっていて断られたときは「ほかの端末で変わっていた」を返し、データを最新にする", async () => {
    const latest: SaveData = {
      version: 1,
      character: { name: "ぴよ", totalExp: 10, startDate: "2026-11-10" },
      entries: [{ ...entry, body: "PC で書いた" }],
    };
    cloudMock.loadCloudData.mockResolvedValue({ ok: true, data: before });
    cloudMock.addCloudEntry.mockResolvedValue({
      ok: false,
      reason: "exists",
      data: latest,
    });
    const { result } = renderHook(() => useDiaryData());
    await waitFor(() => expect(result.current.state.status).toBe("ok"));

    let outcome;
    await act(async () => {
      outcome = await result.current.save(ADD, after);
    });

    expect(outcome).toBe("conflict");
    expect(result.current.state).toMatchObject({ data: latest });
  });

  test("AC-12: 読み込めなかったときは「読み込めなかった」になり、もう一度読み込める", async () => {
    cloudMock.loadCloudData.mockRejectedValueOnce(
      new TypeError("fetch failed"),
    );
    cloudMock.loadCloudData.mockResolvedValue({ ok: true, data: after });
    const { result } = renderHook(() => useDiaryData());

    await waitFor(() =>
      expect(result.current.state).toStrictEqual({ status: "loadFailed" }),
    );
    act(() => {
      result.current.reload();
    });

    await waitFor(() =>
      expect(result.current.state).toMatchObject({ status: "ok", data: after }),
    );
  });
});
