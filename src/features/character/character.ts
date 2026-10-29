export type Character = {
  name: string;
  /** Sum of all EXP earned. Level and progress are derived from this. */
  totalExp: number;
};

export type LevelInfo = {
  level: number;
  expInLevel: number;
  expToNext: number;
  remaining: number;
};

export const EXP_PER_ENTRY = 10;

export function expToNextLevel(level: number): number {
  return 20 + 10 * level;
}

export function createCharacter(name: string): Character {
  return { name, totalExp: 0 };
}

export function getLevelInfo(totalExp: number): LevelInfo {
  let level = 1;
  let expInLevel = totalExp;
  while (expInLevel >= expToNextLevel(level)) {
    expInLevel -= expToNextLevel(level);
    level += 1;
  }
  const expToNext = expToNextLevel(level);
  return { level, expInLevel, expToNext, remaining: expToNext - expInLevel };
}

export function gainExp(
  character: Character,
  amount: number,
): { character: Character; leveledUp: boolean; level: number } {
  const before = getLevelInfo(character.totalExp).level;
  const next = { ...character, totalExp: character.totalExp + amount };
  const level = getLevelInfo(next.totalExp).level;
  return { character: next, leveledUp: level > before, level };
}
