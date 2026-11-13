// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createTestDb, type TestDb } from "@/lib/db/test-db";

import { findReminder } from "./repository";

// The real Server Actions, against PGlite; only the session is faked.
vi.unmock("@/features/reminder/actions");

const server = vi.hoisted(() => ({
  db: undefined as unknown,
  userId: null as string | null,
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

const { getReminder, removeReminder, saveReminder } = await import("./actions");

const A = "user-a";
const B = "user-b";
const PHONE = "https://web.push.apple.com/phone-of-a";

const input = (minute = 1260) => ({
  subscription: {
    endpoint: PHONE,
    keys: { p256dh: "B".repeat(87), auth: "a".repeat(22) },
  },
  minute,
  timeZone: "Asia/Tokyo",
});

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
  test("AC-18: 読む・保存・消すのどれも「ログインしていない」を返し、何も保存しない", async () => {
    server.userId = null;

    for (const result of [
      await getReminder(PHONE),
      await saveReminder(input()),
      await removeReminder(PHONE),
    ]) {
      expect(result).toStrictEqual({ ok: false, reason: "unauthorized" });
    }
    expect(await findReminder(testDb.db, A, PHONE)).toBeNull();
  });
});

describe("ログイン中", () => {
  test("AC-6, AC-7: はじめはオフ。保存するとオンになって時刻が返り、時刻を変えられる", async () => {
    expect(await getReminder(PHONE)).toStrictEqual({ ok: true, minute: null });

    expect(await saveReminder(input(1260))).toStrictEqual({
      ok: true,
      minute: 1260,
    });
    expect(await getReminder(PHONE)).toStrictEqual({ ok: true, minute: 1260 });

    expect(await saveReminder(input(1290))).toStrictEqual({
      ok: true,
      minute: 1290,
    });
    expect(await getReminder(PHONE)).toStrictEqual({ ok: true, minute: 1290 });
  });

  test("AC-15: 消すとオフになる", async () => {
    await saveReminder(input());

    expect(await removeReminder(PHONE)).toStrictEqual({
      ok: true,
      minute: null,
    });
    expect(await getReminder(PHONE)).toStrictEqual({ ok: true, minute: null });
  });

  test("AC-8: 持ち主は、送られてきた値ではなく、サーバーのログイン情報で決まる", async () => {
    await saveReminder({ ...input(), userId: B });

    expect(await findReminder(testDb.db, A, PHONE)).not.toBeNull();
    expect(await findReminder(testDb.db, B, PHONE)).toBeNull();
  });

  test("AC-15: ほかの人の端末の宛先は、読めず、消せない", async () => {
    await saveReminder(input());
    server.userId = B;

    expect(await getReminder(PHONE)).toStrictEqual({ ok: true, minute: null });
    await removeReminder(PHONE);
    expect(await findReminder(testDb.db, A, PHONE)).not.toBeNull();
  });

  test("AC-10: 正しくない値は「正しくない」を返し、保存しない", async () => {
    const result = await saveReminder({ ...input(), minute: 15 });

    expect(result).toStrictEqual({ ok: false, reason: "invalid" });
    expect(await findReminder(testDb.db, A, PHONE)).toBeNull();
  });

  test("AC-10: DB で失敗したときは「失敗」を返し、宛先を記録（ログ）に出さない", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    // Any use of the database fails, with the address in the error text.
    server.db = new Proxy(
      {},
      {
        get() {
          throw new Error(`database is down: ${PHONE}`);
        },
      },
    );

    for (const result of [
      await getReminder(PHONE),
      await saveReminder(input()),
      await removeReminder(PHONE),
    ]) {
      expect(result).toStrictEqual({ ok: false, reason: "failed" });
    }
    expect(JSON.stringify(log.mock.calls)).not.toContain(PHONE);
  });
});
