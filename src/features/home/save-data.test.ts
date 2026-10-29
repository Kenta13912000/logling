import { beforeEach, describe, expect, test } from "vitest";

import {
  EMPTY_SAVE_DATA,
  STORAGE_KEY,
  loadSaveData,
  parseSaveData,
  resetBrokenData,
  writeSaveData,
  type SaveData,
} from "./save-data";

const saved: SaveData = {
  version: 1,
  character: { name: "ぴよ", totalExp: 10 },
  entries: [
    {
      date: "2026-10-28",
      body: "晴れた。",
      createdAt: "2026-10-28T12:00:00.000Z",
    },
  ],
};

beforeEach(() => {
  localStorage.clear();
});

describe("parseSaveData", () => {
  test("AC-1: 保存データがなければ、初めて開いた状態", () => {
    expect(parseSaveData(null)).toEqual({
      status: "ok",
      data: EMPTY_SAVE_DATA,
    });
    expect(EMPTY_SAVE_DATA).toEqual({
      version: 1,
      character: null,
      entries: [],
    });
  });

  test("AC-16: 正しい形のデータはそのまま読める", () => {
    expect(parseSaveData(JSON.stringify(saved))).toEqual({
      status: "ok",
      data: saved,
    });
  });

  test("AC-21: JSON として読めないデータは壊れている", () => {
    expect(parseSaveData("{oops")).toEqual({ status: "broken", raw: "{oops" });
  });

  test("AC-21: 形が合わないデータは壊れている", () => {
    const wrong = [
      JSON.stringify({ ...saved, version: 2 }),
      JSON.stringify({ ...saved, character: { name: "ぴよ" } }),
      JSON.stringify({ ...saved, entries: [{ date: "2026-10-28" }] }),
      JSON.stringify("text"),
    ];
    for (const raw of wrong) {
      expect(parseSaveData(raw)).toEqual({ status: "broken", raw });
    }
  });
});

describe("loadSaveData / writeSaveData", () => {
  test("AC-16: 書き込んだデータを読み直せる", () => {
    expect(writeSaveData(localStorage, saved)).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(loadSaveData(localStorage)).toEqual({ status: "ok", data: saved });
  });
});

describe("resetBrokenData", () => {
  test("AC-21: 壊れたデータは控えのキーに移し、本来のキーは空にする", () => {
    localStorage.setItem(STORAGE_KEY, "{oops");

    const ok = resetBrokenData(
      localStorage,
      new Date("2026-10-28T12:34:56.000Z"),
    );

    expect(ok).toBe(true);
    expect(
      localStorage.getItem(`${STORAGE_KEY}:broken:2026-10-28T12:34:56.000Z`),
    ).toBe("{oops");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(loadSaveData(localStorage)).toEqual({
      status: "ok",
      data: EMPTY_SAVE_DATA,
    });
  });
});
