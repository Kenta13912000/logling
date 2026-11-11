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
import { DiaryEditor } from "@/features/diary/DiaryEditor";
import { TodayEntry } from "@/features/diary/TodayEntry";
import { getStage, levelUpOf, type LevelUp } from "@/features/evolution/stages";
import { bonusForTodayEntry, getStreakStatus } from "@/features/streak/streak";
import { StreakBand } from "@/features/streak/StreakBand";
import { getDiaryDate } from "@/lib/diary-date";

import { BrokenDataNotice } from "./BrokenDataNotice";
import { SaveErrorNotice } from "./SaveErrorNotice";
import { useSaveData } from "./useSaveData";
import { useToday } from "./useToday";

/** What the EXP notice shows after saving today's entry. */
type Gained = { amount: number; bonus?: { days: number; amount: number } };

export function Home() {
  const { state, save, reset } = useSaveData();
  const today = useToday();
  const [saveError, setSaveError] = useState(false);
  const [gained, setGained] = useState<Gained | null>(null);
  const [levelUp, setLevelUp] = useState<LevelUp | null>(null);

  let content: ReactNode = null;

  if (state.status === "broken") {
    content = (
      <BrokenDataNotice
        onReset={() => {
          setSaveError(!reset());
        }}
      />
    );
  } else if (state.status === "ok" && today !== null) {
    const data = state.data;
    const character = data.character;

    if (character === null) {
      content = (
        <NameForm
          onSubmit={(name) => {
            // The naming day is the start date, even without an entry.
            const character = createCharacter(name, getDiaryDate(new Date()));
            setSaveError(!save({ ...data, character }));
          }}
        />
      );
    } else {
      const todayEntry = data.entries.find((entry) => entry.date === today);
      const level = getLevelInfo(character.totalExp).level;
      const stage = getStage(level);

      const handleSave = (body: string) => {
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
        const result = gainExp(character, EXP_PER_ENTRY + bonus);
        const saved = save({
          ...data,
          character: result.character,
          entries: [
            ...data.entries,
            { date, body, createdAt: now.toISOString(), ...earned },
          ],
        });
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
        </>
      );
    }
  }

  const characterName =
    state.status === "ok" ? (state.data.character?.name ?? "") : "";
  const hasCharacter = state.status === "ok" && state.data.character !== null;

  return (
    <div className="mx-auto min-h-full w-full max-w-[480px] bg-cream text-ink">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h1 className="font-bold tracking-wide">logling</h1>
        <nav className="flex gap-4">
          {hasCharacter && (
            <Link
              href="/history"
              className="flex min-h-11 items-center text-sm font-bold text-ember underline"
            >
              ふりかえる<span aria-hidden="true">&nbsp;›</span>
            </Link>
          )}
          <Link
            href="/account"
            className="flex min-h-11 items-center text-sm font-bold text-ember underline"
          >
            アカウント<span aria-hidden="true">&nbsp;›</span>
          </Link>
        </nav>
      </header>
      <main>
        {saveError && <SaveErrorNotice />}
        {content}
      </main>
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
    </div>
  );
}
