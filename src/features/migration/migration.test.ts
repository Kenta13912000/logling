import { describe, expect, test } from "vitest";

import type { SaveData } from "@/features/home/save-data";

import {
  MAX_IMPORT_BYTES,
  fitsInOneImport,
  planMigration,
  summarize,
} from "./migration";

const piyo: SaveData = {
  version: 1,
  // Lv. 5 starts at 180 EXP.
  character: { name: "ぴよ", totalExp: 180 },
  entries: [
    { date: "2026-11-04", body: "1", createdAt: "2026-11-04T12:00:00.000Z" },
    { date: "2026-11-05", body: "2", createdAt: "2026-11-05T12:00:00.000Z" },
  ],
};
const tama: SaveData = {
  version: 1,
  character: { name: "たま", totalExp: 0 },
  entries: [],
};
const EMPTY: SaveData = { version: 1, character: null, entries: [] };

describe("何をするか", () => {
  test("AC-14: ブラウザにキャラクターがいて、アカウントが空なら、移す", () => {
    expect(planMigration({ status: "ok", data: piyo }, EMPTY)).toStrictEqual({
      kind: "move",
      browser: piyo,
    });
  });

  test("AC-18: どちらにもキャラクターがいれば、選ばせる", () => {
    expect(planMigration({ status: "ok", data: piyo }, tama)).toStrictEqual({
      kind: "choose",
      browser: piyo,
      account: tama,
    });
  });

  test("AC-16, AC-17: ブラウザにキャラクターがいなければ、何もしない", () => {
    expect(planMigration({ status: "ok", data: EMPTY }, EMPTY)).toStrictEqual({
      kind: "none",
    });
    expect(planMigration({ status: "ok", data: EMPTY }, tama)).toStrictEqual({
      kind: "none",
    });
  });

  test("AC-21: ブラウザのデータが壊れていたり、まだ読めていなければ、ないものとして何もしない", () => {
    expect(
      planMigration({ status: "broken", raw: "{oops" }, EMPTY),
    ).toStrictEqual({ kind: "none" });
    expect(planMigration({ status: "loading" }, EMPTY)).toStrictEqual({
      kind: "none",
    });
  });
});

describe("選ぶ画面に出すこと", () => {
  test("AC-18: 名前・段階の名前・レベル・日記の件数", () => {
    expect(summarize(piyo)).toStrictEqual({
      name: "ぴよ",
      stageName: "ころねこ",
      level: 5,
      entryCount: 2,
    });
    expect(summarize(tama)).toStrictEqual({
      name: "たま",
      stageName: "ねこだま",
      level: 1,
      entryCount: 0,
    });
  });
});

describe("一度に送れる大きさ", () => {
  test("AC-15: 4MB に収まるデータは一度に送れ、超えるものは送れない", () => {
    const entry = (i: number) => ({
      date: `2026-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
      body: "あ".repeat(2000),
      createdAt: "2026-11-04T12:00:00.000Z",
    });
    const many = (count: number): SaveData => ({
      ...piyo,
      entries: Array.from({ length: count }, (_, i) => entry(i)),
    });

    expect(MAX_IMPORT_BYTES).toBeLessThanOrEqual(4 * 1024 * 1024);
    expect(fitsInOneImport(piyo)).toBe(true);
    expect(fitsInOneImport(many(500))).toBe(true);
    expect(fitsInOneImport(many(800))).toBe(false);
  });
});
