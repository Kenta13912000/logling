import { useEffect, useRef, useState } from "react";

import type { SaveData } from "@/features/home/save-data";
import type { SaveDataState } from "@/features/home/useSaveData";
import type { DiaryDataState } from "@/features/cloud/useDiaryData";

import { importCloudData, type ImportMode } from "./actions";
import {
  fitsInOneImport,
  planMigration,
  type MigrationPlan,
} from "./migration";
import type { Side } from "./MigrationChoice";

type Step =
  | { kind: "idle" }
  | { kind: "moving" }
  | { kind: "failed"; data: SaveData; mode: ImportMode }
  | { kind: "tooLarge" }
  | { kind: "moved"; name: string; count: number };

type Diary = {
  state: DiaryDataState;
  browser: SaveDataState;
  clearBrowser: () => boolean;
  adoptCloudData: (data: SaveData) => void;
};

/**
 * Moves this browser's data into the account after signing in (Bolt-5):
 * right away when the account is empty, after a choice when both have a
 * character. The browser's data is deleted only once the account has it.
 */
export function useMigration(diary: Diary) {
  const { state, browser, clearBrowser, adoptCloudData } = diary;
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const started = useRef(false);

  const plan: MigrationPlan =
    state.status === "ok" && state.storage === "cloud"
      ? planMigration(browser, state.data)
      : { kind: "none" };

  async function move(data: SaveData, mode: ImportMode) {
    if (!fitsInOneImport(data)) {
      setStep({ kind: "tooLarge" });
      return;
    }
    setStep({ kind: "moving" });
    const result = await importCloudData(data, mode).catch(() => null);
    if (result?.ok) {
      clearBrowser();
      adoptCloudData(result.data);
      setStep({
        kind: "moved",
        name: data.character?.name ?? "",
        count: data.entries.length,
      });
    } else if (result !== null && "data" in result) {
      // Another device named a character meanwhile: ask which one to keep.
      adoptCloudData(result.data);
      setStep({ kind: "idle" });
    } else {
      setStep({ kind: "failed", data, mode });
    }
  }

  const moveNow = plan.kind === "move" ? plan.browser : null;
  useEffect(() => {
    if (moveNow !== null && !started.current) {
      started.current = true;
      void move(moveNow, "ifEmpty");
    }
    // Run once, when there turns out to be data to move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveNow]);

  function confirm(side: Side) {
    if (plan.kind !== "choose") {
      return;
    }
    if (side === "browser") {
      void move(plan.browser, "replace");
    } else {
      clearBrowser();
    }
  }

  function retry() {
    if (step.kind === "failed") {
      void move(step.data, step.mode);
    }
  }

  /** Hides the "moved" notice. */
  function dismiss() {
    setStep({ kind: "idle" });
  }

  return { plan, step, confirm, retry, dismiss };
}
