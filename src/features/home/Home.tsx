"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import {
  EXP_PER_ENTRY,
  createCharacter,
  gainExp,
  getLevelInfo,
} from "@/features/character/character";
import { CharacterStatus } from "@/features/character/CharacterStatus";
import { ExpGainToast } from "@/features/character/ExpGainToast";
import { LevelUpDialog } from "@/features/character/LevelUpDialog";
import { NameForm } from "@/features/character/NameForm";
import { UnsavedText } from "@/features/cloud/UnsavedText";
import { useDiaryData } from "@/features/cloud/useDiaryData";
import { DiaryEditor } from "@/features/diary/DiaryEditor";
import { TodayEntry } from "@/features/diary/TodayEntry";
import { getStage, levelUpOf, type LevelUp } from "@/features/evolution/stages";
import { MigrationChoice } from "@/features/migration/MigrationChoice";
import { MovedToast } from "@/features/migration/MovedToast";
import { useMigration } from "@/features/migration/useMigration";
import { bonusForTodayEntry, getStreakStatus } from "@/features/streak/streak";
import { StreakBand } from "@/features/streak/StreakBand";
import { getDiaryDate } from "@/lib/diary-date";

import { BrokenDataNotice } from "./BrokenDataNotice";
import { SaveErrorNotice } from "./SaveErrorNotice";
import { LoadErrorNotice, LoadingNotice } from "./LoadErrorNotice";
import { useToday } from "./useToday";

/** What the EXP notice shows after saving today's entry. */
type Gained = { amount: number; bonus?: { days: number; amount: number } };

/** Shown at the top of the page after a save that did not go through. */
type Notice = "saveFailed" | "entryConflict" | "characterConflict" | null;

/** AC-13: another device changed the data first. */
const CONFLICT_MESSAGES: Record<"entryConflict" | "characterConflict", string> =
  {
    entryConflict:
      "⚠ ほかの端末で、今日の日記がもう書かれていたよ。最新の内容を表示したよ",
    characterConflict:
      "⚠ ほかの端末で、もうキャラクターが作られていたよ。そのキャラクターを表示したよ",
  };

