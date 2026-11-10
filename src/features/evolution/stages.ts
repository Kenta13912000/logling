/** Every stage SVG is drawn on a square canvas of this size. */
export const ART_SIZE = 400;

export type Stage = {
  stage: 1 | 2 | 3 | 4 | 5;
  /** The first level that shows this stage. */
  minLevel: number;
  name: string;
  /** Path under public/. */
  src: string;
  /**
   * The square around the character inside the 400 x 400 art, used to
   * show it larger in small frames (checked in the mockup, screen 2b).
   */
  crop: { x: number; y: number; side: number };
};

/** The single place to change the levels, names or art of the stages. */
export const STAGES: readonly Stage[] = [
  {
    stage: 1,
    minLevel: 1,
    name: "ねこだま",
    src: "/characters/stage-1.svg",
    crop: { x: 83, y: 132, side: 240 },
  },
  {
    stage: 2,
    minLevel: 5,
    name: "ころねこ",
    src: "/characters/stage-2.svg",
    crop: { x: 85, y: 126, side: 240 },
  },
  {
    stage: 3,
    minLevel: 10,
    name: "ちびねこ",
    src: "/characters/stage-3.svg",
    crop: { x: 71, y: 90, side: 270 },
  },
  {
    stage: 4,
    minLevel: 15,
    name: "えらそうねこ",
    src: "/characters/stage-4.svg",
    crop: { x: 79, y: 56, side: 300 },
  },
  {
    stage: 5,
    minLevel: 20,
    name: "ねこ像",
    src: "/characters/stage-5.svg",
    crop: { x: 50, y: 56, side: 300 },
  },
];

/** The stage for a level. Levels past the last stage stay on it. */
export function getStage(level: number): Stage {
  let found = STAGES[0];
  for (const stage of STAGES) {
    if (level >= stage.minLevel) {
      found = stage;
    }
  }
  return found;
}

/** What the level-up notice shows: the new level, and the new stage if any. */
export type LevelUp = { level: number; evolvedTo?: Stage };

export function levelUpOf(levelBefore: number, levelAfter: number): LevelUp {
  return stageChange(levelBefore, levelAfter) === "up"
    ? { level: levelAfter, evolvedTo: getStage(levelAfter) }
    : { level: levelAfter };
}

/** Whether moving between two levels changes the stage, and which way. */
export function stageChange(
  levelBefore: number,
  levelAfter: number,
): "up" | "down" | null {
  const before = getStage(levelBefore).stage;
  const after = getStage(levelAfter).stage;
  if (after > before) {
    return "up";
  }
  return after < before ? "down" : null;
}
