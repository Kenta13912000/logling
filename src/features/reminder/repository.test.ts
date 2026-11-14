// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, expect, test } from "vitest";

import { user } from "@/lib/db/schema";
import { createTestDb, type TestDb } from "@/lib/db/test-db";

import { deleteReminder, findReminder, upsertReminder } from "./repository";
import type { ReminderInput } from "./validate";

const A = "user-a";
const B = "user-b";
const PHONE = "https://web.push.apple.com/phone";
const PC = "https://fcm.googleapis.com/fcm/send/pc";

const reminder = (
  endpoint: string,
  minute = 1260,
  timeZone = "Asia/Tokyo",
): ReminderInput => ({
  subscription: {
    endpoint,
    keys: { p256dh: "B".repeat(87), auth: "a".repeat(22) },
  },
  minute,
  timeZone,
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

test("AC-7, AC-8: 宛先を保存すると、その端末の時刻とタイムゾーンが読める。保存していない端末はオフ", async () => {
  await upsertReminder(testDb.db, A, reminder(PHONE));

  expect(await findReminder(testDb.db, A, PHONE)).toStrictEqual({
    minute: 1260,
    timeZone: "Asia/Tokyo",
  });
  expect(await findReminder(testDb.db, A, PC)).toBeNull();
});

test("AC-7: もう一度保存すると、時刻とタイムゾーンが変わる", async () => {
  await upsertReminder(testDb.db, A, reminder(PHONE, 1260));
  await upsertReminder(testDb.db, A, reminder(PHONE, 1290, "UTC"));

  expect(await findReminder(testDb.db, A, PHONE)).toStrictEqual({
    minute: 1290,
    timeZone: "UTC",
  });
});

test("AC-8: 端末ごとに別の時刻を持てる", async () => {
  await upsertReminder(testDb.db, A, reminder(PHONE, 1260));
  await upsertReminder(testDb.db, A, reminder(PC, 600));

  expect((await findReminder(testDb.db, A, PHONE))?.minute).toBe(1260);
  expect((await findReminder(testDb.db, A, PC))?.minute).toBe(600);
});

test("AC-8: 同じ端末で別の人がオンにすると、持ち主が付けかわる", async () => {
  await upsertReminder(testDb.db, A, reminder(PHONE, 1260));
  await upsertReminder(testDb.db, B, reminder(PHONE, 600));

  expect(await findReminder(testDb.db, A, PHONE)).toBeNull();
  expect((await findReminder(testDb.db, B, PHONE))?.minute).toBe(600);
});

test("AC-15: 宛先を消すと、それからはオフ。ほかの人の宛先は消せない", async () => {
  await upsertReminder(testDb.db, A, reminder(PHONE));
  await upsertReminder(testDb.db, B, reminder(PC));

  await deleteReminder(testDb.db, A, PHONE);
  await deleteReminder(testDb.db, A, PC);

  expect(await findReminder(testDb.db, A, PHONE)).toBeNull();
  expect(await findReminder(testDb.db, B, PC)).not.toBeNull();
});

test("AC-16: 退会すると（user を消すと）、その人のすべての端末の宛先と時刻が消える", async () => {
  await upsertReminder(testDb.db, A, reminder(PHONE));
  await upsertReminder(testDb.db, A, reminder(PC));
  await upsertReminder(testDb.db, B, reminder("https://web.push.apple.com/b"));

  await testDb.db.delete(user).where(eq(user.id, A));

  expect(await findReminder(testDb.db, A, PHONE)).toBeNull();
  expect(await findReminder(testDb.db, A, PC)).toBeNull();
  expect(
    await findReminder(testDb.db, B, "https://web.push.apple.com/b"),
  ).not.toBeNull();
});
