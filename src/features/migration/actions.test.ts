// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createCharacter, getSaveData } from "@/features/cloud/repository";
import type { SaveData } from "@/features/home/save-data";
import { createTestDb, type TestDb } from "@/lib/db/test-db";

// The real Server Action, against PGlite; only the session is faked.
vi.unmock("@/features/migration/actions");

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

const { importCloudData } = await import("./actions");

const A = "user-a";
const EMPTY: SaveData = { version: 1, character: null, entries: [] };

const browser: SaveData = {
  version: 1,
  character: { name: "ぴよ", totalExp: 45, startDate: "2026-11-01" },
  entries: [
    {
      date: "2026-11-04",
      body: "ふつうの日",
      createdAt: "2026-11-04T12:00:00.000Z",
    },
    {
      date: "2026-11-05",
      body: "あとから",
      createdAt: "2026-11-06T12:00:00.000Z",
      writtenLater: true,
    },
  ],
};

let testDb: TestDb;

beforeEach(async () => {
  testDb = await createTestDb();
  await testDb.addUser(A);
  server.db = testDb.db;
  server.userId = A;
});

afterEach(async () => {
  await testDb.close();
});

describe("ブラウザのデータを移す", () => {
  test("AC-29: ログインしていなければ、何も移さずに「ログインしていない」を返す", async () => {
    server.userId = null;

    expect(await importCloudData(browser, "ifEmpty")).toStrictEqual({
      ok: false,
      reason: "unauthorized",
    });
    expect(await getSaveData(testDb.db, A)).toStrictEqual(EMPTY);
  });

  test("AC-14: アカウントが空なら、そのまま移して最新のデータを返す", async () => {
    expect(await importCloudData(browser, "ifEmpty")).toStrictEqual({
      ok: true,
      data: browser,
    });
  });

  test("AC-18: アカウントにもういるとき（ifEmpty）は、移さずに最新のデータを返す", async () => {
    await createCharacter(testDb.db, A, { name: "たま", totalExp: 30 });

    expect(await importCloudData(browser, "ifEmpty")).toStrictEqual({
      ok: false,
      reason: "exists",
      data: {
        version: 1,
        character: { name: "たま", totalExp: 30 },
        entries: [],
      },
    });
  });

  test("AC-19: ブラウザの方を選んだとき（replace）は、アカウントのデータを置き換える", async () => {
    await createCharacter(testDb.db, A, { name: "たま", totalExp: 30 });

    expect(await importCloudData(browser, "replace")).toStrictEqual({
      ok: true,
      data: browser,
    });
  });

  test("AC-15: 1 件でもおかしい日記があれば、何も移さずに「入力が正しくない」を返す", async () => {
    const broken = {
      ...browser,
      entries: [...browser.entries, { ...browser.entries[0], body: "" }],
    };
    const sameDay = {
      ...browser,
      entries: [...browser.entries, { ...browser.entries[0] }],
    };
    const noCharacter = { ...browser, character: null };

    for (const data of [broken, sameDay, noCharacter]) {
      expect(await importCloudData(data, "ifEmpty")).toStrictEqual({
        ok: false,
        reason: "invalid",
      });
    }
    expect(
      await importCloudData(browser, "everything" as "replace"),
    ).toStrictEqual({ ok: false, reason: "invalid" });
    expect(await getSaveData(testDb.db, A)).toStrictEqual(EMPTY);
  });
});
