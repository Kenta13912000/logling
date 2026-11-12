import { headers } from "next/headers";

import type { SaveData } from "@/features/home/save-data";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import type { Db } from "@/lib/db/types";

import { getSaveData, pinStartDate, type WriteResult } from "./repository";

/*
 * Shared by the Server Actions: who is signed in, and the shape of results.
 * Not a "use server" file, so these helpers are never callable from the
 * browser on their own.
 */

/** Refused because another device changed the data first (AC-13). */
export type CloudConflict = "exists" | "notFound" | "noCharacter";

export type CloudFailure = "unauthorized" | "invalid" | "failed";

export type CloudResult =
  | { ok: true; data: SaveData }
  // Comes with the latest data, so the page can switch to it right away.
  | { ok: false; reason: CloudConflict; data: SaveData }
  | { ok: false; reason: CloudFailure };

export const fail = (reason: CloudFailure): CloudResult => ({
  ok: false,
  reason,
});

/**
 * Runs `task` for the signed-in person. The person's ID comes only from
 * the session on the server, never from the browser (AC-29).
 */
export async function withUser(
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

/** The latest data after a write, also when the write was refused. */
export async function latest(
  db: Db,
  userId: string,
  result: WriteResult,
  startDate?: string,
): Promise<CloudResult> {
  if (result !== "ok") {
    return { ok: false, reason: result, data: await getSaveData(db, userId) };
  }
  if (startDate !== undefined) {
    await pinStartDate(db, userId, startDate);
  }
  return { ok: true, data: await getSaveData(db, userId) };
}
