// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createCharacter, insertEntry } from "@/features/cloud/repository";
import { pushSubscriptions } from "@/lib/db/schema";
import { createTestDb, type TestDb } from "@/lib/db/test-db";

import { findReminder, upsertReminder } from "./repository";
import {
  reminderMessage,
  sendDueReminders,
  type SendResult,
  type Sender,
} from "./send-reminders";

const PIYO = "user-piyo"; // has a character named ぴよ
const NEW = "user-new"; // has not named one yet
const DONE = "user-done"; // already wrote today

const PHONE = "https://web.push.apple.com/piyo-phone";
const NEW_PHONE = "https://fcm.googleapis.com/fcm/send/new-phone";
const DONE_PHONE = "https://web.push.apple.com/done-phone";

/** 21:07 in Tokyo on 2026-11-13: due for a 21:00 reminder. */
const NOW = new Date("2026-11-13T12:07:00Z");
const TODAY = "2026-11-13";

let testDb: TestDb;
let send: ReturnType<typeof vi.fn<Sender>>;

async function turnOn(userId: string, endpoint: string, minute = 1260) {
  await upsertReminder(testDb.db, userId, {
    subscription: {
      endpoint,
      keys: { p256dh: "B".repeat(87), auth: "a".repeat(22) },
    },
    minute,
    timeZone: "Asia/Tokyo",
  });
}

async function lastSentOn(endpoint: string) {
  const [row] = await testDb.db
    .select({ lastSentOn: pushSubscriptions.lastSentOn })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
  return row?.lastSentOn ?? null;
}

const sentTo = () => send.mock.calls.map(([target]) => target.endpoint);

beforeEach(async () => {
  testDb = await createTestDb();
  for (const id of [PIYO, NEW, DONE]) {
    await testDb.addUser(id);
  }
  await createCharacter(testDb.db, PIYO, { name: "ぴよ", totalExp: 0 });
  await createCharacter(testDb.db, DONE, { name: "たま", totalExp: 0 });
  await insertEntry(
    testDb.db,
    DONE,
    { date: TODAY, body: "もう書いた日記", createdAt: NOW.toISOString() },
    10,
  );
  await turnOn(PIYO, PHONE);
  await turnOn(NEW, NEW_PHONE);
  await turnOn(DONE, DONE_PHONE);
  send = vi.fn<Sender>(async () => "sent");
});

afterEach(async () => {
  await testDb.close();
});

describe("お知らせの文", () => {
  test("AC-11: キャラクターの名前入りで、押すとホームを開く。名前を付ける前は「今日の日記を書こう」", () => {
    expect(reminderMessage("ぴよ")).toStrictEqual({
      title: "logling",
      body: "ぴよが待っているよ。今日の日記を書こう",
      url: "/",
    });
    expect(reminderMessage(null)).toStrictEqual({
      title: "logling",
      body: "今日の日記を書こう",
      url: "/",
    });
  });
});

describe("送る相手", () => {
  test("AC-11, AC-12: 送る時刻の、まだ書いていない人にだけ送る。書いた人には送らない", async () => {
    const summary = await sendDueReminders(testDb.db, NOW, send);

    expect(sentTo().sort()).toStrictEqual([NEW_PHONE, PHONE].sort());
    expect(summary).toStrictEqual({
      sent: 2,
      written: 1,
      removed: 0,
      failed: 0,
    });
  });

  test("AC-11: 文は名前入りで、日記の本文は入らない", async () => {
    await sendDueReminders(testDb.db, NOW, send);

    const message = (endpoint: string) =>
      send.mock.calls.find(([target]) => target.endpoint === endpoint)?.[1];
    expect(message(PHONE)?.body).toBe("ぴよが待っているよ。今日の日記を書こう");
    expect(message(NEW_PHONE)?.body).toBe("今日の日記を書こう");
    expect(JSON.stringify(send.mock.calls)).not.toContain("もう書いた日記");
  });

  test("AC-11: 宛先の鍵もいっしょに渡す", async () => {
    await sendDueReminders(testDb.db, NOW, send);

    expect(send.mock.calls[0][0]).toStrictEqual({
      endpoint: expect.any(String),
      keys: { p256dh: "B".repeat(87), auth: "a".repeat(22) },
    });
  });

  test("AC-11: 送る時刻でない人には送らない", async () => {
    await turnOn(PIYO, PHONE, 600);

    await sendDueReminders(testDb.db, NOW, send);

    expect(sentTo()).not.toContain(PHONE);
  });
});

describe("1 日 1 回まで（AC-13）", () => {
  test("AC-13: 送ると「最後に送った日」がその日になり、同じ日の次の回では送らない", async () => {
    await sendDueReminders(testDb.db, NOW, send);
    expect(await lastSentOn(PHONE)).toBe(TODAY);

    send.mockClear();
    await sendDueReminders(testDb.db, new Date("2026-11-13T12:38:00Z"), send);

    expect(send).not.toHaveBeenCalled();
  });

  test("AC-13: 同じ回が 2 つ同時に動いても、1 回だけ送る", async () => {
    await Promise.all([
      sendDueReminders(testDb.db, NOW, send),
      sendDueReminders(testDb.db, NOW, send),
    ]);

    expect(sentTo().filter((endpoint) => endpoint === PHONE)).toHaveLength(1);
  });
});

describe("送れなかったとき", () => {
  test("AC-17: 宛先がもう使えなければ、その宛先を消す", async () => {
    send.mockImplementation(async (target): Promise<SendResult> =>
      target.endpoint === PHONE ? "gone" : "sent",
    );

    const summary = await sendDueReminders(testDb.db, NOW, send);

    expect(await findReminder(testDb.db, PIYO, PHONE)).toBeNull();
    expect(await findReminder(testDb.db, NEW, NEW_PHONE)).not.toBeNull();
    expect(summary.removed).toBe(1);
  });

  test("AC-13: そのほかの失敗では「最後に送った日」を戻し、次の回でもう一度ためす", async () => {
    send.mockResolvedValueOnce("failed").mockResolvedValue("sent");
    const first = await sendDueReminders(testDb.db, NOW, send);
    const failedEndpoint = send.mock.calls[0][0].endpoint;

    expect(first.failed).toBe(1);
    expect(await lastSentOn(failedEndpoint)).toBeNull();

    send.mockClear();
    await sendDueReminders(testDb.db, new Date("2026-11-13T12:38:00Z"), send);
    expect(sentTo()).toStrictEqual([failedEndpoint]);
  });
});
