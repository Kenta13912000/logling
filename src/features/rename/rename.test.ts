import { describe, expect, test } from "vitest";

import type { SaveData } from "@/features/home/save-data";

import { planRename, withName } from "./rename";

describe("名前の決め方", () => {
  test("AC-3: 空や空白だけ、11 文字以上は、名前を付けるときと同じ理由で止める", () => {
    expect(planRename("ぴよ", "")).toStrictEqual({
      kind: "invalid",
      reason: "empty",
    });
    expect(planRename("ぴよ", "   ")).toStrictEqual({
      kind: "invalid",
      reason: "empty",
    });
    expect(planRename("ぴよ", "あ".repeat(11))).toStrictEqual({
      kind: "invalid",
      reason: "tooLong",
    });
  });

  test("AC-3: 前後の空白を除いて今の名前と同じなら「同じ」", () => {
    expect(planRename("ぴよ", "ぴよ")).toStrictEqual({ kind: "same" });
    expect(planRename("ぴよ", "  ぴよ ")).toStrictEqual({ kind: "same" });
  });

  test("AC-2, AC-3: ちがう名前なら、前後の空白を除いた名前で確認へ進む。10 文字までは使える", () => {
    expect(planRename("ぴよ", " ちびすけ ")).toStrictEqual({
      kind: "confirm",
      name: "ちびすけ",
    });
    expect(planRename("ぴよ", "あ".repeat(10))).toStrictEqual({
      kind: "confirm",
      name: "あ".repeat(10),
    });
  });
});

describe("名前だけを変える", () => {
  test("AC-6: 名前だけが変わり、経験値・始めた日・日記はそのまま。元のデータは書きかえない", () => {
    const data: SaveData = {
      version: 1,
      character: { name: "ぴよ", totalExp: 120, startDate: "2026-11-01" },
      entries: [
        {
          date: "2026-11-06",
          body: "きのうの日記",
          createdAt: "2026-11-06T12:00:00.000Z",
          bonus: 5,
          bonusDays: 3,
        },
      ],
    };
    const copy = structuredClone(data);

    expect(withName(data, "ちびすけ")).toStrictEqual({
      ...copy,
      character: { ...copy.character, name: "ちびすけ" },
    });
    expect(data).toStrictEqual(copy);
  });
});
