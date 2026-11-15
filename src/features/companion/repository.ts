import { and, eq, sql } from "drizzle-orm";

import {
  characters,
  companionDailyUsage,
  companionMonthlyCost,
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

/** What requestComment needs about one entry, or null when there is none. */
export type EntryForComment = {
  name: string;
  body: string;
  createdAt: Date;
  comment: string | null;
};

export async function findEntryForComment(
  db: Db,
  userId: string,
  date: string,
): Promise<EntryForComment | null> {
  const [row] = await db
    .select({
      name: characters.name,
      body: diaryEntries.body,
      createdAt: diaryEntries.createdAt,
      comment: diaryComments.body,
    })
    .from(diaryEntries)
    .innerJoin(characters, eq(characters.userId, diaryEntries.userId))
    .leftJoin(
      diaryComments,
      and(
        eq(diaryComments.userId, diaryEntries.userId),
        eq(diaryComments.date, diaryEntries.date),
      ),
    )
    .where(and(eq(diaryEntries.userId, userId), eq(diaryEntries.date, date)));
  return row ?? null;
}

/**
 * Counts one request for `day`, unless the person already made
 * `limit` today. One statement, so parallel requests cannot pass the limit.
 */
export async function claimDailyUse(
  db: Db,
  userId: string,
  day: string,
  limit: number,
): Promise<boolean> {
  const counted = await db
    .insert(companionDailyUsage)
    .values({ userId, day, count: 1 })
    .onConflictDoUpdate({
      target: [companionDailyUsage.userId, companionDailyUsage.day],
      set: { count: sql`${companionDailyUsage.count} + 1` },
      setWhere: sql`${companionDailyUsage.count} < ${limit}`,
    })
    .returning({ count: companionDailyUsage.count });
  return counted.length > 0;
}

/** Gives back one counted request (when the monthly budget stops it). */
export async function releaseDailyUse(
  db: Db,
  userId: string,
  day: string,
): Promise<void> {
  await db
    .update(companionDailyUsage)
    .set({ count: sql`greatest(${companionDailyUsage.count} - 1, 0)` })
    .where(
      and(
        eq(companionDailyUsage.userId, userId),
        eq(companionDailyUsage.day, day),
      ),
    );
}

/** How many requests the person made on `day`. */
export async function findDailyUse(
  db: Db,
  userId: string,
  day: string,
): Promise<number> {
  const [row] = await db
    .select({ count: companionDailyUsage.count })
    .from(companionDailyUsage)
    .where(
      and(
        eq(companionDailyUsage.userId, userId),
        eq(companionDailyUsage.day, day),
      ),
    );
  return row?.count ?? 0;
}

/** Adds to the whole app's spending for `month` (millionths of a dollar). */
export async function addMonthlyCost(
  db: Db,
  month: string,
  microUsd: number,
): Promise<void> {
  await db
    .insert(companionMonthlyCost)
    .values({ month, microUsd })
    .onConflictDoUpdate({
      target: companionMonthlyCost.month,
      set: {
        microUsd: sql`${companionMonthlyCost.microUsd} + excluded.micro_usd`,
      },
    });
}

/** The whole app's spending so far in `month`. */
export async function findMonthlyCost(db: Db, month: string): Promise<number> {
  const [row] = await db
    .select({ microUsd: companionMonthlyCost.microUsd })
    .from(companionMonthlyCost)
    .where(eq(companionMonthlyCost.month, month));
  return row?.microUsd ?? 0;
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
