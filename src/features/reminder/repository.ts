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
  // Bolt-3 ⑥: placeholder until ⑦ fills it in.
  void [db, userId, endpoint];
  throw new Error("not yet");
}

/** Saves the device's reminder for this person (adds it or changes it). */
export async function upsertReminder(
  db: Db,
  userId: string,
  input: ReminderInput,
): Promise<void> {
  // Bolt-3 ⑥: placeholder until ⑦ fills it in.
  void [db, userId, input];
  throw new Error("not yet");
}

/** Deletes the device's reminder, only if it is this person's. */
export async function deleteReminder(
  db: Db,
  userId: string,
  endpoint: string,
): Promise<void> {
  // Bolt-3 ⑥: placeholder until ⑦ fills it in.
  void [db, userId, endpoint];
  throw new Error("not yet");
}
