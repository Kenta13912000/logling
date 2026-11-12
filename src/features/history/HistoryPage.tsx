"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { getLevelInfo } from "@/features/character/character";
import { ExpGainToast } from "@/features/character/ExpGainToast";
import { LevelUpDialog } from "@/features/character/LevelUpDialog";
import { CharacterArt } from "@/features/evolution/CharacterArt";
import {
  STAGES,
  getStage,
  levelUpOf,
  type LevelUp,
  type Stage,
} from "@/features/evolution/stages";
import { UnsavedText } from "@/features/cloud/UnsavedText";
import { useDiaryData, type SaveOutcome } from "@/features/cloud/useDiaryData";
import {
  LoadErrorNotice,
  LoadingNotice,
} from "@/features/home/LoadErrorNotice";
import { SaveErrorNotice } from "@/features/home/SaveErrorNotice";
import { useToday } from "@/features/home/useToday";
import { RECENT_DAYS, getDiaryDate } from "@/lib/diary-date";

import { DeleteDialog } from "./DeleteDialog";
import {
  buildHistory,
  deleteEntry,
  editEntry,
  getStartDate,
  previewDelete,
  writeLaterEntry,
} from "./history";
import { HistoryList } from "./HistoryList";

type Notice = "saveFailed" | "tooOld" | "tooLate" | "conflict" | null;

/** Shown when the day left the editable range while the page was open. */
const OUT_OF_RANGE: Record<"tooOld" | "tooLate", string> = {
  tooOld: "この日記は、もう書き直したり消したりできないよ",
  tooLate: "この日には、もう後から書けないよ",
};

/** Recomputed on save: the page may have stayed open past 4 AM. */
const currentDiaryDate = () => getDiaryDate(new Date());

const stageOf = (totalExp: number) => getStage(getLevelInfo(totalExp).level);

function Guide({ stage, message }: { stage?: Stage; message: string }) {
  return (
    <section className="flex flex-col items-center gap-4 px-4 py-12 text-center">
      {stage && <CharacterArt stage={stage} size={160} />}
      <p>{message}</p>
      <Link
        href="/"
        className="flex min-h-12 items-center rounded-xl bg-ember px-8 font-bold text-white"
      >
        ホームへ
      </Link>
    </section>
  );
}

