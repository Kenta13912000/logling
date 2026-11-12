import { useSyncExternalStore } from "react";

import { browserStorage, readItem, removeItem } from "@/lib/storage";

import {
  EMPTY_SAVE_DATA,
  STORAGE_KEY,
  parseSaveData,
  resetBrokenData,
  writeSaveData,
  type LoadResult,
  type SaveData,
} from "./save-data";

export type SaveDataState = { status: "loading" } | LoadResult;

const LOADING: SaveDataState = { status: "loading" };
// Unreadable storage behaves like a first visit; saving will then fail.
const UNAVAILABLE: LoadResult = { status: "ok", data: EMPTY_SAVE_DATA };

const listeners = new Set<() => void>();

// useSyncExternalStore needs a stable snapshot, so re-parse only when the
// stored text changes.
let cachedRaw: string | null = null;
let cachedState: LoadResult | undefined;

function getSnapshot(): SaveDataState {
  const storage = browserStorage();
  const read = storage
    ? readItem(storage, STORAGE_KEY)
    : { ok: false as const };
  if (!read.ok) {
    return UNAVAILABLE;
  }
  if (cachedState === undefined || read.value !== cachedRaw) {
    cachedRaw = read.value;
    cachedState = parseSaveData(read.value);
  }
  return cachedState;
}

function getServerSnapshot(): SaveDataState {
  return LOADING;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Keep other tabs in sync.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function update(write: (storage: Storage) => boolean): boolean {
  const storage = browserStorage();
  const ok = storage !== null && write(storage);
  if (ok) {
    notify();
  }
  return ok;
}

export function useSaveData() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    state,
    save: (data: SaveData) => update((storage) => writeSaveData(storage, data)),
    reset: () => update((storage) => resetBrokenData(storage, new Date())),
    /** Removes this browser's data, after moving it to the account. */
    clear: () => update((storage) => removeItem(storage, STORAGE_KEY)),
  };
}
