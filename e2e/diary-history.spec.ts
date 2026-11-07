import { expect, test, type Page, type Request } from "@playwright/test";

// Phone width from AC-23. Each test starts with empty browser storage.
test.use({ viewport: { width: 375, height: 667 } });

const STORAGE_KEY = "logling:v1";
const LONG_TEXT = `${"a".repeat(300)}${"あ".repeat(300)}`;

const entry = (date: string, body: string, writtenLater = false) => ({
  date,
  body,
  createdAt: `${date}T12:00:00.000Z`,
  ...(writtenLater ? { writtenLater: true } : {}),
});

/** 30 EXP = Lv2. 11/7 is today, 11/5 was written later, 10/25 is read-only. */
function seedData(todayBody = "今日の日記") {
  return {
    version: 1,
    character: { name: "ぴよ", totalExp: 30, startDate: "2026-10-25" },
    entries: [
      entry("2026-10-25", "ずっと前の日記"),
      entry("2026-11-05", "あとから書いた日記", true),
      entry("2026-11-07", todayBody),
    ],
  };
}

async function seed(page: Page, data: unknown, path = "/history") {
  await page.goto("/");
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [STORAGE_KEY, JSON.stringify(data)],
  );
  await page.goto(path);
}

/** The card (list item) for a date such as "11月7日（土）". */
function card(page: Page, date: string) {
  return page.getByRole("listitem").filter({ hasText: date });
}

async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

test.beforeEach(async ({ page }) => {
  // Freeze only the clock reading at 2026-11-07 21:00; timers keep running.
  await page.clock.setFixedTime(new Date(2026, 10, 7, 21, 0));
});

test("AC-1, AC-2: ホームの「ふりかえる」から振り返りに移って一覧を読み、「ホーム」で戻れる", async ({
  page,
}) => {
  await seed(page, seedData(), "/");

  await page.getByRole("link", { name: /ふりかえる/ }).click();

  await expect(page).toHaveURL(/\/history$/);
  await expect(page).toHaveTitle("ふりかえり | logling");
  await expect(
    page.getByRole("heading", { level: 1, name: "ふりかえり" }),
  ).toBeVisible();
  await expect(card(page, "11月7日（土）")).toContainText("今日の日記");
  await expect(card(page, "11月5日（木）")).toContainText("あとから");
  await expect(
    page.getByText("― ここから下は 8 日以上前の日記（読むだけ） ―"),
  ).toBeVisible();
  await expect(card(page, "10月25日（日）")).toContainText("ずっと前の日記");

  await page.getByRole("link", { name: "ホーム", exact: true }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Lv. 2")).toBeVisible();
});

test("AC-7, AC-20: 書き直して保存すると本文が変わり、再読み込みしても残る", async ({
  page,
}) => {
  await seed(page, seedData());

  await card(page, "11月7日（土）")
    .getByRole("button", { name: "書き直す" })
    .click();
  await page
    .getByRole("textbox", { name: "11月7日の日記" })
    .fill("書き直した日記");
  await page.getByRole("button", { name: "保存する" }).click();

  await expect(card(page, "11月7日（土）")).toContainText("書き直した日記");
  await page.reload();
  await expect(card(page, "11月7日（土）")).toContainText("書き直した日記");
});

test("AC-10〜12: 確認は「やめる」にフォーカスがあり、Esc で閉じると何も変わらず、「消す」で空いた日に戻る", async ({
  page,
}) => {
  await seed(page, seedData());
  const late = card(page, "11月5日（木）");

  await late.getByRole("button", { name: "消す" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("11月5日の日記を消す？");
  await expect(dialog).toContainText("消すと経験値が 5 減るよ。");
  await expect(dialog).toContainText("ぴよ のレベルが 2 から 1 に下がるよ。");
  await expect(dialog.getByRole("button", { name: "やめる" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(late).toContainText("あとから書いた日記");

  await late.getByRole("button", { name: "消す" }).click();
  await dialog.getByRole("button", { name: "消す" }).click();

  await expect(dialog).toBeHidden();
  await expect(late).toContainText("この日はまだ書いていないよ");
  await page.reload();
  await expect(card(page, "11月5日（木）")).toContainText(
    "この日はまだ書いていないよ",
  );
});

test("AC-15, AC-20: 後から書くと +5 経験値のお知らせと「あとから」の印が出て、再読み込みしても残る", async ({
  page,
}) => {
  await seed(page, seedData());
  const missed = card(page, "11月6日（金）");

  await missed.getByRole("button", { name: "この日の日記を書く" }).click();
  await expect(missed).toContainText("11月6日は、どんな一日だった？");
  await page
    .getByRole("textbox", { name: "11月6日の日記" })
    .fill("思い出した日記");
  await page.getByRole("button", { name: "日記をのこす" }).click();

  await expect(page.getByText("✨ +5 経験値！")).toBeVisible();
  await expect(missed).toContainText("あとから");
  await expect(missed).toContainText("思い出した日記");
  await page.reload();
  await expect(card(page, "11月6日（金）")).toContainText("思い出した日記");
});

test("AC-23: 長い本文でも、一覧・書き直し・後から書く・消す前の確認のどれでも横スクロールが出ない", async ({
  page,
}) => {
  await seed(page, seedData(LONG_TEXT));
  await expect(card(page, "11月7日（土）")).toBeVisible();
  await expectNoHorizontalScroll(page);

  await card(page, "11月7日（土）")
    .getByRole("button", { name: "書き直す" })
    .click();
  await expect(
    page.getByRole("textbox", { name: "11月7日の日記" }),
  ).toBeVisible();
  await expectNoHorizontalScroll(page);
  await page.getByRole("button", { name: "やめる" }).click();

  await card(page, "11月6日（金）")
    .getByRole("button", { name: "この日の日記を書く" })
    .click();
  await page.getByRole("textbox", { name: "11月6日の日記" }).fill(LONG_TEXT);
  await expectNoHorizontalScroll(page);
  await page.getByRole("button", { name: "やめる" }).click();

  await card(page, "11月7日（土）")
    .getByRole("button", { name: "消す" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test("AC-20: 書き直し・消す・後から書くの間、同じオリジン以外へ通信せず、本文も送らない", async ({
  page,
}) => {
  const secret = "だれにも見せない日記 history-check";
  await seed(page, seedData());
  const origin = new URL(page.url()).origin;
  const requests: Request[] = [];
  page.on("request", (request) => requests.push(request));

  await card(page, "11月7日（土）")
    .getByRole("button", { name: "書き直す" })
    .click();
  await page.getByRole("textbox", { name: "11月7日の日記" }).fill(secret);
  await page.getByRole("button", { name: "保存する" }).click();
  await expect(card(page, "11月7日（土）")).toContainText(secret);

  await card(page, "11月6日（金）")
    .getByRole("button", { name: "この日の日記を書く" })
    .click();
  await page.getByRole("textbox", { name: "11月6日の日記" }).fill(secret);
  await page.getByRole("button", { name: "日記をのこす" }).click();
  await expect(card(page, "11月6日（金）")).toContainText(secret);

  await card(page, "11月5日（木）")
    .getByRole("button", { name: "消す" })
    .click();
  await page.getByRole("dialog").getByRole("button", { name: "消す" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  for (const request of requests.filter((r) => /^https?:/.test(r.url()))) {
    expect(new URL(request.url()).origin, request.url()).toBe(origin);
    expect(request.postData() ?? "").not.toContain(secret);
  }
});
