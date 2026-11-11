import { and, asc, eq, sql } from "drizzle-orm";

import type { Character } from "@/features/character/character";
import type { DiaryEntry } from "@/features/diary/diary";
import type { SaveData } from "@/features/home/save-data";
import { characters, diaryEntries } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";

/*
 * Every read and write of cloud data goes through this file. Each function
 * takes the signed-in person's ID and only touches that person's rows, so
 * one person can never read or change another person's diary (AC-29).
 * The ID must come from the server-side session, never from the browser.
 */

export type WriteResult = "ok" | "notFound" | "exists" | "noCharacter";

type CharacterRow = typeof characters.$inferSelect;
type EntryRow = typeof diaryEntries.$inferSelect;

function toCharacter(row: CharacterRow): Character {
  return {
    name: row.name,
    totalExp: row.totalExp,
    ...(row.startDate !== null ? { startDate: row.startDate } : {}),
  };
}

function toEntry(row: EntryRow): DiaryEntry {
  return {
    date: row.date,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    ...(row.writtenLater ? { writtenLater: true as const } : {}),
    ...(row.bonus !== null && row.bonusDays !== null
      ? { bonus: row.bonus, bonusDays: row.bonusDays }
      : {}),
  };
}

/** The person's data in the same shape as the browser's SaveData. */
export async function getSaveData(db: Db, userId: string): Promise<SaveData> {
  const [character] = await db
    .select()
    .from(characters)
    .where(eq(characters.userId, userId));
  if (character === undefined) {
    return { version: 1, character: null, entries: [] };
  }
  const entries = await db
    .select()
    .from(diaryEntries)
    .where(eq(diaryEntries.userId, userId))
    .orderBy(asc(diaryEntries.date));
  return {
    version: 1,
    character: toCharacter(character),
    entries: entries.map(toEntry),
  };
}

/** Creates the person's only character. Does nothing if one exists. */
export async function createCharacter(
  db: Db,
  userId: string,
  character: Character,
): Promise<WriteResult> {
  const created = await db
    .insert(characters)
    .values({
      userId,
      name: character.name,
      totalExp: character.totalExp,
      startDate: character.startDate ?? null,
    })
    .onConflictDoNothing()
    .returning({ userId: characters.userId });
  return created.length > 0 ? "ok" : "exists";
}

/** Adds one entry and its EXP together. A second entry for a day is refused. */
export async function insertEntry(
  db: Db,
  userId: string,
  entry: DiaryEntry,
  exp: number,
): Promise<WriteResult> {
  return db.transaction(async (tx) => {
    const [owner] = await tx
      .select({ userId: characters.userId })
      .from(characters)
      .where(eq(characters.userId, userId));
    if (owner === undefined) {
      return "noCharacter";
    }
    const inserted = await tx
      .insert(diaryEntries)
      .values({
        userId,
        date: entry.date,
        body: entry.body,
        createdAt: new Date(entry.createdAt),
        writtenLater: entry.writtenLater === true,
        bonus: entry.bonus ?? null,
        bonusDays: entry.bonusDays ?? null,
      })
      .onConflictDoNothing()
      .returning({ date: diaryEntries.date });
    if (inserted.length === 0) {
      return "exists";
    }
    await tx
      .update(characters)
      .set({ totalExp: sql`${characters.totalExp} + ${exp}` })
      .where(eq(characters.userId, userId));
    return "ok";
  });
}

export async function updateEntryBody(
  db: Db,
  userId: string,
  date: string,
  body: string,
): Promise<WriteResult> {
  const updated = await db
    .update(diaryEntries)
    .set({ body })
    .where(and(eq(diaryEntries.userId, userId), eq(diaryEntries.date, date)))
    .returning({ date: diaryEntries.date });
  return updated.length > 0 ? "ok" : "notFound";
}

/** Removes one entry and its EXP together. EXP never goes below 0. */
export async function deleteEntry(
  db: Db,
  userId: string,
  date: string,
  exp: number,
): Promise<WriteResult> {
  return db.transaction(async (tx) => {
    const deleted = await tx
      .delete(diaryEntries)
      .where(and(eq(diaryEntries.userId, userId), eq(diaryEntries.date, date)))
      .returning({ date: diaryEntries.date });
    if (deleted.length === 0) {
      return "notFound";
    }
    await tx
      .update(characters)
      .set({ totalExp: sql`greatest(${characters.totalExp} - ${exp}, 0)` })
      .where(eq(characters.userId, userId));
    return "ok";
  });
}