export function Home() {
  const diary = useDiaryData();
  const { state, save, reset, reload } = diary;
  // Bolt-5: move this browser's data into the account after signing in.
  const migration = useMigration(diary);
  const { plan, step } = migration;
  const today = useToday();
  const [notice, setNotice] = useState<Notice>(null);
  // Today's text that another device's entry kept from being saved.
  const [unsaved, setUnsaved] = useState<string | null>(null);
  const [gained, setGained] = useState<Gained | null>(null);
  const [levelUp, setLevelUp] = useState<LevelUp | null>(null);

  const setSaveError = (failed: boolean) =>
    setNotice(failed ? "saveFailed" : null);

  let content: ReactNode = null;

  if (state.status === "loading") {
    content = <LoadingNotice />;
  } else if (
    step.kind === "moving" ||
    (step.kind === "idle" && plan.kind === "move")
  ) {
    content = <LoadingNotice message="アカウントに移しているよ…" />;
  } else if (step.kind === "failed") {
    content = (
      <section aria-label="引き継ぎのお知らせ" className="flex flex-col p-4">
        <p role="alert" className="mt-6 text-center text-sm text-alert">
          ⚠ 移せなかった…通信できるところで、もう一度ためしてね
        </p>
        <p className="mt-2 text-center text-sm text-ink-muted">
          このブラウザの日記は、そのまま残っているよ
        </p>
        <button
          type="button"
          onClick={migration.retry}
          className="mt-6 min-h-12 rounded-xl bg-ember font-bold text-white"
        >
          もう一度移す
        </button>
      </section>
    );
  } else if (plan.kind === "choose" && step.kind !== "tooLarge") {
    content = (
      <MigrationChoice
        browser={plan.browser}
        account={plan.account}
        busy={false}
        onConfirm={migration.confirm}
      />
    );
  } else if (state.status === "loadFailed") {
    content = <LoadErrorNotice onRetry={reload} />;
  } else if (state.status === "broken") {
    content = (
      <BrokenDataNotice
        onReset={() => {
          setSaveError(!reset());
        }}
      />
    );
  } else if (today !== null) {
    const data = state.data;
    const character = data.character;

    if (character === null) {
      content = (
        <NameForm
          onSubmit={async (name) => {
            // The naming day is the start date, even without an entry.
            const character = createCharacter(name, getDiaryDate(new Date()));
            const outcome = await save(
              { type: "createCharacter", character },
              { ...data, character },
            );
            setNotice(
              outcome === "conflict"
                ? "characterConflict"
                : outcome === "saved"
                  ? null
                  : "saveFailed",
            );
          }}
        />
      );
    } else {
      const todayEntry = data.entries.find((entry) => entry.date === today);
      const level = getLevelInfo(character.totalExp).level;
      const stage = getStage(level);

      const handleSave = async (body: string) => {
        // Recompute: the page may have stayed open past 4 AM.
        const now = new Date();
        const date = getDiaryDate(now);
        if (data.entries.some((entry) => entry.date === date)) {
          return;
        }
        // Writing today extends the streak through yesterday by one day.
        const bonus = bonusForTodayEntry(data.entries, date);
        const bonusDays = getStreakStatus(data.entries, date).days + 1;
        const earned = bonus > 0 ? { bonus, bonusDays } : {};
        const entry = { date, body, createdAt: now.toISOString(), ...earned };
        const result = gainExp(character, EXP_PER_ENTRY + bonus);
        const outcome = await save(
          { type: "addEntry", entry, exp: EXP_PER_ENTRY + bonus },
          {
            ...data,
            character: result.character,
            entries: [...data.entries, entry],
          },
        );
        if (outcome === "conflict") {
          setNotice("entryConflict");
          setUnsaved(body);
          return;
        }
        const saved = outcome === "saved";
        setSaveError(!saved);
        if (!saved) {
          return;
        }
        setGained({
          amount: EXP_PER_ENTRY,
          ...(bonus > 0 ? { bonus: { days: bonusDays, amount: bonus } } : {}),
        });
        if (result.leveledUp) {
          setLevelUp(levelUpOf(level, result.level));
        }
      };

      content = (
        <>
          <CharacterStatus character={character}>
            <StreakBand status={getStreakStatus(data.entries, today)} />
          </CharacterStatus>
          {todayEntry ? (
            <TodayEntry entry={todayEntry} stage={stage} />
          ) : (
            <DiaryEditor date={today} stage={stage} onSave={handleSave} />
          )}
          {todayEntry && unsaved !== null && <UnsavedText body={unsaved} />}
        </>
      );
    }
  }

  const characterName =
    state.status === "ok" ? (state.data.character?.name ?? "") : "";

  // The top bar and the tabs come from the common layout (tab-navigation).
  return (
    <>
      <main>
        {/* The top bar's name is not a heading, so the page has its own. */}
        <h1 className="sr-only">ホーム</h1>
        {notice === "saveFailed" && (
          <SaveErrorNotice
            cloudHint={
              state.status === "ok" && state.storage === "cloud"
                ? "もう一度「日記をのこす」を押してね"
                : undefined
            }
          />
        )}
        {step.kind === "tooLarge" && (
          <p role="alert" className="mx-4 mt-4 text-sm text-alert">
            ⚠
            日記が多すぎて、まとめて移せなかった…このブラウザの日記は、そのまま残っているよ
          </p>
        )}
        {(notice === "entryConflict" || notice === "characterConflict") && (
          <p role="alert" className="mx-4 mt-4 text-sm text-alert">
            {CONFLICT_MESSAGES[notice]}
          </p>
        )}
        {content}
      </main>
      {/* AC-31: what the app is, and how it keeps diaries. */}
      <footer className="mt-10 border-t border-line px-4 py-6 text-center text-xs text-ink-muted">
        <p>logling：日記を書くとキャラクターが育つ、続けたくなる日記アプリ</p>
        <Link
          href="/privacy"
          className="mt-1 inline-flex min-h-11 items-center font-bold text-ember underline"
        >
          日記の保存のしかた
        </Link>
      </footer>
      {step.kind === "moved" && (
        <MovedToast
          name={step.name}
          count={step.count}
          onDone={migration.dismiss}
        />
      )}
      {gained !== null && (
        <ExpGainToast
          amount={gained.amount}
          bonus={gained.bonus}
          onDone={() => setGained(null)}
        />
      )}
      {levelUp !== null && (
        <LevelUpDialog
          name={characterName}
          level={levelUp.level}
          evolvedTo={levelUp.evolvedTo}
          onClose={() => setLevelUp(null)}
        />
      )}
    </>
  );
}
