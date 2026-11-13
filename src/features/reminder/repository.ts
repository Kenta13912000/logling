import { and, eq, sql } from "drizzle-orm";

import { pushSubscriptions } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";

import type { ReminderInput } from "./validate";

/** One device's reminder as stored. */
export type StoredReminder = { minute: number; timeZone: string };

/** This person's reminder for `endpoint`, or null (off on this device). */
export async function findReminder(
  db: Db,
  userId: string,
  endpoint: string,
): Promise<StoredReminder | null> {
  const [row] = await db
    .select({
      minute: pushSubscriptions.remindMinute,
      timeZone: pushSubscriptions.timeZone,
    })
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.endpoint, endpoint),
        eq(pushSubscriptions.userId, userId),
      ),
    );
  return row ?? null;
}

/**
 * Saves the device's reminder for this person: adds it, or changes its time.
 * If someone else had turned it on in this browser before, it becomes this
 * person's, and their "already reminded today" is cleared.
 */
export async function upsertReminder(
  db: Db,
  userId: string,
  { subscription, minute, timeZone }: ReminderInput,
): Promise<void> {
  await db
    .insert(pushSubscriptions)
    .values({
      endpoint: subscription.endpoint,
      userId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      remindMinute: minute,
      timeZone,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        remindMinute: minute,
        timeZone,
        lastSentOn: sql`case when ${pushSubscriptions.userId} = excluded.user_id then ${pushSubscriptions.lastSentOn} else null end`,
        updatedAt: new Date(),
      },
    });
}

/** Deletes the device's reminder, only if it is this person's. */
export async function deleteReminder(
  db: Db,
  userId: string,
  endpoint: string,
): Promise<void> {
  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.endpoint, endpoint),
        eq(pushSubscriptions.userId, userId),
      ),
    );
}
