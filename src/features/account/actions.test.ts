// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createCharacter, insertEntry } from "@/features/cloud/repository";
import {
  account,
  characters,
  diaryEntries,
  session,
  user,
} from "@/lib/db/schema";
import { createTestDb, type TestDb } from "@/lib/db/test-db";

// The real Server Action, against PGlite; only the session is faked.
vi.unmock("@/features/account/actions");

const server = vi.hoisted(() => ({
  db: undefined as unknown,
  signedIn: null as { userId: string; since: Date } | null,
}));

vi.mock("@/lib/db/client", () => ({ getDb: () => server.db }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth", () => ({
  getAuth: () => ({
    api: {
      getSession: async () =>
        server.signedIn === null
          ? null
          : {
              user: { id: server.signedIn.userId },
              session: { createdAt: server.signedIn.since },
            },
    },
  }),
}));

const { withdrawAccount } = await import("./actions");

const A = "user-a";
const B = "user-b";
const HOUR = 60 * 60 * 1000;

let testDb: TestDb;

async function rowsOf(userId: string) {
  const { db } = testDb;
  return {
    user: await db.select().from(user).where(eq(user.id, userId)),
    session: await db.select().from(session).where(eq(session.userId, userId)),
    account: await db.select().from(account).where(eq(account.userId, userId)),
    characters: await db
      .select()
      .from(characters)
      .where(eq(characters.userId, userId)),
    entries: await db
      .select()
      .from(diaryEntries)
      .where(eq(diaryEntries.userId, userId)),
  };
}

beforeEach(async () => {
  testDb = await createTestDb();
  const { db } = testDb;
  for (const id of [A, B]) {
    await testDb.addUser(id);
    await db.insert(session).values({
      id: `session-${id}`,
      userId: id,
      token: `token-${id}`,
      expiresAt: new Date(Date.now() + 24 * HOUR),
      updatedAt: new Date(),
    });
    await db.insert(account).values({
      id: `account-${id}`,
      userId: id,
      providerId: "google",
      accountId: `google-${id}`,
      updatedAt: new Date(),
    });
    await createCharacter(db, id, { name: "ぴよ", totalExp: 0 });
    await insertEntry(
      db,
      id,
      {
        date: "2026-11-12",
        body: "日記",
        createdAt: "2026-11-12T12:00:00.000Z",
      },
      10,
    );
  }
  server.db = db;
  server.signedIn = { userId: A, since: new Date(Date.now() - HOUR) };
});

afterEach(async () => {
  await testDb.close();
});

describe("退会", () => {
  test("AC-26: ログインして 1 日以内なら、その人の記録（ログイン・Google・キャラクター・日記）がすべて消える", async () => {
    expect(await withdrawAccount()).toStrictEqual({ ok: true });

    expect(await rowsOf(A)).toStrictEqual({
      user: [],
      session: [],
      account: [],
      characters: [],
      entries: [],
    });
    // Only that person: B keeps everything.
    const b = await rowsOf(B);
    expect(b.user).toHaveLength(1);
    expect(b.entries).toHaveLength(1);
  });

  test("AC-25: ログインして 1 日より前なら、何も消さずに「ログインし直して」を返す", async () => {
    server.signedIn = { userId: A, since: new Date(Date.now() - 25 * HOUR) };

    expect(await withdrawAccount()).toStrictEqual({
      ok: false,
      reason: "reauth",
    });
    const a = await rowsOf(A);
    expect(a.user).toHaveLength(1);
    expect(a.entries).toHaveLength(1);
  });

  test("AC-29: ログインしていなければ、何も消さずに断る", async () => {
    server.signedIn = null;

    expect(await withdrawAccount()).toStrictEqual({
      ok: false,
      reason: "unauthorized",
    });
    expect((await rowsOf(A)).user).toHaveLength(1);
  });
});
