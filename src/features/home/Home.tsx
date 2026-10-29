"use client";

import { useState, type ReactNode } from "react";

import {
  EXP_PER_ENTRY,
  createCharacter,
  gainExp,
} from "@/features/character/character";
import { CharacterStatus } from "@/features/character/CharacterStatus";
import { ExpGainToast } from "@/features/character/ExpGainToast";
import { LevelUpDialog } from "@/features/character/LevelUpDialog";
import { NameForm } from "@/features/character/NameForm";
import { DiaryEditor } from "@/features/diary/DiaryEditor";
import { TodayEntry } from "@/features/diary/TodayEntry";
import { getDiaryDate } from "@/lib/diary-date";

import { BrokenDataNotice } from "./BrokenDataNotice";
import { useSaveData } from "./useSaveData";
import { useToday } from "./useToday";

const SAVE_ERROR = "保存できなかった…少し時間をおいて、もう一度ためしてね";

export function Home() {
  const { state, save, reset } = useSaveData();
  const today = useToday();
  const [saveError, setSaveError] = useState(false);
  const [gainedExp, setGainedExp] = useState<number | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);

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
            setSaveError(!save({ ...data, character: createCharacter(name) }));
          }}
        />
      );
    } else {
      const todayEntry = data.entries.find((entry) => entry.date === today);

      const handleSave = (body: string) => {
        // Recompute: the page may have stayed open past 4 AM.
        const now = new Date();
        const date = getDiaryDate(now);
        if (data.entries.some((entry) => entry.date === date)) {
          return;
        }
        const result = gainExp(character, EXP_PER_ENTRY);
        const saved = save({
          ...data,
          character: result.character,
          entries: [
            ...data.entries,
            { date, body, createdAt: now.toISOString() },
          ],
        });
        setSaveError(!saved);
        if (!saved) {
          return;
        }
        setGainedExp(EXP_PER_ENTRY);
        if (result.leveledUp) {
          setLevelUp(result.level);
        }
      };

      content = (
        <>
          <CharacterStatus character={character} />
          {todayEntry ? (
            <TodayEntry entry={todayEntry} />
          ) : (
            <DiaryEditor date={today} onSave={handleSave} />
          )}
        </>
      );
    }
  }

  const characterName =
    state.status === "ok" ? (state.data.character?.name ?? "") : "";

  return (
    <div className="mx-auto min-h-full w-full max-w-[480px] bg-cream text-ink">
      <header className="border-b border-line px-4 py-3">
        <h1 className="font-bold tracking-wide">logling</h1>
      </header>
      <main>
        {saveError && (
          <p role="alert" className="mx-4 mt-4 text-sm text-alert">
            ⚠ {SAVE_ERROR}
          </p>
        )}
        {content}
      </main>
      {gainedExp !== null && (
        <ExpGainToast amount={gainedExp} onDone={() => setGainedExp(null)} />
      )}
      {levelUp !== null && (
        <LevelUpDialog
          name={characterName}
          level={levelUp}
          onClose={() => setLevelUp(null)}
        />
      )}
    </div>
  );
}
