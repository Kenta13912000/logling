"use server";

import type { Character } from "@/features/character/character";
import type { DiaryEntry } from "@/features/diary/diary";

import {
  createCharacter,
  deleteEntry,
  getSaveData,
  insertEntry,
  renameCharacter,
  updateEntryBody,
} from "./repository";
import { fail, latest, withUser, type CloudResult } from "./session";
import {
  isDiaryDate,
  isExp,
  parseBody,
  parseCharacter,
  parseEntry,
  parseName,
} from "./validate";

export type { CloudConflict, CloudFailure, CloudResult } from "./session";

/*
 * Server Actions for the signed-in person's cloud data. None of them takes
 * a person's ID: it always comes from the session on the server (AC-29).
 * Every successful write returns the latest data, so changes made on other
 * devices come along too.
 */

const isOptionalDate = (value: unknown): value is string | undefined =>
  value === undefined || isDiaryDate(value);

export async function loadCloudData(): Promise<CloudResult> {
  return withUser(async (db, userId) => ({
    ok: true,
    data: await getSaveData(db, userId),
  }));
}

export async function createCloudCharacter(
  character: Character,
): Promise<CloudResult> {
  return withUser(async (db, userId) => {
    const parsed = parseCharacter(character);
    if (parsed === null) {
      return fail("invalid");
    }
    return latest(db, userId, await createCharacter(db, userId, parsed));
  });
}

/** Changes only the character's name (settings AC-8, AC-10). */
export async function renameCloudCharacter(name: string): Promise<CloudResult> {
  return withUser(async (db, userId) => {
    const parsed = parseName(name);
    if (parsed === null) {
      return fail("invalid");
    }
    return latest(db, userId, await renameCharacter(db, userId, parsed));
  });
}

export async function addCloudEntry(
  entry: DiaryEntry,
  exp: number,
  startDate?: string,
): Promise<CloudResult> {
  return withUser(async (db, userId) => {
    const parsed = parseEntry(entry);
    if (parsed === null || !isExp(exp) || !isOptionalDate(startDate)) {
      return fail("invalid");
    }
    const result = await insertEntry(db, userId, parsed, exp);
    return latest(db, userId, result, startDate);
  });
}

export async function editCloudEntry(
  date: string,
  body: string,
  startDate?: string,
): Promise<CloudResult> {
  return withUser(async (db, userId) => {
    const parsed = parseBody(body);
    if (!isDiaryDate(date) || parsed === null || !isOptionalDate(startDate)) {
      return fail("invalid");
    }
    const result = await updateEntryBody(db, userId, date, parsed);
    return latest(db, userId, result, startDate);
  });
}

export async function deleteCloudEntry(
  date: string,
  exp: number,
  startDate?: string,
): Promise<CloudResult> {
  return withUser(async (db, userId) => {
    if (!isDiaryDate(date) || !isExp(exp) || !isOptionalDate(startDate)) {
      return fail("invalid");
    }
    const result = await deleteEntry(db, userId, date, exp);
    return latest(db, userId, result, startDate);
  });
}
