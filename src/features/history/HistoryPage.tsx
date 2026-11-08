"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { ExpGainToast } from "@/features/character/ExpGainToast";
import { LevelUpDialog } from "@/features/character/LevelUpDialog";
import { SaveErrorNotice } from "@/features/home/SaveErrorNotice";
import { useSaveData } from "@/features/home/useSaveData";
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

type Notice = "saveFailed" | "tooOld" | "tooLate" | null;

/** Shown when the day left the editable range while the page was open. */
const OUT_OF_RANGE: Record<"tooOld" | "tooLate", string> = {
  tooOld: "この日記は、もう書き直したり消したりできないよ",
  tooLate: "この日には、もう後から書けないよ",
};

/** Recomputed on save: the page may have stayed open past 4 AM. */
const currentDiaryDate = () => getDiaryDate(new Date());

function Guide({ emoji, message }: { emoji?: string; message: string }) {
  return (
    <section className="flex flex-col items-center gap-4 px-4 py-12 text-center">
      {emoji && (
        <span aria-hidden="true" className="text-5xl">
          {emoji}
        </span>
      )}
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
  const { state, save } = useSaveData();
  const today = useToday();
  const [notice, setNotice] = useState<Notice>(null);
  const [deletingDate, setDeletingDate] = useState<string | null>(null);
  const [gainedExp, setGainedExp] = useState<number | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);

  let content: ReactNode = null;
  let dialog: ReactNode = null;

  if (state.status === "broken") {
    content = <Guide message="データを読み込めなかったみたい…" />;
  } else if (state.status === "ok" && today !== null) {
    const { character, entries } = state.data;

    if (character === null) {
      content = <Guide emoji="🐣" message="ホームで名前を付けてね" />;
    } else if (entries.length === 0) {
      content = (
        <Guide
          emoji="🐣"
          message="まだ日記がないよ。ホームで今日の日記を書いてみよう"
        />
      );
    } else {
      const data = state.data;

      const handleSaveEdit = (date: string, body: string): boolean => {
        const result = editEntry(data, date, body, currentDiaryDate());
        if (!result.ok) {
          // Close the form: the entry has become read-only.
          setNotice("tooOld");
          return true;
        }
        const saved = save(result.data);
        setNotice(saved ? null : "saveFailed");
        return saved;
      };

      const handleSaveLater = (date: string, body: string): boolean => {
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
        const saved = save(result.data);
        setNotice(saved ? null : "saveFailed");
        if (saved) {
          setGainedExp(result.gained);
          if (result.leveledUp) {
            setLevelUp(result.level);
          }
        }
        return saved;
      };

      content = (
        <section className="flex flex-col gap-3 px-4 py-5">
          <h1 className="text-lg font-bold">ふりかえり</h1>
          <p className="text-sm text-ink-muted">
            {`最近 ${RECENT_DAYS} 日の日記は、書き直したり消したりできるよ`}
          </p>
          <HistoryList
            items={buildHistory(entries, today, getStartDate(data))}
            onSaveEdit={handleSaveEdit}
            onSaveLater={handleSaveLater}
            onRequestDelete={setDeletingDate}
          />
        </section>
      );

      const preview =
        deletingDate === null ? null : previewDelete(data, deletingDate);
      if (deletingDate !== null && preview !== null) {
        const handleConfirm = () => {
          setDeletingDate(null);
          const result = deleteEntry(data, deletingDate, currentDiaryDate());
          if (!result.ok) {
            setNotice("tooOld");
            return;
          }
          setNotice(save(result.data) ? null : "saveFailed");
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
        {notice === "saveFailed" && <SaveErrorNotice />}
        {(notice === "tooOld" || notice === "tooLate") && (
          <p role="alert" className="mx-4 mt-4 text-sm text-alert">
            {`⚠ ${OUT_OF_RANGE[notice]}`}
          </p>
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
          level={levelUp}
          onClose={() => setLevelUp(null)}
        />
      )}
    </div>
  );
}
