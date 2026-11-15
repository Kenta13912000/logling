import { and, eq } from "drizzle-orm";

import {
  companionSettings,
  diaryComments,
  diaryEntries,
} from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";

/*
 * Reads and writes of the ai-companion tables. Each function takes the
 * signed-in person's ID from the server-side session and only touches
 * that person's rows (ADR-0009).
 */

/** The longest comment kept (characters). The DB checks it too. */
export const COMMENT_MAX_LENGTH = 200;

/** Whether comments are on, and when they were last turned on. */
export type CompanionSetting = { enabled: boolean; enabledAt: Date | null };

const OFF: CompanionSetting = { enabled: false, enabledAt: null };

/** This person's setting. Someone who never turned it on is off. */
export async function findCompanionSetting(
  db: Db,
  userId: string,
): Promise<CompanionSetting> {
  const [row] = await db
    .select({
      enabled: companionSettings.enabled,
      enabledAt: companionSettings.enabledAt,
    })
    .from(companionSettings)
    .where(eq(companionSettings.userId, userId));
  return row ?? OFF;
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
  const [row] = await db
    .insert(companionSettings)
    .values({ userId, enabled, enabledAt: enabled ? now : null })
    .onConflictDoUpdate({
      target: companionSettings.userId,
      set: enabled ? { enabled, enabledAt: now } : { enabled },
    })
    .returning({
      enabled: companionSettings.enabled,
      enabledAt: companionSettings.enabledAt,
    });
  return row!;
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
  const [entry] = await db
    .select({ date: diaryEntries.date })
    .from(diaryEntries)
    .where(and(eq(diaryEntries.userId, userId), eq(diaryEntries.date, date)));
  if (entry === undefined) {
    return "noEntry";
  }
  // If the entry is deleted in between, the foreign key refuses the row.
  const inserted = await db
    .insert(diaryComments)
    .values({ userId, date, body })
    .onConflictDoNothing()
    .returning({ date: diaryComments.date });
  return inserted.length > 0 ? "ok" : "exists";
}
