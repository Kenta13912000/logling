"use server";

import { headers } from "next/headers";

import type { Character } from "@/features/character/character";
import type { DiaryEntry } from "@/features/diary/diary";
import type { SaveData } from "@/features/home/save-data";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import type { Db } from "@/lib/db/types";

import {
  createCharacter,
  deleteEntry,
  getSaveData,
  insertEntry,
  pinStartDate,
  updateEntryBody,
  type WriteResult,
} from "./repository";
import {
  isDiaryDate,
  isExp,
  parseBody,
  parseCharacter,
  parseEntry,
} from "./validate";

/*
 * Server Actions for the signed-in person's cloud data. None of them takes
 * a person's ID: it always comes from the session on the server (AC-29).
 * Every successful write returns the latest data, so changes made on other
 * devices come along too.
 */

export type CloudFailure =
  "unauthorized" | "invalid" | "exists" | "notFound" | "noCharacter" | "failed";

export type CloudResult =
  { ok: true; data: SaveData } | { ok: false; reason: CloudFailure };

const fail = (reason: CloudFailure): CloudResult => ({ ok: false, reason });

async function withUser(
  task: (db: Db, userId: string) => Promise<CloudResult>,
): Promise<CloudResult> {
  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return fail("unauthorized");
    }
    return await task(getDb(), session.user.id);
  } catch (error) {
    // Never log the error itself: a failed query can carry the diary text.
    console.error("cloud action failed:", (error as Error).name);
    return fail("failed");
  }
}

async function latest(
  db: Db,
  userId: string,
  result: WriteResult,
  startDate?: string,
): Promise<CloudResult> {
  if (result !== "ok") {
    return fail(result);
  }
  if (startDate !== undefined) {
    await pinStartDate(db, userId, startDate);
  }
  return { ok: true, data: await getSaveData(db, userId) };
}

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
