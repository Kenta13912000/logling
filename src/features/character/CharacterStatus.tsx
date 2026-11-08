import type { ReactNode } from "react";

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

  return (
    <section
      aria-label="キャラクターのステータス"
      className="border-b border-line bg-white p-4"
    >
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="text-4xl leading-none">
          🐣
        </span>
        <span className="flex-1 text-lg font-bold">{character.name}</span>
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
