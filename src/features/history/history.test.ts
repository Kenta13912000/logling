import { describe, expect, test } from "vitest";

import type { DiaryEntry } from "@/features/diary/diary";
import type { SaveData } from "@/features/home/save-data";

import {
  buildHistory,
  deleteEntry,
  editEntry,
  expForEntry,
  getStartDate,
  previewDelete,
  writeLaterEntry,
} from "./history";

const TODAY = "2026-11-07";

const entry = (
  date: string,
  body: string,
  writtenLater = false,
): DiaryEntry => ({
  date,
  body,
  createdAt: `${date}T12:00:00.000Z`,
  ...(writtenLater ? { writtenLater: true as const } : {}),
});

// Oldest first, as stored. 11/03 and 11/06 are missing.
const ENTRIES: DiaryEntry[] = [
  entry("2026-10-30", "古い日記"),
  entry("2026-10-31", "ハロウィン"),
  entry("2026-11-01", "11月1日"),
  entry("2026-11-02", "11月2日"),
  entry("2026-11-04", "11月4日"),
  entry("2026-11-05", "あとから書いた", true),
  entry("2026-11-07", "今日"),
];

// No startDate: data from diary-exp. The oldest entry (10/30) is the start.
const saveData = (totalExp: number, entries = ENTRIES): SaveData => ({
  version: 1,
  character: { name: "ぴよ", totalExp },
  entries,
});

const startedOn = (startDate: string, entries: DiaryEntry[]): SaveData => ({
  version: 1,
  character: { name: "ぴよ", totalExp: 75, startDate },
  entries,
});

describe("getStartDate", () => {
  test("AC-24: 始めた日の記録があれば、その日", () => {
    expect(getStartDate(startedOn("2026-11-05", []))).toBe("2026-11-05");
  });

  test("AC-24: 記録がなければ（diary-exp のデータ）、一番古い日記の日", () => {
    expect(getStartDate(saveData(75))).toBe("2026-10-30");
  });

  test("AC-24: 記録も日記もなければ、わからない（null）", () => {
    expect(getStartDate(saveData(0, []))).toBeNull();
  });
});

describe("buildHistory", () => {
  test("AC-2, AC-14, AC-18: 新しい順に、最近 7 日の日記・空いた日・読むだけの日記を並べる", () => {
    const items = buildHistory(ENTRIES, TODAY, "2026-10-30");

    expect(
      items.map((item) =>
        item.kind === "missing"
          ? `${item.date} missing`
          : `${item.entry.date} ${item.editable ? "editable" : "readonly"}`,
      ),
    ).toEqual([
      "2026-11-07 editable",
      "2026-11-06 missing",
      "2026-11-05 editable",
      "2026-11-04 editable",
      "2026-11-03 missing",
      "2026-11-02 editable",
      "2026-11-01 editable",
      "2026-10-31 readonly",
      "2026-10-30 readonly",
    ]);
  });

  test("AC-14: 今日の日記がなくても、今日は空いた日として並べない（今日はホームで書く）", () => {
    const items = buildHistory(
      ENTRIES.filter((e) => e.date !== TODAY),
      TODAY,
      "2026-10-30",
    );

    expect(items[0]).toEqual({ kind: "missing", date: "2026-11-06" });
  });

  test("AC-18: 8 日以上前の空いた日は並べない", () => {
    const items = buildHistory(
      [entry("2026-10-20", "ずっと前")],
      TODAY,
      "2026-10-20",
    );

    expect(items.filter((item) => item.kind === "missing")).toHaveLength(6);
    expect(items.at(-1)).toMatchObject({
      kind: "entry",
      editable: false,
      entry: { date: "2026-10-20" },
    });
  });

  test("AC-4: 日記がなければ、最近 6 日の空いた日だけになる", () => {
    const items = buildHistory([], TODAY, "2026-10-01");

    expect(items.map((item) => item.kind)).toEqual(Array(6).fill("missing"));
  });

  test("AC-14: 始めた日より前の日は、空いた日として並べない", () => {
    const items = buildHistory([entry(TODAY, "今日")], TODAY, "2026-11-05");

    expect(
      items.map((item) =>
        item.kind === "missing" ? item.date : item.entry.date,
      ),
    ).toEqual(["2026-11-07", "2026-11-06", "2026-11-05"]);
  });

  test("AC-14: 始めた日がわからなければ、空いた日は並べない", () => {
    expect(buildHistory([], TODAY, null)).toEqual([]);
  });
});

describe("expForEntry", () => {
  test("AC-21: 後から書いた印のない日記は 10", () => {
    expect(expForEntry(entry("2026-11-07", "今日"))).toBe(10);
  });

  test("AC-10: 後から書いた日記は 5", () => {
    expect(expForEntry(entry("2026-11-05", "あとから", true))).toBe(5);
  });
});

