"use server";

import { headers } from "next/headers";

import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import type { Db } from "@/lib/db/types";

import { deleteReminder, findReminder, upsertReminder } from "./repository";
import { isPushEndpoint, validateReminder } from "./validate";

/**
 * This device's reminder: `minute` is its time, or null when it is off on
 * this device (AC-6 to AC-8, AC-15).
 */
export type ReminderResult =
  | { ok: true; minute: number | null }
  | { ok: false; reason: "unauthorized" | "invalid" | "failed" };

/**
 * Runs `task` for the signed-in person. The person comes only from the
 * session on the server, never from what the browser sends (AC-8).
 */
async function asSignedIn(
  task: (db: Db, userId: string) => Promise<ReminderResult>,
): Promise<ReminderResult> {
  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return { ok: false, reason: "unauthorized" };
    }
    return await task(getDb(), session.user.id);
  } catch (error) {
    // Never log the error itself: it can carry the device's address.
    console.error("reminder action failed:", (error as Error).name);
    return { ok: false, reason: "failed" };
  }
}

/** Whether this device has reminders on, and at what time. */
export async function getReminder(endpoint: string): Promise<ReminderResult> {
  return asSignedIn(async (db, userId) => {
    if (!isPushEndpoint(endpoint)) {
      return { ok: false, reason: "invalid" };
    }
    const reminder = await findReminder(db, userId, endpoint);
    return { ok: true, minute: reminder?.minute ?? null };
  });
}

/** Turns reminders on for this device, or changes their time. */
export async function saveReminder(input: unknown): Promise<ReminderResult> {
  return asSignedIn(async (db, userId) => {
    const reminder = validateReminder(input);
    if (reminder === null) {
      return { ok: false, reason: "invalid" };
    }
    await upsertReminder(db, userId, reminder);
    return { ok: true, minute: reminder.minute };
  });
}

/** Turns reminders off for this device (also before signing out). */
export async function removeReminder(
  endpoint: string,
): Promise<ReminderResult> {
  return asSignedIn(async (db, userId) => {
    if (!isPushEndpoint(endpoint)) {
      return { ok: false, reason: "invalid" };
    }
    await deleteReminder(db, userId, endpoint);
    return { ok: true, minute: null };
  });
}
