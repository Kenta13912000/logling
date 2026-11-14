// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { DiaryEntry } from "@/features/diary/diary";
import { createTestDb, type TestDb } from "@/lib/db/test-db";

import { getSaveData } from "./repository";

// The real Server Actions, against PGlite; only the session is faked.
vi.unmock("@/features/cloud/actions");

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

const {
  addCloudEntry,
  createCloudCharacter,
  deleteCloudEntry,
  editCloudEntry,
  loadCloudData,
  renameCloudCharacter,
} = await import("./actions");

const A = "user-a";

const entry = (date: string, body: string): DiaryEntry => ({
  date,
  body,
  createdAt: `${date}T12:34:56.789Z`,
});

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

describe("ログインしていないとき", () => {
  test("AC-29: どの処理も DB に触れずに「ログインしていない」を返す", async () => {
    server.userId = null;
    const results = [
      await loadCloudData(),
      await createCloudCharacter({ name: "ぴよ", totalExp: 0 }),
      await addCloudEntry(entry("2026-11-12", "日記"), 10),
      await editCloudEntry("2026-11-12", "書き直し"),
      await deleteCloudEntry("2026-11-12", 10),
    ];

    for (const result of results) {
      expect(result).toStrictEqual({ ok: false, reason: "unauthorized" });
    }
    expect(await getSaveData(testDb.db, A)).toStrictEqual({
      version: 1,
      character: null,
      entries: [],
    });
  });
});

describe("ログイン中", () => {
  test("AC-8: 読み込むと、ログイン中の人のデータが返る（まだなければ空）", async () => {
    expect(await loadCloudData()).toStrictEqual({
      ok: true,
      data: { version: 1, character: null, entries: [] },
    });
  });

  test("AC-8: キャラクターを作る・日記を足す・書き直す・消すと、そのたびに最新のデータが返る", async () => {
    const created = await createCloudCharacter({
      name: "ぴよ",
      totalExp: 0,
      startDate: "2026-11-10",
    });
    expect(created).toMatchObject({
      ok: true,
      data: { character: { name: "ぴよ", totalExp: 0 } },
    });

    const added = await addCloudEntry(entry("2026-11-11", "1 日目"), 10);
    expect(added).toMatchObject({
      ok: true,
      data: {
        character: { totalExp: 10 },
        entries: [entry("2026-11-11", "1 日目")],
      },
    });

    await addCloudEntry(entry("2026-11-12", "2 日目"), 10);
    const edited = await editCloudEntry("2026-11-11", "書き直した");
    expect(edited).toMatchObject({
      ok: true,
      data: { entries: [{ body: "書き直した" }, { body: "2 日目" }] },
    });

    const deleted = await deleteCloudEntry("2026-11-12", 10);
    expect(deleted).toStrictEqual({
      ok: true,
      data: {
        version: 1,
        character: { name: "ぴよ", totalExp: 10, startDate: "2026-11-10" },
        entries: [entry("2026-11-11", "書き直した")],
      },
    });
  });

  test("AC-8: 正しくない入力は保存せず、「入力が正しくない」を返す", async () => {
    await createCloudCharacter({ name: "ぴよ", totalExp: 0 });

    const results = [
      await createCloudCharacter({ name: "", totalExp: 0 }),
      await addCloudEntry(entry("2026-11-12", "日記"), 61),
      await addCloudEntry({ ...entry("2026-11-12", "日記"), date: "x" }, 10),
      await editCloudEntry("2026-11-12", "   "),
      await deleteCloudEntry("2026-11-12", -1),
      await addCloudEntry(entry("2026-11-12", "日記"), 10, "11/01"),
    ];

    for (const result of results) {
      expect(result).toStrictEqual({ ok: false, reason: "invalid" });
    }
    expect((await getSaveData(testDb.db, A)).entries).toStrictEqual([]);
  });

  test("AC-8: ないものを書き直す・消す、キャラクターなしで足す、同じ日を二重に足すは、その理由を返す", async () => {
    expect(await addCloudEntry(entry("2026-11-12", "日記"), 10)).toMatchObject({
      ok: false,
      reason: "noCharacter",
    });
    await createCloudCharacter({ name: "ぴよ", totalExp: 0 });
    expect(await editCloudEntry("2026-11-12", "書き直し")).toMatchObject({
      ok: false,
      reason: "notFound",
    });
    expect(await deleteCloudEntry("2026-11-12", 10)).toMatchObject({
      ok: false,
      reason: "notFound",
    });
    await addCloudEntry(entry("2026-11-12", "1 件目"), 10);
    expect(
      await addCloudEntry(entry("2026-11-12", "2 件目"), 10),
    ).toMatchObject({ ok: false, reason: "exists" });
    expect(
      await createCloudCharacter({ name: "たま", totalExp: 0 }),
    ).toMatchObject({ ok: false, reason: "exists" });
  });

  test("AC-13: ほかの端末で変わっていたために断るときも、最新のデータをいっしょに返す", async () => {
    await createCloudCharacter({ name: "ぴよ", totalExp: 0 });
    // Another device already wrote today.
    await addCloudEntry(entry("2026-11-12", "PC で書いた"), 10);
    const latest = {
      version: 1,
      character: { name: "ぴよ", totalExp: 10 },
      entries: [entry("2026-11-12", "PC で書いた")],
    };

    expect(
      await addCloudEntry(entry("2026-11-12", "スマホで書いた"), 10),
    ).toStrictEqual({ ok: false, reason: "exists", data: latest });
    expect(await editCloudEntry("2026-11-11", "消された日記")).toStrictEqual({
      ok: false,
      reason: "notFound",
      data: latest,
    });
    expect(await deleteCloudEntry("2026-11-11", 10)).toStrictEqual({
      ok: false,
      reason: "notFound",
      data: latest,
    });
    expect(
      await createCloudCharacter({ name: "たま", totalExp: 0 }),
    ).toStrictEqual({ ok: false, reason: "exists", data: latest });
  });

  test("AC-8: 始めた日のないキャラクターは、書き直す・消すときに渡された始めた日が入り、あとから変わらない", async () => {
    await createCloudCharacter({ name: "ぴよ", totalExp: 0 });
    await addCloudEntry(entry("2026-11-05", "古い日記"), 10);
    await addCloudEntry(entry("2026-11-06", "次の日記"), 10);

    await editCloudEntry("2026-11-06", "書き直し", "2026-11-05");
    const later = await deleteCloudEntry("2026-11-05", 10, "2026-11-06");

    expect(later).toMatchObject({
      ok: true,
      data: { character: { startDate: "2026-11-05" } },
    });
  });
});

