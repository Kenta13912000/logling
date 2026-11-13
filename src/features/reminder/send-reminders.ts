import { and, eq, isNull, ne, or } from "drizzle-orm";

import { characters, diaryEntries, pushSubscriptions } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";

import { dueDiaryDate } from "./due";
import type { PushTarget } from "./validate";

/** What a reminder says. Never the diary itself (AC-11). */
export type PushMessage = { title: string; body: string; url: string };

/** How one send went: delivered, the address is gone, or another failure. */
export type SendResult = "sent" | "gone" | "failed";

export type Sender = (
  target: PushTarget,
  message: PushMessage,
) => Promise<SendResult>;

/** Counts only: never addresses, names or diaries. */
export type SendSummary = {
  sent: number;
  written: number;
  removed: number;
  failed: number;
};

/** The reminder text: with the character's name once there is one. */
export function reminderMessage(name: string | null): PushMessage {
  return {
    title: "logling",
    body: name
      ? `${name}が待っているよ。今日の日記を書こう`
      : "今日の日記を書こう",
    url: "/",
  };
}

async function hasWritten(db: Db, userId: string, date: string) {
  const [entry] = await db
    .select({ date: diaryEntries.date })
    .from(diaryEntries)
    .where(and(eq(diaryEntries.userId, userId), eq(diaryEntries.date, date)))
    .limit(1);
  return entry !== undefined;
}

/**
 * Marks the reminder as sent for `date` first, and only the run that
 * manages to do so sends it: a run delivered twice sends once (AC-13).
 */
async function claim(db: Db, endpoint: string, date: string) {
  const claimed = await db
    .update(pushSubscriptions)
    .set({ lastSentOn: date })
    .where(
      and(
        eq(pushSubscriptions.endpoint, endpoint),
        or(
          isNull(pushSubscriptions.lastSentOn),
          ne(pushSubscriptions.lastSentOn, date),
        ),
      ),
    )
    .returning({ endpoint: pushSubscriptions.endpoint });
  return claimed.length > 0;
}

/** Sends every reminder that is due now (AC-11 to AC-13, AC-17). */
export async function sendDueReminders(
  db: Db,
  now: Date,
  send: Sender,
): Promise<SendSummary> {
  const summary: SendSummary = { sent: 0, written: 0, removed: 0, failed: 0 };
  const reminders = await db
    .select({
      endpoint: pushSubscriptions.endpoint,
      userId: pushSubscriptions.userId,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
      remindMinute: pushSubscriptions.remindMinute,
      timeZone: pushSubscriptions.timeZone,
      lastSentOn: pushSubscriptions.lastSentOn,
      name: characters.name,
    })
    .from(pushSubscriptions)
    .leftJoin(characters, eq(characters.userId, pushSubscriptions.userId));

  for (const reminder of reminders) {
    const date = dueDiaryDate(reminder, now);
    if (date === null) {
      continue;
    }
    if (await hasWritten(db, reminder.userId, date)) {
      summary.written += 1;
      continue;
    }
    if (!(await claim(db, reminder.endpoint, date))) {
      continue;
    }
    const result = await send(
      {
        endpoint: reminder.endpoint,
        keys: { p256dh: reminder.p256dh, auth: reminder.auth },
      },
      reminderMessage(reminder.name),
    );
    if (result === "sent") {
      summary.sent += 1;
    } else if (result === "gone") {
      // The device stopped accepting reminders (AC-17).
      await db
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, reminder.endpoint));
      summary.removed += 1;
    } else {
      // Undo the mark so the next run tries again within the window.
      await db
        .update(pushSubscriptions)
        .set({ lastSentOn: reminder.lastSentOn })
        .where(
          and(
            eq(pushSubscriptions.endpoint, reminder.endpoint),
            eq(pushSubscriptions.lastSentOn, date),
          ),
        );
      summary.failed += 1;
    }
  }
  return summary;
}
