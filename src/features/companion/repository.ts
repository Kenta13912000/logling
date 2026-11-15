import type { Db } from "@/lib/db/types";

/** The longest comment kept (characters). The DB checks it too. */
export const COMMENT_MAX_LENGTH = 200;

/** Whether comments are on, and when they were last turned on. */
export type CompanionSetting = { enabled: boolean; enabledAt: Date | null };

/** This person's setting. Someone who never turned it on is off. */
export async function findCompanionSetting(
  db: Db,
  userId: string,
): Promise<CompanionSetting> {
  // Bolt-1 ⑥: placeholder until ⑦ fills it in.
  void [db, userId];
  throw new Error("not yet");
}

/**
 * Turns comments on or off. Turning on records `now` as enabledAt; turning
 * off keeps the row and its comments (AC-3).
 */
export async function saveCompanionSetting(
  db: Db,
  userId: string,
  enabled: boolean,
  now: Date,
): Promise<CompanionSetting> {
  // Bolt-1 ⑥: placeholder until ⑦ fills it in.
  void [db, userId, enabled, now];
  throw new Error("not yet");
}

/**
 * Keeps the comment for one entry. "exists" when the entry already has one
 * (one per entry, AC-4/AC-11); "noEntry" when there is no such entry.
 */
export async function addComment(
  db: Db,
  userId: string,
  date: string,
  body: string,
): Promise<"ok" | "exists" | "noEntry"> {
  // Bolt-1 ⑥: placeholder until ⑦ fills it in.
  void [db, userId, date, body];
  throw new Error("not yet");
}
