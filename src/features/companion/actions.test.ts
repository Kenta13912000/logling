// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  createCharacter,
  deleteEntry,
  getSaveData,
  insertEntry,
  updateEntryBody,
} from "@/features/cloud/repository";
import { createTestDb, type TestDb } from "@/lib/db/test-db";

import {
  addMonthlyCost,
  findCompanionSetting,
  findDailyUse,
  findMonthlyCost,
} from "./repository";

// The real Server Actions, against PGlite; only the session is faked.
vi.unmock("@/features/companion/actions");

const server = vi.hoisted(() => ({
  db: undefined as unknown,
  userId: null as string | null,
}));

// The comment generator is replaced, so nothing is sent to the AI service.
const ai = vi.hoisted(() => ({
  generate: null as null | ((input: { body: string }) => Promise<unknown>),
  calls: [] as { body: string }[],
}));

vi.mock("server-only", () => ({}));
vi.mock("./generator", () => ({
  getCommentGenerator: () =>
    ai.generate === null
      ? null
      : (input: { body: string }) => {
          ai.calls.push(input);
          return ai.generate!(input);
        },
}));
vi.mock("@/lib/db/client", () => ({ getDb: () => server.db }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth", () => ({
  getAuth: () => ({
    api: {
      getSession: async () =>
        server.userId === null ? null : { user: { id: server.userId } },
    },
  }),
}));

const { getCompanionSetting, requestComment, setCompanionEnabled } =
  await import("./actions");

const A = "user-a";
const B = "user-b";

let testDb: TestDb;

beforeEach(async () => {
  testDb = await createTestDb();
  await testDb.addUser(A);
  await testDb.addUser(B);
  server.db = testDb.db;
  server.userId = A;
});

afterEach(async () => {
  vi.restoreAllMocks();
  await testDb.close();
});

describe("ログインしていないとき", () => {
  test("AC-1, AC-4: 読む・変えるのどちらも「ログインしていない」を返し、何も保存しない", async () => {
    server.userId = null;

    for (const result of [
      await getCompanionSetting(),
      await setCompanionEnabled(true),
    ]) {
      expect(result).toStrictEqual({ ok: false, reason: "unauthorized" });
    }
    expect((await findCompanionSetting(testDb.db, A)).enabled).toBe(false);
  });
});

