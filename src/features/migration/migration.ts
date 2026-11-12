import { getLevelInfo } from "@/features/character/character";
import { getStage } from "@/features/evolution/stages";
import type { SaveData } from "@/features/home/save-data";
import type { SaveDataState } from "@/features/home/useSaveData";

/** What to do with this browser's data after signing in (Bolt-5). */
export type MigrationPlan =
  | { kind: "none" }
  | { kind: "move"; browser: SaveData }
  | { kind: "choose"; browser: SaveData; account: SaveData };

/**
 * Move the browser's character when the account has none (AC-14), let the
 * person choose when both have one (AC-18), otherwise nothing. Broken or
 * unreadable browser data counts as none (AC-21).
 */
export function planMigration(
  browser: SaveDataState,
  account: SaveData,
): MigrationPlan {
  if (browser.status !== "ok" || browser.data.character === null) {
    return { kind: "none" };
  }
  return account.character === null
    ? { kind: "move", browser: browser.data }
    : { kind: "choose", browser: browser.data, account };
}

export type Summary = {
  name: string;
  stageName: string;
  level: number;
  entryCount: number;
};

/** What the choice screen shows for each side (AC-18). */
export function summarize(data: SaveData): Summary {
  const level = getLevelInfo(data.character?.totalExp ?? 0).level;
  return {
    name: data.character?.name ?? "",
    stageName: getStage(level).name,
    level,
    entryCount: data.entries.length,
  };
}

/**
 * Server Actions accept up to 4MB (next.config.ts). Keep some room for how
 * the request encodes the data.
 */
export const MAX_IMPORT_BYTES = 3_800_000;

/** True when the data can be moved in one request (AC-15). */
export function fitsInOneImport(data: SaveData): boolean {
  return (
    new TextEncoder().encode(JSON.stringify(data)).length <= MAX_IMPORT_BYTES
  );
}
