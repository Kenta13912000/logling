// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  createCharacter,
  deleteEntry,
  getSaveData,
  importSaveData,
  insertEntry,
  updateEntryBody,
} from "@/features/cloud/repository";
import type { DiaryEntry } from "@/features/diary/diary";
import { user } from "@/lib/db/schema";
import { createTestDb, type TestDb } from "@/lib/db/test-db";

import {
  COMMENT_MAX_LENGTH,
  addComment,
  addMonthlyCost,
  claimDailyUse,
  findCompanionSetting,
  findDailyUse,
  findEntryForComment,
  findMonthlyCost,
  releaseDailyUse,
  saveCompanionSetting,
} from "./repository";

const A = "user-a";
const B = "user-b";

const PIYO = { name: "ぴよ", totalExp: 0, startDate: "2026-11-01" };

const entry = (date: string, body: string): DiaryEntry => ({
  date,
  body,
  createdAt: `${date}T12:34:56.789Z`,
});

const MORNING = new Date("2026-11-15T09:00:00.000Z");
const EVENING = new Date("2026-11-15T21:00:00.000Z");

let testDb: TestDb;

beforeEach(async () => {
  testDb = await createTestDb();
  await testDb.addUser(A);
  await testDb.addUser(B);
});

afterEach(async () => {
  await testDb.close();
});

describe("オン・オフ", () => {
  test("AC-1: オンにしたことがない人はオフ", async () => {
    expect(await findCompanionSetting(testDb.db, A)).toStrictEqual({
      enabled: false,
      enabledAt: null,
    });
  });

  test("AC-2: オンにすると、オンにした時刻が残る", async () => {
    const saved = await saveCompanionSetting(testDb.db, A, true, MORNING);

    expect(saved).toStrictEqual({ enabled: true, enabledAt: MORNING });
    expect(await findCompanionSetting(testDb.db, A)).toStrictEqual({
      enabled: true,
      enabledAt: MORNING,
    });
  });

  test("AC-3: オフにすると、オンかどうかだけが変わる。もう一度オンにすると、時刻が新しくなる", async () => {
    await saveCompanionSetting(testDb.db, A, true, MORNING);

    expect(
      await saveCompanionSetting(testDb.db, A, false, EVENING),
    ).toStrictEqual({ enabled: false, enabledAt: MORNING });

    expect(
      await saveCompanionSetting(testDb.db, A, true, EVENING),
    ).toStrictEqual({ enabled: true, enabledAt: EVENING });
  });

  test("AC-4: 人 A がオンにしても、人 B はオフのまま", async () => {
    await saveCompanionSetting(testDb.db, A, true, MORNING);

    expect((await findCompanionSetting(testDb.db, B)).enabled).toBe(false);
  });

  test("AC-12: 退会（user を消す）と、オン・オフも消える", async () => {
    await saveCompanionSetting(testDb.db, A, true, MORNING);

    await testDb.db.delete(user).where(eq(user.id, A));

    expect(await findCompanionSetting(testDb.db, A)).toStrictEqual({
      enabled: false,
      enabledAt: null,
    });
  });
});

describe("日記ごとのコメント", () => {
  beforeEach(async () => {
    await createCharacter(testDb.db, A, PIYO);
    await insertEntry(testDb.db, A, entry("2026-11-14", "きのう"), 10);
    await insertEntry(testDb.db, A, entry("2026-11-15", "きょう"), 10);
  });

  test("AC-10: コメントのある日記には、読み出すと comment が付く。ない日記には付かない", async () => {
    expect(await addComment(testDb.db, A, "2026-11-15", "おつかれさま！")).toBe(
      "ok",
    );

    expect((await getSaveData(testDb.db, A)).entries).toStrictEqual([
      entry("2026-11-14", "きのう"),
      { ...entry("2026-11-15", "きょう"), comment: "おつかれさま！" },
    ]);
  });

  test("AC-4, AC-11: 日記 1 件にコメントは 1 つ。2 つ目は残さず、書き直してもコメントはそのまま", async () => {
    await addComment(testDb.db, A, "2026-11-15", "1 つ目");

    expect(await addComment(testDb.db, A, "2026-11-15", "2 つ目")).toBe(
      "exists",
    );
    await updateEntryBody(testDb.db, A, "2026-11-15", "書き直した");

    const entries = (await getSaveData(testDb.db, A)).entries;
    expect(entries[1]).toMatchObject({
      body: "書き直した",
      comment: "1 つ目",
    });
  });

  test("AC-10: ない日記にはコメントを残さない。ほかの人の日記にも残せない", async () => {
    await createCharacter(testDb.db, B, { ...PIYO, name: "たま" });

    expect(await addComment(testDb.db, A, "2026-11-10", "ない日")).toBe(
      "noEntry",
    );
    expect(await addComment(testDb.db, B, "2026-11-15", "B から")).toBe(
      "noEntry",
    );
    expect(
      (await getSaveData(testDb.db, A)).entries.some((e) => e.comment),
    ).toBe(false);
  });

  test("AC-12: 日記を消すと、その日記のコメントも消える（同じ日に書き直しても、前のコメントは出ない）", async () => {
    await addComment(testDb.db, A, "2026-11-15", "消える");

    await deleteEntry(testDb.db, A, "2026-11-15", 10);
    await insertEntry(testDb.db, A, entry("2026-11-15", "もう一度"), 10);

    expect((await getSaveData(testDb.db, A)).entries[1]).toStrictEqual(
      entry("2026-11-15", "もう一度"),
    );
  });

  test("AC-12: 引き継ぎの選び直しでキャラクターを入れかえると、前のコメントも消える", async () => {
    await addComment(testDb.db, A, "2026-11-15", "前のキャラクターへ");

    await importSaveData(
      testDb.db,
      A,
      {
        version: 1,
        character: { name: "ブラウザ", totalExp: 10 },
        entries: [entry("2026-11-15", "ブラウザの日記")],
      },
      "replace",
    );

    expect((await getSaveData(testDb.db, A)).entries).toStrictEqual([
      entry("2026-11-15", "ブラウザの日記"),
    ]);
  });

  test("AC-7: 200 文字までは残せ、それより長いコメントは残せない", async () => {
    expect(COMMENT_MAX_LENGTH).toBe(200);
    expect(await addComment(testDb.db, A, "2026-11-14", "あ".repeat(200))).toBe(
      "ok",
    );

    await expect(
      addComment(testDb.db, A, "2026-11-15", "あ".repeat(201)),
    ).rejects.toThrow();
  });
});