describe("名前を変える（settings）", () => {
  test("settings AC-8: ログインしていないときは「ログインしていない」を返し、名前を変えない", async () => {
    await createCloudCharacter({ name: "ぴよ", totalExp: 0 });
    server.userId = null;

    expect(await renameCloudCharacter("ちびすけ")).toStrictEqual({
      ok: false,
      reason: "unauthorized",
    });
    expect((await getSaveData(testDb.db, A)).character?.name).toBe("ぴよ");
  });

  test("settings AC-6, AC-8: ログイン中の人のキャラクターの名前だけが変わり、最新のデータが返る", async () => {
    await createCloudCharacter({
      name: "ぴよ",
      totalExp: 0,
      startDate: "2026-11-10",
    });
    await addCloudEntry(entry("2026-11-11", "日記"), 10);

    expect(await renameCloudCharacter(" ちびすけ ")).toStrictEqual({
      ok: true,
      data: {
        version: 1,
        character: { name: "ちびすけ", totalExp: 10, startDate: "2026-11-10" },
        entries: [entry("2026-11-11", "日記")],
      },
    });
  });

  test("settings AC-3: 決まりに合わない名前は変えず、「入力が正しくない」を返す", async () => {
    await createCloudCharacter({ name: "ぴよ", totalExp: 0 });

    for (const name of ["", "   ", "あ".repeat(11), 42 as unknown as string]) {
      expect(await renameCloudCharacter(name)).toStrictEqual({
        ok: false,
        reason: "invalid",
      });
    }
    expect((await getSaveData(testDb.db, A)).character?.name).toBe("ぴよ");
  });

  test("settings AC-10: キャラクターがないときは、その理由と最新のデータを返す", async () => {
    expect(await renameCloudCharacter("ちびすけ")).toStrictEqual({
      ok: false,
      reason: "noCharacter",
      data: { version: 1, character: null, entries: [] },
    });
  });
});
