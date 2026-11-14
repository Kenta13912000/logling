import { useState, useEffect } from "react";

import type { Character } from "@/features/character/character";
import type { DiaryEntry } from "@/features/diary/diary";
import { getStartDate } from "@/features/history/history";
import type { SaveData } from "@/features/home/save-data";
import { useSaveData } from "@/features/home/useSaveData";
import { authClient } from "@/lib/auth-client";

import {
  addCloudEntry,
  createCloudCharacter,
  deleteCloudEntry,
  editCloudEntry,
  loadCloudData,
  type CloudResult,
} from "./actions";

/** What the person did. The cloud saves this; the browser saves `next`. */
export type Change =
  | { type: "createCharacter"; character: Character }
  | { type: "renameCharacter"; name: string }
  | { type: "addEntry"; entry: DiaryEntry; exp: number }
  | { type: "editEntry"; date: string; body: string }
  | { type: "deleteEntry"; date: string; exp: number };

/**
 * "conflict": another device changed the data first, so the save was
 * refused and the data now shows the latest version (AC-13).
 */
export type SaveOutcome = "saved" | "failed" | "conflict";

export type DiaryDataState =
  | { status: "loading" }
  | { status: "broken"; raw: string }
  | { status: "loadFailed" }
  | { status: "ok"; storage: "local" | "cloud"; data: SaveData };

type CloudState =
  | { status: "loading" }
  | { status: "loadFailed" }
  | { status: "ok"; data: SaveData };

function send(change: Change, next: SaveData): Promise<CloudResult> {
  // Lets the cloud record the start date of a character from diary-exp.
  const startDate = getStartDate(next) ?? undefined;
  switch (change.type) {
    case "createCharacter":
      return createCloudCharacter(change.character);
    case "renameCharacter":
      // settings Bolt-1 ⑥: placeholder until ⑦ fills it in.
      throw new Error("not yet");
    case "addEntry":
      return addCloudEntry(change.entry, change.exp, startDate);
    case "editEntry":
      return editCloudEntry(change.date, change.body, startDate);
    case "deleteEntry":
      return deleteCloudEntry(change.date, change.exp, startDate);
  }
}

/**
 * Where the pages read and save diary data: the browser while signed out
 * (as before, AC-1), the cloud while signed in (AC-8). Signed in, nothing
 * is written to the browser (AC-10).
 */
export function useDiaryData() {
  const { data: session, isPending } = authClient.useSession();
  const local = useSaveData();
  const signedIn = !isPending && session !== null && session !== undefined;
  const [cloud, setCloud] = useState<CloudState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!signedIn) {
      return;
    }
    let current = true;
    loadCloudData().then(
      (result) => {
        if (current) {
          setCloud(
            result.ok
              ? { status: "ok", data: result.data }
              : { status: "loadFailed" },
          );
        }
      },
      () => {
        if (current) {
          setCloud({ status: "loadFailed" });
        }
      },
    );
    return () => {
      current = false;
    };
  }, [signedIn, attempt]);

  let state: DiaryDataState;
  if (isPending) {
    state = { status: "loading" };
  } else if (!signedIn) {
    state =
      local.state.status === "ok"
        ? { status: "ok", storage: "local", data: local.state.data }
        : local.state;
  } else {
    state = cloud.status === "ok" ? { ...cloud, storage: "cloud" } : cloud;
  }

  async function save(change: Change, next: SaveData): Promise<SaveOutcome> {
    if (!signedIn) {
      return local.save(next) ? "saved" : "failed";
    }
    try {
      const result = await send(change, next);
      if (result.ok) {
        setCloud({ status: "ok", data: result.data });
        return "saved";
      }
      if ("data" in result) {
        setCloud({ status: "ok", data: result.data });
        return "conflict";
      }
      return "failed";
    } catch {
      return "failed";
    }
  }

  function reload() {
    setCloud({ status: "loading" });
    setAttempt((count) => count + 1);
  }

  return {
    state,
    save,
    reset: local.reset,
    reload,
    /** This browser's data, kept as is while signed in (Bolt-5). */
    browser: local.state,
    clearBrowser: local.clear,
    /** Shows data the server returned, e.g. after moving browser data. */
    adoptCloudData: (data: SaveData) => setCloud({ status: "ok", data }),
  };
}