describe("コメントを作るための日記", () => {
  test("AC-16: 名前・本文・保存した時刻・コメントだけを読む。日記がなければ null", async () => {
    await createCharacter(testDb.db, A, PIYO);
    await insertEntry(testDb.db, A, entry("2026-11-15", "きょう"), 10);

    expect(await findEntryForComment(testDb.db, A, "2026-11-15")).toStrictEqual(
      {
        name: "ぴよ",
        body: "きょう",
        createdAt: new Date("2026-11-15T12:34:56.789Z"),
        comment: null,
      },
    );
    await addComment(testDb.db, A, "2026-11-15", "おつかれさま");
    expect(
      (await findEntryForComment(testDb.db, A, "2026-11-15"))?.comment,
    ).toBe("おつかれさま");
    expect(await findEntryForComment(testDb.db, A, "2026-11-14")).toBeNull();
    expect(await findEntryForComment(testDb.db, B, "2026-11-15")).toBeNull();
  });
});

describe("1 日の回数", () => {
  const DAY = "2026-11-15";

  test("AC-14: 3 回までは数え、4 回目は数えない。ほかの人・ほかの日は別に数える", async () => {
    const results = [];
    for (let i = 0; i < 4; i += 1) {
      results.push(await claimDailyUse(testDb.db, A, DAY, 3));
    }

    expect(results).toStrictEqual([true, true, true, false]);
    expect(await findDailyUse(testDb.db, A, DAY)).toBe(3);
    expect(await claimDailyUse(testDb.db, B, DAY, 3)).toBe(true);
    expect(await claimDailyUse(testDb.db, A, "2026-11-16", 3)).toBe(true);
  });

  test("AC-14: 同時に 4 回頼まれても、数えるのは 3 回まで", async () => {
    const results = await Promise.all(
      Array.from({ length: 4 }, () => claimDailyUse(testDb.db, A, DAY, 3)),
    );

    expect(results.filter(Boolean)).toHaveLength(3);
    expect(await findDailyUse(testDb.db, A, DAY)).toBe(3);
  });

  test("AC-15: 数えた 1 回を戻せる。0 より下にはならない", async () => {
    await claimDailyUse(testDb.db, A, DAY, 3);

    await releaseDailyUse(testDb.db, A, DAY);
    await releaseDailyUse(testDb.db, A, DAY);

    expect(await findDailyUse(testDb.db, A, DAY)).toBe(0);
    expect(await findDailyUse(testDb.db, B, DAY)).toBe(0);
  });

  test("AC-12: 退会（user を消す）と、回数の行も消える", async () => {
    await claimDailyUse(testDb.db, A, DAY, 3);

    await testDb.db.delete(user).where(eq(user.id, A));

    expect(await findDailyUse(testDb.db, A, DAY)).toBe(0);
  });
});

describe("月の費用", () => {
  test("AC-15: 月ごとに足していき、まだ使っていない月は 0", async () => {
    expect(await findMonthlyCost(testDb.db, "2026-11")).toBe(0);

    await addMonthlyCost(testDb.db, "2026-11", 150);
    await Promise.all([
      addMonthlyCost(testDb.db, "2026-11", 100),
      addMonthlyCost(testDb.db, "2026-11", 50),
    ]);

    expect(await findMonthlyCost(testDb.db, "2026-11")).toBe(300);
    expect(await findMonthlyCost(testDb.db, "2026-12")).toBe(0);
  });
});
