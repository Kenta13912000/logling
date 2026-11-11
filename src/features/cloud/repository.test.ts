// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import type { Character } from "@/features/character/character";
import type { DiaryEntry } from "@/features/diary/diary";
import { createTestDb, type TestDb } from "@/lib/db/test-db";

import {
  createCharacter,
  deleteEntry,
  getSaveData,
  insertEntry,
  updateEntryBody,
} from "./repository";

// Two signed-in people. B must never see or change A's data.
const A = "user-a";
const B = "user-b";

const PIYO: Character = { name: "ぴよ", totalExp: 0, startDate: "2026-11-01" };
const TAMA: Character = { name: "たま", totalExp: 0, startDate: "2026-11-03" };

const entry = (date: string, body: string): DiaryEntry => ({
  date,
  body,
  createdAt: `${date}T12:34:56.789Z`,
});

let testDb: TestDb;

beforeEach(async () => {
  testDb = await createTestDb();
  await testDb.addUser(A);
  await testDb.addUser(B);
});

afterEach(async () => {
  await testDb.close();
});

describe("ほかの人のデータ", () => {
  test("AC-29: 人 A の日記とキャラクターは、人 B の読み出しに出てこない", async () => {
    const { db } = testDb;
    await createCharacter(db, A, PIYO);
    await insertEntry(db, A, entry("2026-11-05", "A の日記"), 10);

    expect(await getSaveData(db, B)).toStrictEqual({
      version: 1,
      character: null,
      entries: [],
    });
    // A still sees their own data.
    const a = await getSaveData(db, A);
    expect(a.character?.name).toBe("ぴよ");
    expect(a.entries.map((e) => e.body)).toStrictEqual(["A の日記"]);
  });

  test("AC-29: 同じ日付でも、人 B の日記は人 A の日記と混ざらない", async () => {
    const { db } = testDb;
    await createCharacter(db, A, PIYO);
    await createCharacter(db, B, TAMA);
    await insertEntry(db, A, entry("2026-11-05", "A の日記"), 10);

    expect(await insertEntry(db, B, entry("2026-11-05", "B の日記"), 10)).toBe(
      "ok",
    );

    expect((await getSaveData(db, A)).entries.map((e) => e.body)).toStrictEqual(
      ["A の日記"],
    );
    expect((await getSaveData(db, B)).entries.map((e) => e.body)).toStrictEqual(
      ["B の日記"],
    );
  });

  test("AC-29: 人 B は、人 A の日記を書き直せない", async () => {
    const { db } = testDb;
    await createCharacter(db, A, PIYO);
    await createCharacter(db, B, TAMA);
    await insertEntry(db, A, entry("2026-11-05", "A の日記"), 10);

    expect(await updateEntryBody(db, B, "2026-11-05", "書きかえた")).toBe(
      "notFound",
    );

    expect((await getSaveData(db, A)).entries[0].body).toBe("A の日記");
  });

  test("AC-29: 人 B は、人 A の日記を消せず、どちらの経験値も変わらない", async () => {
    const { db } = testDb;
    await createCharacter(db, A, PIYO);
    await createCharacter(db, B, { ...TAMA, totalExp: 40 });
    await insertEntry(db, A, entry("2026-11-05", "A の日記"), 10);

    expect(await deleteEntry(db, B, "2026-11-05", 10)).toBe("notFound");

    const a = await getSaveData(db, A);
    expect(a.entries).toHaveLength(1);
    expect(a.character?.totalExp).toBe(10);
    expect((await getSaveData(db, B)).character?.totalExp).toBe(40);
  });

  test("AC-29: キャラクターのいない人 B は日記を足せず、人 A の経験値も変わらない", async () => {
    const { db } = testDb;
    await createCharacter(db, A, PIYO);

    expect(await insertEntry(db, B, entry("2026-11-05", "B の日記"), 10)).toBe(
      "noCharacter",
    );

    expect((await getSaveData(db, A)).character?.totalExp).toBe(0);
    expect((await getSaveData(db, B)).entries).toStrictEqual([]);
  });
});