describe("ログイン中", () => {
  test("AC-1: はじめはオフ", async () => {
    expect(await getCompanionSetting()).toStrictEqual({
      ok: true,
      enabled: false,
    });
  });

  test("AC-2, AC-3: オンにするとオン、オフにするとオフになり、読み直しても同じ", async () => {
    expect(await setCompanionEnabled(true)).toStrictEqual({
      ok: true,
      enabled: true,
    });
    expect(await getCompanionSetting()).toStrictEqual({
      ok: true,
      enabled: true,
    });
    const setting = await findCompanionSetting(testDb.db, A);
    expect(setting.enabledAt).toBeInstanceOf(Date);

    expect(await setCompanionEnabled(false)).toStrictEqual({
      ok: true,
      enabled: false,
    });
    expect(await getCompanionSetting()).toStrictEqual({
      ok: true,
      enabled: false,
    });
  });

  test("AC-4: 持ち主はログイン情報で決まり、ほかの人のオン・オフは変わらない", async () => {
    await setCompanionEnabled(true);

    expect((await findCompanionSetting(testDb.db, B)).enabled).toBe(false);
    server.userId = B;
    expect(await getCompanionSetting()).toStrictEqual({
      ok: true,
      enabled: false,
    });
  });

  test("AC-4: true か false 以外は保存せず、「入力が正しくない」を返す", async () => {
    for (const value of ["yes", 1, null, undefined]) {
      expect(
        await setCompanionEnabled(value as unknown as boolean),
      ).toStrictEqual({ ok: false, reason: "invalid" });
    }
    expect((await findCompanionSetting(testDb.db, A)).enabled).toBe(false);
  });

  test("AC-4: DB で失敗したときは「失敗」を返し、エラーの中身を記録に出さない", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    server.db = {
      select: () => {
        throw new Error("secret detail");
      },
    };

    expect(await getCompanionSetting()).toStrictEqual({
      ok: false,
      reason: "failed",
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret detail");
  });
});

describe("コメントを頼む（requestComment）", () => {
  // 21:00 on 2026-11-15 in Japan.
  const NOW = new Date("2026-11-15T12:00:00.000Z");
  const AFTER = "2026-11-15T12:30:00.000Z";
  const BEFORE = "2026-11-14T12:00:00.000Z";
  const BODY = "仕事で発表があって緊張した。ケーキを買った。";

  const usage = { inputTokens: 1000, outputTokens: 100 };

  async function write(date: string, createdAt: string, body = BODY) {
    await insertEntry(testDb.db, A, { date, body, createdAt }, 10);
  }

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    ai.calls = [];
    ai.generate = async () => ({
      ok: true,
      text: "発表おつかれさま！",
      usage,
    });
    await createCharacter(testDb.db, A, {
      name: "ちびすけ",
      totalExp: 0,
      startDate: "2026-11-01",
    });
    await setCompanionEnabled(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("AC-5, AC-10, AC-16: オンにしたあとの日記なら、本文だけで（名前は送らずに）頼み、コメントを残して返す", async () => {
    await write("2026-11-15", AFTER);

    expect(await requestComment("2026-11-15")).toStrictEqual({
      status: "ok",
      comment: "発表おつかれさま！",
    });
    // fix/companion-name: only the body is sent, never the name.
    expect(ai.calls).toStrictEqual([{ body: BODY }]);
    expect((await getSaveData(testDb.db, A)).entries[0]?.comment).toBe(
      "発表おつかれさま！",
    );
  });

  test("AC-6: 後から書いた日の日記にも頼める", async () => {
    await insertEntry(
      testDb.db,
      A,
      {
        date: "2026-11-13",
        body: "書き忘れた日",
        createdAt: AFTER,
        writtenLater: true,
      },
      5,
    );

    expect(await requestComment("2026-11-13")).toMatchObject({ status: "ok" });
  });

  test("AC-9: オフ・ログインしていない・日記がない・オンにする前の日記・正しくない日付では、AI に頼まない", async () => {
    await write("2026-11-14", BEFORE);

    expect(await requestComment("2026-11-14")).toStrictEqual({
      status: "beforeEnabled",
    });
    expect(await requestComment("2026-11-10")).toStrictEqual({
      status: "noEntry",
    });
    expect(await requestComment("11/15")).toStrictEqual({ status: "invalid" });
    await write("2026-11-15", AFTER);
    await setCompanionEnabled(false);
    expect(await requestComment("2026-11-15")).toStrictEqual({ status: "off" });
    server.userId = null;
    expect(await requestComment("2026-11-15")).toStrictEqual({
      status: "unauthorized",
    });

    expect(ai.calls).toStrictEqual([]);
  });

  test("AC-4, AC-11: もうコメントがあれば、AI に頼まずにそれを返す（書き直したあとも）", async () => {
    await write("2026-11-15", AFTER);
    await requestComment("2026-11-15");
    await updateEntryBody(testDb.db, A, "2026-11-15", "書き直した");

    expect(await requestComment("2026-11-15")).toStrictEqual({
      status: "ok",
      comment: "発表おつかれさま！",
    });
    expect(ai.calls).toHaveLength(1);
  });

  test("AC-14: 1 日 3 回まで（作れなかったぶんも数える）。4 回目は「今日はここまで」で、AI に頼まない", async () => {
    for (const date of [
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
      "2026-11-15",
    ]) {
      await write(date, AFTER);
    }
    ai.generate = async () => ({ ok: false, usage });
    expect(await requestComment("2026-11-12")).toStrictEqual({
      status: "failed",
    });
    ai.generate = async () => ({ ok: true, text: "いいね", usage });
    await requestComment("2026-11-13");
    await requestComment("2026-11-14");

    expect(await requestComment("2026-11-15")).toStrictEqual({
      status: "dailyLimit",
    });
    expect(ai.calls).toHaveLength(3);
    expect(await findDailyUse(testDb.db, A, "2026-11-15")).toBe(3);
  });

  test("AC-14: 日本の朝 4 時を過ぎると、また頼める", async () => {
    for (const date of ["2026-11-12", "2026-11-13", "2026-11-14"]) {
      await write(date, AFTER);
      await requestComment(date);
    }
    await write("2026-11-15", AFTER);
    // 03:59 the next morning in Japan: still the same day.
    vi.setSystemTime(new Date("2026-11-15T18:59:00.000Z"));
    expect(await requestComment("2026-11-15")).toStrictEqual({
      status: "dailyLimit",
    });

    // 04:00: a new day.
    vi.setSystemTime(new Date("2026-11-15T19:00:00.000Z"));
    expect(await requestComment("2026-11-15")).toMatchObject({ status: "ok" });
  });

  test("AC-15: 頼んだぶんの費用を今月に足す（作れなかったときも）", async () => {
    await write("2026-11-14", AFTER);
    await write("2026-11-15", AFTER);
    ai.generate = async () => ({ ok: false, usage });
    await requestComment("2026-11-14");
    ai.generate = async () => ({ ok: true, text: "いいね", usage });
    await requestComment("2026-11-15");

    expect(await findMonthlyCost(testDb.db, "2026-11")).toBe(300);
  });

  test("AC-15: 今月の費用が上限に届いていれば「今月はお休み」で、AI に頼まず、回数も増えない", async () => {
    await write("2026-11-15", AFTER);
    await addMonthlyCost(testDb.db, "2026-11", 5_000_000);

    expect(await requestComment("2026-11-15")).toStrictEqual({
      status: "monthlyLimit",
    });
    expect(ai.calls).toStrictEqual([]);
    expect(await findDailyUse(testDb.db, A, "2026-11-15")).toBe(0);
  });

  test("AC-13: 鍵がない（作る部品がない）ときは「作れなかった」で、回数は数えない。日記はそのまま", async () => {
    await write("2026-11-15", AFTER);
    ai.generate = null;

    expect(await requestComment("2026-11-15")).toStrictEqual({
      status: "failed",
    });
    expect(await findDailyUse(testDb.db, A, "2026-11-15")).toBe(0);
    expect((await getSaveData(testDb.db, A)).entries).toHaveLength(1);
  });

  test("AC-13, AC-18: AI が失敗しても「作れなかった」で日記はそのまま。本文・名前・答えを記録に出さない", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await write("2026-11-15", AFTER);
    ai.generate = async (input) => {
      throw new Error(`upstream said: ${input.body}`);
    };

    expect(await requestComment("2026-11-15")).toStrictEqual({
      status: "failed",
    });
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).not.toContain(BODY);
    expect(logged).not.toContain("ちびすけ");
    expect((await getSaveData(testDb.db, A)).entries[0]).toMatchObject({
      body: BODY,
    });
    expect(
      (await getSaveData(testDb.db, A)).entries[0]?.comment,
    ).toBeUndefined();
  });

  test("AC-10: 頼んでいる間に日記が消されていたら「日記がない」で、コメントは残らない", async () => {
    await write("2026-11-15", AFTER);
    ai.generate = async () => {
      await deleteEntry(testDb.db, A, "2026-11-15", 10);
      return { ok: true, text: "おそかった", usage };
    };

    expect(await requestComment("2026-11-15")).toStrictEqual({
      status: "noEntry",
    });
  });
});
