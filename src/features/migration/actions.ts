"use server";

import type { SaveData } from "@/features/home/save-data";
import { importSaveData } from "@/features/cloud/repository";
import {
  fail,
  latest,
  withUser,
  type CloudResult,
} from "@/features/cloud/session";
import { parseImport } from "@/features/cloud/validate";

/**
 * "ifEmpty": move only when the account has no character yet.
 * "replace": the person chose this browser's character over the account's.
 */
export type ImportMode = "ifEmpty" | "replace";

/**
 * Moves this browser's character and entries into the signed-in person's
 * account in one transaction (AC-14). Nothing moves if any part is off.
 */
export async function importCloudData(
  data: SaveData,
  mode: ImportMode,
): Promise<CloudResult> {
  return withUser(async (db, userId) => {
    const parsed = parseImport(data);
    if (parsed === null || (mode !== "ifEmpty" && mode !== "replace")) {
      return fail("invalid");
    }
    return latest(db, userId, await importSaveData(db, userId, parsed, mode));
  });
}
