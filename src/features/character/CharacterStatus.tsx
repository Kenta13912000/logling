import type { ReactNode } from "react";

import { CharacterArt } from "@/features/evolution/CharacterArt";
import { getStage } from "@/features/evolution/stages";

import { getLevelInfo, type Character } from "./character";

type Props = {
  character: Character;
  /** Shown under the EXP bar (e.g. the streak band from the home page). */
  children?: ReactNode;
};

export function CharacterStatus({ character, children }: Props) {
  const { level, expInLevel, expToNext, remaining } = getLevelInfo(
    character.totalExp,
  );
  const stage = getStage(level);

  return (
    <section
      aria-label="キャラクターのステータス"
      className="border-b border-line bg-white px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <CharacterArt
          stage={stage}
          size={64}
          crop
          alt={`${character.name} のすがた（${stage.name}）`}
        />
        <span className="min-w-0 flex-1">
          <span className="text-lg font-bold">{character.name}</span>
          <span className="ml-1.5 rounded-full border border-line px-2 text-xs whitespace-nowrap text-ink-muted">
            {stage.name}
          </span>
        </span>
        <span className="font-bold">{`Lv. ${level}`}</span>
      </div>
      <div
        role="progressbar"
        aria-label="経験値"
        aria-valuemin={0}
        aria-valuemax={expToNext}
        aria-valuenow={expInLevel}
        className="mt-3 h-3 overflow-hidden rounded-full bg-honey-track"
      >
        <div
          className="h-full bg-honey"
          style={{ width: `${(expInLevel / expToNext) * 100}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-sm text-ink-muted">
        <span>{`あと ${remaining} でレベルアップ`}</span>
        <span>{`${expInLevel} / ${expToNext}`}</span>
      </div>
      {children}
    </section>
  );
}
