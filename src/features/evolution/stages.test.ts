import { describe, expect, test } from "vitest";

import { STAGES, getStage, levelUpOf, stageChange } from "./stages";

describe("levelUpOf", () => {
  test("AC-6: 段階が上がったときは、新しいレベルと新しい段階を返す", () => {
    expect(levelUpOf(4, 5)).toEqual({ level: 5, evolvedTo: getStage(5) });
  });

  test("AC-7: 同じ段階の中なら、新しいレベルだけを返す", () => {
    expect(levelUpOf(1, 2)).toEqual({ level: 2 });
  });
});

describe("getStage", () => {
  test("AC-1: レベルの区切りどおりに段階が決まる", () => {
    const cases: Array<[level: number, stage: number]> = [
      [1, 1],
      [4, 1],
      [5, 2],
      [9, 2],
      [10, 3],
      [14, 3],
      [15, 4],
      [19, 4],
      [20, 5],
      [35, 5],
    ];
    for (const [level, stage] of cases) {
      expect(getStage(level).stage, `Lv. ${level}`).toBe(stage);
    }
  });

  test("AC-1: 段階の名前と絵のファイルは、表のとおり", () => {
    expect(STAGES.map((s) => [s.stage, s.minLevel, s.name, s.src])).toEqual([
      [1, 1, "ねこだま", "/characters/stage-1.svg"],
      [2, 5, "ころねこ", "/characters/stage-2.svg"],
      [3, 10, "ちびねこ", "/characters/stage-3.svg"],
      [4, 15, "えらそうねこ", "/characters/stage-4.svg"],
      [5, 20, "ねこ像", "/characters/stage-5.svg"],
    ]);
  });

  test("settings AC-13: 暗い色のときの丸は、400 × 400 の絵の中に収まる", () => {
    for (const { stage, backing } of STAGES) {
      expect(backing.x - backing.r, `段階 ${stage}`).toBeGreaterThanOrEqual(0);
      expect(backing.y - backing.r, `段階 ${stage}`).toBeGreaterThanOrEqual(0);
      expect(backing.x + backing.r, `段階 ${stage}`).toBeLessThanOrEqual(400);
      expect(backing.y + backing.r, `段階 ${stage}`).toBeLessThanOrEqual(400);
    }
  });

  test("切り取る範囲は、400 × 400 の絵の中に収まる", () => {
    for (const { stage, crop } of STAGES) {
      expect(crop.x, `段階 ${stage}`).toBeGreaterThanOrEqual(0);
      expect(crop.y, `段階 ${stage}`).toBeGreaterThanOrEqual(0);
      expect(crop.x + crop.side, `段階 ${stage}`).toBeLessThanOrEqual(400);
      expect(crop.y + crop.side, `段階 ${stage}`).toBeLessThanOrEqual(400);
    }
  });
});

describe("stageChange", () => {
  test("次の段階のレベルに上がると、上がったとわかる", () => {
    expect(stageChange(4, 5)).toBe("up");
    expect(stageChange(19, 20)).toBe("up");
  });

  test("一度に 2 つ以上レベルが上がって段階が変わっても、上がったとわかる", () => {
    expect(stageChange(3, 6)).toBe("up");
  });

  test("同じ段階の中でレベルが変わっても、段階は変わらない", () => {
    expect(stageChange(5, 6)).toBeNull();
    expect(stageChange(6, 5)).toBeNull();
    expect(stageChange(20, 25)).toBeNull();
  });

  test("前の段階のレベルに下がると、下がったとわかる", () => {
    expect(stageChange(5, 4)).toBe("down");
    expect(stageChange(10, 9)).toBe("down");
  });
});
