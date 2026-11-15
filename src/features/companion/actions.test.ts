// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createTestDb, type TestDb } from "@/lib/db/test-db";

import { findCompanionSetting } from "./repository";

// The real Server Actions, against PGlite; only the session is faked.
vi.unmock("@/features/companion/actions");

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

const { getCompanionSetting, setCompanionEnabled } = await import("./actions");

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
