import { expect, test, type Page, type Request } from "@playwright/test";

// Phone width from AC-16. Each test starts with empty browser storage.
test.use({ viewport: { width: 375, height: 667 } });

const STORAGE_KEY = "logling:v1";

const entry = (date: string, body = `${date} の日記`) => ({
  date,
  body,
  createdAt: `${date}T12:00:00.000Z`,
});

function saveData(totalExp: number, entries: ReturnType<typeof entry>[]) {
  return {
    version: 1,
    character: { name: "ぴよ", totalExp, startDate: "2026-11-01" },
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
  // Freeze only the clock reading at 2026-11-10 21:00; timers keep running.
  await page.clock.setFixedTime(new Date(2026, 10, 10, 21, 0));
});

test("AC-1, AC-6, AC-10, AC-16: Lv. 4 で今日の日記を書くと、すがたが変わったお知らせが出て、ステータスがころねこになる", async ({
  page,
}) => {
  // 170 EXP is Lv. 4 (ねこだま); +10 makes 180 = Lv. 5 (ころねこ).
  await seed(page, saveData(170, []), "/");
  await expect(
    page.getByRole("img", { name: "ぴよ のすがた（ねこだま）" }),
  ).toBeVisible();
  await expectNoHorizontalScroll(page);

  await writeToday(page, "晴れた。");

  const dialog = page.getByRole("dialog", {
    name: "ぴよ が ころねこ になった！",
  });
  await expect(dialog).toContainText("レベル 5 になったよ");
  await expect(dialog.locator("img")).toHaveAttribute(
    "src",
    "/characters/stage-2.svg",
  );
  await expect(dialog.getByRole("button", { name: "とじる" })).toBeFocused();
  await expectNoHorizontalScroll(page);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await expect(
    page.getByRole("img", { name: "ぴよ のすがた（ころねこ）" }),
  ).toBeVisible();
  await expect(page.getByText("ころねこ", { exact: true })).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test("AC-11, AC-12: 振り返りで日記を消して前の段階に戻るときは確認でわかり、ホームのすがたも戻る", async ({
  page,
}) => {
  // 180 EXP is Lv. 5 (ころねこ); losing 10 makes 170 = Lv. 4 (ねこだま).
  await seed(
    page,
    saveData(180, [entry("2026-11-09"), entry("2026-11-10", "今日の日記")]),
    "/history",
  );

  await page
    .getByRole("listitem")
    .filter({ hasText: "11月10日（火）" })
    .getByRole("button", { name: "消す" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("ぴよ のレベルが 5 から 4 に下がるよ。");
  await expect(dialog).toContainText("すがたも前にもどるよ。");
  await dialog.getByRole("button", { name: "消す" }).click();
  await expect(dialog).toBeHidden();

  await page
    .getByRole("navigation", { name: "メインメニュー" })
    .getByRole("link", { name: "ホーム" })
    .click();

  await expect(
    page.getByRole("img", { name: "ぴよ のすがた（ねこだま）" }),
  ).toBeVisible();
});

test("AC-3, AC-16: 名前を付ける前は段階 1 の絵が出て、横スクロールが出ない", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.locator('img[src="/characters/stage-1.svg"]').first(),
  ).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test("AC-13: タブのアイコンは段階 1 の絵のファビコンで、Next.js の初期のアイコンではない", async ({
  page,
}) => {
  await page.goto("/");

  const icon = page.locator('link[rel="icon"]');
  await expect(icon).toHaveCount(1);
  const href = await icon.getAttribute("href");
  expect(href).toContain("/icon.svg");
  await expect(page.locator('link[href*="favicon.ico"]')).toHaveCount(0);

  const response = await page.request.get(href!);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/svg+xml");
});

test("AC-14: すがたの絵を出してお知らせが出るまで、同じオリジン以外へ通信しない", async ({
  page,
}) => {
  await seed(page, saveData(170, []), "/");
  const origin = new URL(page.url()).origin;
  const requests: Request[] = [];
  page.on("request", (request) => requests.push(request));

  await page.reload();
  await writeToday(page, "晴れた。");
  await expect(
    page.getByRole("dialog", { name: "ぴよ が ころねこ になった！" }),
  ).toBeVisible();

  const network = requests.filter((r) => /^https?:/.test(r.url()));
  expect(network.some((r) => r.url().includes("/characters/"))).toBe(true);
  for (const request of network) {
    expect(new URL(request.url()).origin, request.url()).toBe(origin);
  }
});