describe("previewDelete", () => {
  test("AC-10, AC-11: 減る経験値と、消す前・後のレベルがわかる", () => {
    // 75 = Lv3; losing 10 gives 65 = Lv2.
    expect(previewDelete(saveData(75), "2026-11-07")).toEqual({
      lost: 10,
      levelBefore: 3,
      levelAfter: 2,
    });
  });

  test("AC-10: 後から書いた日記は 5 減る", () => {
    expect(previewDelete(saveData(75), "2026-11-05")).toEqual({
      lost: 5,
      levelBefore: 3,
      levelAfter: 3,
    });
  });

  test("日記がない日は見込みを出さない", () => {
    expect(previewDelete(saveData(75), "2026-11-06")).toBeNull();
  });
});

describe("editEntry", () => {
  test("AC-7: 最近 7 日の日記の本文が変わり、経験値は変わらない", () => {
    const before = saveData(75);
    const result = editEntry(before, "2026-11-04", "書き直した", TODAY);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.entries.find((e) => e.date === "2026-11-04")?.body).toBe(
      "書き直した",
    );
    expect(result.data.character?.totalExp).toBe(75);
    expect(before.entries.find((e) => e.date === "2026-11-04")?.body).toBe(
      "11月4日",
    );
  });

  test("AC-7: 後から書いた印は、書き直しても残る", () => {
    const result = editEntry(saveData(75), "2026-11-05", "書き直した", TODAY);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.data.entries.find((e) => e.date === "2026-11-05"),
    ).toMatchObject({ body: "書き直した", writtenLater: true });
  });

  test("AC-18: 8 日以上前の日記と、日記がない日は書き直せない", () => {
    expect(editEntry(saveData(75), "2026-10-31", "x", TODAY)).toEqual({
      ok: false,
    });
    expect(editEntry(saveData(75), "2026-11-06", "x", TODAY)).toEqual({
      ok: false,
    });
  });
});

describe("deleteEntry", () => {
  test("AC-12: 日記が消え、その日記ぶんの経験値が減り、レベルが下がったことがわかる", () => {
    const result = deleteEntry(saveData(75), "2026-11-07", TODAY);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.entries.map((e) => e.date)).not.toContain("2026-11-07");
    expect(result.data.character?.totalExp).toBe(65);
    expect(result).toMatchObject({ lost: 10, leveledDown: true, level: 2 });
  });

  test("AC-12: 後から書いた日記を消すと 5 減る", () => {
    const result = deleteEntry(saveData(75), "2026-11-05", TODAY);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.character?.totalExp).toBe(70);
    expect(result).toMatchObject({ lost: 5, leveledDown: false, level: 3 });
  });

  test("AC-18: 8 日以上前の日記と、日記がない日は消せない", () => {
    expect(deleteEntry(saveData(75), "2026-10-31", TODAY)).toEqual({
      ok: false,
    });
    expect(deleteEntry(saveData(75), "2026-11-06", TODAY)).toEqual({
      ok: false,
    });
  });

  test("キャラクターがいなければ消せない", () => {
    const data = { ...saveData(75), character: null };
    expect(deleteEntry(data, "2026-11-07", TODAY)).toEqual({ ok: false });
  });
});

