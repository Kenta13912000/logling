import { expect, test, type Page, type Request } from "@playwright/test";

// Phone width from AC-22. Each test starts with empty browser storage.
test.use({ viewport: { width: 375, height: 667 } });

const STORAGE_KEY = "logling:v1";

type Entry = {
  date: string;
  body: string;
  createdAt: string;
  bonus?: number;
  bonusDays?: number;
};

const entry = (date: string, extra: Partial<Entry> = {}): Entry => ({
  date,
  body: `${date} の日記`,
  createdAt: `${date}T12:00:00.000Z`,
  ...extra,
});

/** 11/2–11/7 were written on the day, so writing today (11/8) makes 7. */
const SIX_DAYS = [
  "2026-11-02",
  "2026-11-03",
  "2026-11-04",
  "2026-11-05",
  "2026-11-06",
  "2026-11-07",
].map((date) => entry(date));

function saveData(totalExp: number, entries: Entry[]) {
  return {
    version: 1,
    character: { name: "ぴよ", totalExp, startDate: "2026-11-02" },
    entries,
  };
}

async function seed(page: Page, data: unknown, path: string) {
  await page.goto("/");
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [STORAGE_KEY, JSON.stringify(data)],
  );
  await page.goto(path);
}

const band = (page: Page) => page.getByRole("group", { name: "連続記録" });

// A CSS selector, so the notice is found even while the level-up dialog
// makes the rest of the page inert.
const notice = (page: Page) => page.locator('[role="status"]');

async function writeToday(page: Page, text: string) {
  await page.getByRole("textbox", { name: "今日の日記" }).fill(text);
  await page.getByRole("button", { name: "日記をのこす" }).click();
}

async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

test.beforeEach(async ({ page }) => {
  // Freeze only the clock reading at 2026-11-08 21:00; timers keep running.
  await page.clock.setFixedTime(new Date(2026, 10, 8, 21, 0));
});

test("AC-1, AC-2, AC-6, AC-7, AC-9, AC-10, AC-19, AC-22: 7 日目を書くとボーナスが入ってレベルが上がり、再読み込みしても残る", async ({
  page,
}) => {
  // 40 = Lv2 (10 / 40); +30 makes 70 = Lv3 (0 / 50).
  await seed(page, saveData(40, SIX_DAYS), "/");

  await expect(band(page)).toContainText("🔥 6 日連続中。今日書くと 7 日！");
  await expect(band(page)).toContainText("あと 1 日で 7 日連続。ボーナス +20");
  await expectNoHorizontalScroll(page);

  await writeToday(page, "1 週間続いた！");

  await expect(notice(page)).toContainText("✨ +10 経験値！");
  await expect(notice(page)).toContainText("🔥 7 日連続！ボーナス +20");
  await expectNoHorizontalScroll(page);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("ぴよ が レベル 3 になった！");
  await page.getByRole("button", { name: "とじる" }).click();
  await expect(dialog).toBeHidden();

  await expect(band(page)).toContainText("🔥 7 日連続");
  await expect(band(page)).toContainText("あと 7 日で 14 日連続。ボーナス +30");

  await page.reload();

  await expect(band(page)).toContainText("🔥 7 日連続");
  await expect(page.getByText("Lv. 3")).toBeVisible();
  await expect(page.getByText("0 / 50")).toBeVisible();
});

test("AC-15, AC-16, AC-22: 振り返りでボーナスの付いた日記を消すと、内訳が出て、ホームの帯が書く前に戻る", async ({
  page,
}) => {
  await seed(
    page,
    saveData(70, [
      ...SIX_DAYS,
      entry("2026-11-08", { body: "7 日目の日記", bonus: 20, bonusDays: 7 }),
    ]),
    "/history",
  );

  await page
    .getByRole("listitem")
    .filter({ hasText: "11月8日（日）" })
    .getByRole("button", { name: "消す" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("消すと経験値が 30 減るよ。");
  await expect(dialog).toContainText("（日記の 10 と、7 日連続のボーナス 20）");
  await expectNoHorizontalScroll(page);

  await dialog.getByRole("button", { name: "消す" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("link", { name: "ホーム", exact: true }).click();

  await expect(band(page)).toContainText("🔥 6 日連続中。今日書くと 7 日！");
  // 70 - 30 = 40 = Lv2 (10 / 40).
  await expect(page.getByText("Lv. 2")).toBeVisible();
  await expect(page.getByText("10 / 40")).toBeVisible();
});

test("AC-19: 7 日目を書いてボーナスが入るまで、同じオリジン以外へ通信せず、本文も送らない", async ({
  page,
}) => {
  const secret = "だれにも見せない日記 streak-check";
  await seed(page, saveData(40, SIX_DAYS), "/");
  const origin = new URL(page.url()).origin;
  const requests: Request[] = [];
  page.on("request", (request) => requests.push(request));

  await writeToday(page, secret);
  await expect(notice(page)).toContainText("🔥 7 日連続！ボーナス +20");

  for (const request of requests.filter((r) => /^https?:/.test(r.url()))) {
    expect(new URL(request.url()).origin, request.url()).toBe(origin);
    expect(request.postData() ?? "").not.toContain(secret);
  }
});
