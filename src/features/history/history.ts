import {
  EXP_PER_ENTRY,
  EXP_PER_LATE_ENTRY,
  gainExp,
  getLevelInfo,
  loseExp,
} from "@/features/character/character";
import type { DiaryEntry } from "@/features/diary/diary";
import type { SaveData } from "@/features/home/save-data";
import { RECENT_DAYS, addDays, isRecentDiaryDate } from "@/lib/diary-date";

export type HistoryItem =
  | { kind: "entry"; entry: DiaryEntry; editable: boolean }
  | { kind: "missing"; date: string };

type Failed = { ok: false };
const FAILED: Failed = { ok: false };

/** Newest first: the recent days (entries or missed days), then older entries. */
export function buildHistory(
  entries: DiaryEntry[],
  today: string,
): HistoryItem[] {
  const byDate = new Map(entries.map((entry) => [entry.date, entry]));
  const items: HistoryItem[] = [];

  for (let offset = 0; offset < RECENT_DAYS; offset++) {
    const date = addDays(today, -offset);
    const entry = byDate.get(date);
    if (entry) {
      items.push({ kind: "entry", entry, editable: true });
    } else if (date !== today) {
      // Today's entry is written from the home page.
      items.push({ kind: "missing", date });
    }
  }

  const older = entries
    .filter((entry) => !isRecentDiaryDate(entry.date, today))
    .sort((a, b) => b.date.localeCompare(a.date));
  for (const entry of older) {
    items.push({ kind: "entry", entry, editable: false });
  }
  return items;
}

export function expForEntry(entry: DiaryEntry): number {
  return entry.writtenLater ? EXP_PER_LATE_ENTRY : EXP_PER_ENTRY;
}

function findEntry(data: SaveData, date: string): DiaryEntry | undefined {
  return data.entries.find((entry) => entry.date === date);
}

/** What deleting would cost, for the confirmation. Saves nothing. */
export function previewDelete(
  data: SaveData,
  date: string,
): { lost: number; levelBefore: number; levelAfter: number } | null {
  const entry = findEntry(data, date);
  if (!data.character || !entry) {
    return null;
  }
  const lost = expForEntry(entry);
  const result = loseExp(data.character, lost);
  return {
    lost,
    levelBefore: getLevelInfo(data.character.totalExp).level,
    levelAfter: result.level,
  };
}

export function editEntry(
  data: SaveData,
  date: string,
  body: string,
  today: string,
): { ok: true; data: SaveData } | Failed {
  if (!isRecentDiaryDate(date, today) || !findEntry(data, date)) {
    return FAILED;
  }
  const entries = data.entries.map((entry) =>
    entry.date === date ? { ...entry, body } : entry,
  );
  return { ok: true, data: { ...data, entries } };
}

export function deleteEntry(
  data: SaveData,
  date: string,
  today: string,
):
  | {
      ok: true;
      data: SaveData;
      lost: number;
      leveledDown: boolean;
      level: number;
    }
  | Failed {
  const entry = findEntry(data, date);
  if (!data.character || !entry || !isRecentDiaryDate(date, today)) {
    return FAILED;
  }
  const lost = expForEntry(entry);
  const result = loseExp(data.character, lost);
  return {
    ok: true,
    data: {
      ...data,
      character: result.character,
      entries: data.entries.filter((e) => e.date !== date),
    },
    lost,
    leveledDown: result.leveledDown,
    level: result.level,
  };
}

export function writeLaterEntry(
  data: SaveData,
  date: string,
  body: string,
  today: string,
  now: Date,
):
  | {
      ok: true;
      data: SaveData;
      gained: number;
      leveledUp: boolean;
      level: number;
    }
  | Failed {
  if (
    !data.character ||
    date === today ||
    !isRecentDiaryDate(date, today) ||
    findEntry(data, date)
  ) {
    return FAILED;
  }
  const entry: DiaryEntry = {
    date,
    body,
    createdAt: now.toISOString(),
    writtenLater: true,
  };
  // Keep entries oldest first.
  const entries = [...data.entries, entry].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const result = gainExp(data.character, EXP_PER_LATE_ENTRY);
  return {
    ok: true,
    data: { ...data, character: result.character, entries },
    gained: EXP_PER_LATE_ENTRY,
    leveledUp: result.leveledUp,
    level: result.level,
  };
}
