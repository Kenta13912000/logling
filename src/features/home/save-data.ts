import type { Character } from "@/features/character/character";
import type { DiaryEntry } from "@/features/diary/diary";
import { readItem, removeItem, writeItem } from "@/lib/storage";

export const STORAGE_KEY = "logling:v1";

export type SaveData = {
  version: 1;
  character: Character | null;
  /** Oldest first. */
  entries: DiaryEntry[];
};

export const EMPTY_SAVE_DATA: SaveData = {
  version: 1,
  character: null,
  entries: [],
};

export type LoadResult =
  { status: "ok"; data: SaveData } | { status: "broken"; raw: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDiaryDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isCharacter(value: unknown): value is Character {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    Number.isInteger(value.totalExp) &&
    (value.totalExp as number) >= 0 &&
    // Characters named in diary-exp have no start date.
    (value.startDate === undefined || isDiaryDate(value.startDate))
  );
}

function isDiaryEntry(value: unknown): value is DiaryEntry {
  return (
    isRecord(value) &&
    isDiaryDate(value.date) &&
    typeof value.body === "string" &&
    typeof value.createdAt === "string" &&
    // Entries from diary-exp have no flag; they were written on the day.
    (value.writtenLater === undefined || value.writtenLater === true)
  );
}

function isSaveData(value: unknown): value is SaveData {
  return (
    isRecord(value) &&
    value.version === 1 &&
    (value.character === null || isCharacter(value.character)) &&
    Array.isArray(value.entries) &&
    value.entries.every(isDiaryEntry)
  );
}

export function parseSaveData(raw: string | null): LoadResult {
  if (raw === null) {
    return { status: "ok", data: EMPTY_SAVE_DATA };
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (isSaveData(value)) {
      return { status: "ok", data: value };
    }
  } catch {
    // Fall through: unreadable JSON is treated as broken data.
  }
  return { status: "broken", raw };
}

/** Unreadable storage behaves like a first visit; saving will then fail. */
export function loadSaveData(storage: Storage): LoadResult {
  const result = readItem(storage, STORAGE_KEY);
  return result.ok
    ? parseSaveData(result.value)
    : { status: "ok", data: EMPTY_SAVE_DATA };
}

export function writeSaveData(storage: Storage, data: SaveData): boolean {
  return writeItem(storage, STORAGE_KEY, JSON.stringify(data));
}

/** Moves the current data to a backup key, then starts over. */
export function resetBrokenData(storage: Storage, now: Date): boolean {
  const current = readItem(storage, STORAGE_KEY);
  if (!current.ok) {
    return false;
  }
  if (current.value !== null) {
    const backupKey = `${STORAGE_KEY}:broken:${now.toISOString()}`;
    if (!writeItem(storage, backupKey, current.value)) {
      return false;
    }
  }
  return removeItem(storage, STORAGE_KEY);
}