describe("writeLaterEntry", () => {
  const NOW = new Date("2026-11-07T12:34:00.000Z");

  test("AC-15: 空いた日に、後から書いた印の付いた日記が日付の順に入り、経験値が 5 入る", () => {
    const result = writeLaterEntry(
      saveData(75),
      "2026-11-06",
      "思い出した",
      TODAY,
      NOW,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const dates = result.data.entries.map((e) => e.date);
    expect(dates).toEqual([...dates].sort());
    expect(result.data.entries.find((e) => e.date === "2026-11-06")).toEqual({
      date: "2026-11-06",
      body: "思い出した",
      createdAt: "2026-11-07T12:34:00.000Z",
      writtenLater: true,
    });
    expect(result.data.character?.totalExp).toBe(80);
    expect(result).toMatchObject({ gained: 5, leveledUp: false, level: 3 });
  });

  test("AC-16: 必要な経験値に達したら、レベルが上がったことがわかる", () => {
    // 25 + 5 = 30 reaches Lv2.
    const result = writeLaterEntry(
      saveData(25),
      "2026-11-06",
      "思い出した",
      TODAY,
      NOW,
    );

    expect(result).toMatchObject({ ok: true, leveledUp: true, level: 2 });
  });

  test("AC-14, AC-18: 今日・日記がある日・8 日以上前には、後から書けない", () => {
    const data = saveData(75);
    for (const date of ["2026-11-07", "2026-11-05", "2026-10-29"]) {
      expect(writeLaterEntry(data, date, "x", TODAY, NOW)).toEqual({
        ok: false,
      });
    }
  });

  test("AC-14: 始めた日より前の日には後から書けず、始めた日には書ける", () => {
    const data = startedOn("2026-11-05", [entry(TODAY, "今日")]);

    expect(writeLaterEntry(data, "2026-11-04", "x", TODAY, NOW)).toEqual({
      ok: false,
    });
    expect(writeLaterEntry(data, "2026-11-05", "x", TODAY, NOW).ok).toBe(true);
  });

  test("AC-14, AC-24: 記録がないデータは、一番古い日記の日より前に後から書けない", () => {
    const data = saveData(75, [
      entry("2026-11-04", "初日"),
      entry(TODAY, "今日"),
    ]);

    expect(writeLaterEntry(data, "2026-11-03", "x", TODAY, NOW)).toEqual({
      ok: false,
    });
  });
});

describe("streak：ボーナスの付いた日記", () => {
  const NOW = new Date("2026-11-07T12:34:00.000Z");
  const withBonus = (date: string, bonus: number): DiaryEntry => ({
    ...entry(date, "区切りの日"),
    bonus,
  });
  // 11/7 reached a milestone (+20). 11/4 has a bonus from an earlier one.
  const bonusData = () =>
    saveData(75, [
      withBonus("2026-11-04", 10),
      entry("2026-11-05", "あとから", true),
      withBonus("2026-11-07", 20),
    ]);

  test("AC-16: ボーナスの付いた日記の経験値は、日記の 10 とボーナスの合計", () => {
    expect(expForEntry(withBonus("2026-11-07", 20))).toBe(30);
  });

  test("AC-14, AC-21: ボーナスの記録がない日記は、ボーナス 0 として扱う", () => {
    expect(expForEntry(entry("2026-11-07", "今日"))).toBe(10);
  });

  test("AC-15: 消す前の見込みでは、ボーナスも含めた量が減る", () => {
    // 75 = Lv3; losing 30 gives 45 = Lv2.
    expect(previewDelete(bonusData(), "2026-11-07")).toMatchObject({
      lost: 30,
      levelBefore: 3,
      levelAfter: 2,
    });
  });

  test("AC-16: 消すと、日記の経験値とボーナスが一緒に減り、ほかの日のボーナスは残る", () => {
    const result = deleteEntry(bonusData(), "2026-11-07", TODAY);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.character?.totalExp).toBe(45);
    expect(result).toMatchObject({ lost: 30, leveledDown: true, level: 2 });
    expect(
      result.data.entries.find((e) => e.date === "2026-11-04")?.bonus,
    ).toBe(10);
  });

  test("AC-18: 書き直しても、ボーナスはそのまま残る", () => {
    const result = editEntry(bonusData(), "2026-11-07", "書き直した", TODAY);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.data.entries.find((e) => e.date === "2026-11-07"),
    ).toMatchObject({ body: "書き直した", bonus: 20 });
    expect(result.data.character?.totalExp).toBe(75);
  });

  test("AC-12: 後から書いて連続が区切りに届いても、ボーナスは付かない", () => {
    // 11/1–11/7 except 11/4: filling 11/4 later makes 7 days in a row.
    const week = [
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
    ].map((date) => entry(date, date));
    const result = writeLaterEntry(
      saveData(75, week),
      "2026-11-04",
      "x",
      TODAY,
      NOW,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.gained).toBe(5);
    expect(result.data.character?.totalExp).toBe(80);
    expect(
      result.data.entries.find((e) => e.date === "2026-11-04"),
    ).not.toHaveProperty("bonus");
  });
});

describe("始めた日の書き込み（AC-24）", () => {
  const NOW = new Date("2026-11-07T12:34:00.000Z");
  const legacy = () =>
    saveData(75, [entry("2026-11-04", "初日"), entry(TODAY, "今日")]);

  test("記録がないデータで一番古い日記を消しても、始めた日はずれない", () => {
    const result = deleteEntry(legacy(), "2026-11-04", TODAY);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.character?.startDate).toBe("2026-11-04");
  });

  test("記録がないデータは、書き直しや後から書いたときにも始めた日が書き込まれる", () => {
    const edited = editEntry(legacy(), TODAY, "書き直した", TODAY);
    const written = writeLaterEntry(legacy(), "2026-11-05", "x", TODAY, NOW);

    expect(edited.ok && edited.data.character?.startDate).toBe("2026-11-04");
    expect(written.ok && written.data.character?.startDate).toBe("2026-11-04");
  });

  test("始めた日の記録があれば、そのまま変えない", () => {
    const data = startedOn("2026-11-02", [entry("2026-11-04", "初日")]);
    const result = deleteEntry(data, "2026-11-04", TODAY);

    expect(result.ok && result.data.character?.startDate).toBe("2026-11-02");
  });
});