describe("読み書きの結果", () => {
  test("AC-8: 足した日記・書き直し・消した結果が、今の保存データと同じ形で読み出せる", async () => {
    const { db } = testDb;
    expect(await createCharacter(db, A, PIYO)).toBe("ok");
    // Stored out of order on purpose: reading returns the oldest first.
    await insertEntry(db, A, entry("2026-11-07", "ボーナスの日"), 30);
    await insertEntry(
      db,
      A,
      { ...entry("2026-11-05", "あとから"), writtenLater: true },
      5,
    );
    await insertEntry(db, A, entry("2026-11-04", "ふつうの日"), 10);
    await insertEntry(db, A, entry("2026-11-06", "消す日"), 10);

    expect(await updateEntryBody(db, A, "2026-11-04", "書き直した")).toBe("ok");
    expect(await deleteEntry(db, A, "2026-11-06", 10)).toBe("ok");

    expect(await getSaveData(db, A)).toStrictEqual({
      version: 1,
      character: { name: "ぴよ", totalExp: 45, startDate: "2026-11-01" },
      entries: [
        entry("2026-11-04", "書き直した"),
        { ...entry("2026-11-05", "あとから"), writtenLater: true },
        entry("2026-11-07", "ボーナスの日"),
      ],
    });
  });

  test("AC-8: ボーナスの量と連続日数は、セットで保存されて読み出せる", async () => {
    const { db } = testDb;
    await createCharacter(db, A, PIYO);
    const bonusEntry: DiaryEntry = {
      ...entry("2026-11-07", "7 日目"),
      bonus: 20,
      bonusDays: 7,
    };

    await insertEntry(db, A, bonusEntry, 30);

    expect((await getSaveData(db, A)).entries).toStrictEqual([bonusEntry]);
  });

  test("AC-8: 始めた日のないキャラクター（diary-exp のころ）も、そのままの形で読み出せる", async () => {
    const { db } = testDb;
    await createCharacter(db, A, { name: "ぴよ", totalExp: 120 });

    expect((await getSaveData(db, A)).character).toStrictEqual({
      name: "ぴよ",
      totalExp: 120,
    });
  });

  test("AC-8: キャラクターは 1 人に 1 体で、2 体目は作られない", async () => {
    const { db } = testDb;
    await createCharacter(db, A, PIYO);

    expect(await createCharacter(db, A, TAMA)).toBe("exists");

    expect((await getSaveData(db, A)).character?.name).toBe("ぴよ");
  });

  test("AC-13: 同じ日の日記は 2 件目を足せず、経験値も二重に入らない", async () => {
    const { db } = testDb;
    await createCharacter(db, A, PIYO);
    await insertEntry(db, A, entry("2026-11-05", "1 件目"), 10);

    expect(await insertEntry(db, A, entry("2026-11-05", "2 件目"), 10)).toBe(
      "exists",
    );

    const a = await getSaveData(db, A);
    expect(a.entries.map((e) => e.body)).toStrictEqual(["1 件目"]);
    expect(a.character?.totalExp).toBe(10);
  });

  test("AC-13: 同じ日の日記を同時に 2 つ足すと、1 つだけ残り、経験値は 1 回分だけ増える", async () => {
    const { db } = testDb;
    await createCharacter(db, A, PIYO);

    const results = await Promise.all([
      insertEntry(db, A, entry("2026-11-05", "端末 1"), 10),
      insertEntry(db, A, entry("2026-11-05", "端末 2"), 10),
    ]);

    expect([...results].sort()).toStrictEqual(["exists", "ok"]);
    const a = await getSaveData(db, A);
    expect(a.entries).toHaveLength(1);
    expect(a.character?.totalExp).toBe(10);
  });

  test("AC-13: 違う日の日記を同時に足すと、両方の経験値が入り、ほかの端末の分を上書きしない", async () => {
    const { db } = testDb;
    await createCharacter(db, A, PIYO);

    await Promise.all([
      insertEntry(db, A, entry("2026-11-05", "端末 1"), 10),
      insertEntry(db, A, entry("2026-11-06", "端末 2"), 5),
    ]);

    const a = await getSaveData(db, A);
    expect(a.entries).toHaveLength(2);
    expect(a.character?.totalExp).toBe(15);
  });

  test("AC-8: 日記を消しても、経験値は 0 より下がらない", async () => {
    const { db } = testDb;
    await createCharacter(db, A, PIYO);
    await insertEntry(db, A, entry("2026-11-05", "日記"), 0);

    await deleteEntry(db, A, "2026-11-05", 10);

    expect((await getSaveData(db, A)).character?.totalExp).toBe(0);
  });
});