export function HistoryPage() {
  const { state, save, reload } = useDiaryData();
  const today = useToday();
  const [notice, setNotice] = useState<Notice>(null);
  // Text that another device's change kept from being saved (AC-13).
  const [unsaved, setUnsaved] = useState<string | null>(null);

  /**
   * Shows the result of saving a body. Returns true when the form should
   * close: saved, or refused because another device changed the data (the
   * text then moves to the unsaved box). On failure the form stays open.
   */
  function afterSave(outcome: SaveOutcome, body: string): boolean {
    if (outcome === "conflict") {
      setNotice("conflict");
      setUnsaved(body);
      return true;
    }
    setNotice(outcome === "saved" ? null : "saveFailed");
    return outcome === "saved";
  }
  const [deletingDate, setDeletingDate] = useState<string | null>(null);
  const [gainedExp, setGainedExp] = useState<number | null>(null);
  const [levelUp, setLevelUp] = useState<LevelUp | null>(null);

  let content: ReactNode = null;
  let dialog: ReactNode = null;

  if (state.status === "loading") {
    content = <LoadingNotice />;
  } else if (state.status === "loadFailed") {
    content = <LoadErrorNotice onRetry={reload} />;
  } else if (state.status === "broken") {
    content = <Guide message="データを読み込めなかったみたい…" />;
  } else if (today !== null) {
    const { character, entries } = state.data;

    if (character === null) {
      // No character yet, so show the first stage.
      content = <Guide stage={STAGES[0]} message="ホームで名前を付けてね" />;
    } else if (entries.length === 0) {
      content = (
        <Guide
          stage={stageOf(character.totalExp)}
          message="まだ日記がないよ。ホームで今日の日記を書いてみよう"
        />
      );
    } else {
      const data = state.data;
      const stage = stageOf(character.totalExp);

      const handleSaveEdit = async (
        date: string,
        body: string,
      ): Promise<boolean> => {
        const result = editEntry(data, date, body, currentDiaryDate());
        if (!result.ok) {
          // Close the form: the entry has become read-only.
          setNotice("tooOld");
          return true;
        }
        const outcome = await save(
          { type: "editEntry", date, body },
          result.data,
        );
        return afterSave(outcome, body);
      };

      const handleSaveLater = async (
        date: string,
        body: string,
      ): Promise<boolean> => {
        const now = new Date();
        const result = writeLaterEntry(
          data,
          date,
          body,
          getDiaryDate(now),
          now,
        );
        if (!result.ok) {
          // Close the form: the day can no longer be filled in.
          setNotice("tooLate");
          return true;
        }
        const entry = result.data.entries.find((e) => e.date === date);
        if (entry === undefined) {
          return false;
        }
        const outcome = await save(
          { type: "addEntry", entry, exp: result.gained },
          result.data,
        );
        const close = afterSave(outcome, body);
        if (outcome === "saved") {
          setGainedExp(result.gained);
          if (result.leveledUp) {
            setLevelUp(
              levelUpOf(getLevelInfo(character.totalExp).level, result.level),
            );
          }
        }
        return close;
      };

      content = (
        <section className="flex flex-col gap-3 px-4 py-5">
          <h1 className="text-lg font-bold">ふりかえり</h1>
          <p className="text-sm text-ink-muted">
            {`最近 ${RECENT_DAYS} 日の日記は、書き直したり消したりできるよ`}
          </p>
          <HistoryList
            items={buildHistory(entries, today, getStartDate(data))}
            stage={stage}
            onSaveEdit={handleSaveEdit}
            onSaveLater={handleSaveLater}
            onRequestDelete={setDeletingDate}
          />
        </section>
      );

      const preview =
        deletingDate === null ? null : previewDelete(data, deletingDate);
      if (deletingDate !== null && preview !== null) {
        const handleConfirm = async () => {
          setDeletingDate(null);
          const result = deleteEntry(data, deletingDate, currentDiaryDate());
          if (!result.ok) {
            setNotice("tooOld");
            return;
          }
          const outcome = await save(
            { type: "deleteEntry", date: deletingDate, exp: result.lost },
            result.data,
          );
          setNotice(
            outcome === "conflict"
              ? "conflict"
              : outcome === "saved"
                ? null
                : "saveFailed",
          );
        };

        dialog = (
          <DeleteDialog
            date={deletingDate}
            name={character.name}
            lost={preview.lost}
            bonus={preview.bonus}
            levelBefore={preview.levelBefore}
            levelAfter={preview.levelAfter}
            onConfirm={handleConfirm}
            onCancel={() => setDeletingDate(null)}
          />
        );
      }
    }
  }

  return (
    <div className="mx-auto min-h-full w-full max-w-[480px] bg-cream text-ink">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-line px-4 py-3">
        <Link
          href="/"
          className="flex min-h-11 items-center justify-self-start text-sm font-bold text-ember underline"
        >
          <span aria-hidden="true">‹&nbsp;</span>ホーム
        </Link>
        <span className="font-bold tracking-wide">logling</span>
      </header>
      <main>
        {notice === "saveFailed" && (
          <SaveErrorNotice
            cloudHint={
              state.status === "ok" && state.storage === "cloud"
                ? "もう一度ためしてね"
                : undefined
            }
          />
        )}
        {(notice === "tooOld" || notice === "tooLate") && (
          <p role="alert" className="mx-4 mt-4 text-sm text-alert">
            {`⚠ ${OUT_OF_RANGE[notice]}`}
          </p>
        )}
        {notice === "conflict" && (
          <p role="alert" className="mx-4 mt-4 text-sm text-alert">
            ⚠ ほかの端末で変わっていたよ。最新の内容を表示したよ
          </p>
        )}
        {unsaved !== null && (
          <UnsavedText
            body={unsaved}
            hint="必要なら、コピーしてもう一度書いてね"
          />
        )}
        {content}
      </main>
      {dialog}
      {gainedExp !== null && (
        <ExpGainToast amount={gainedExp} onDone={() => setGainedExp(null)} />
      )}
      {levelUp !== null && state.status === "ok" && state.data.character && (
        <LevelUpDialog
          name={state.data.character.name}
          level={levelUp.level}
          evolvedTo={levelUp.evolvedTo}
          onClose={() => setLevelUp(null)}
        />
      )}
    </div>
  );
}
