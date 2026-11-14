import { expect, test, type Page } from "@playwright/test";

// Phone width (AC-15).
test.use({ viewport: { width: 375, height: 667 } });

const STORAGE_KEY = "logling:v1";

const menu = (page: Page) =>
  page.getByRole("navigation", { name: "メインメニュー" });

const tab = (page: Page, name: string) =>
  menu(page).getByRole("link", { name });

/*
 * The page on screen. In production Next.js keeps the page being left
 * mounted but hidden; role queries skip hidden elements, so looking inside
 * the visible <main> never matches that hidden page.
 */
const main = (page: Page) => page.getByRole("main");

const character = (page: Page) =>
  main(page).getByRole("region", { name: "キャラクター" });

async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

async function seed(page: Page, data: unknown, path: string) {
  await page.goto("/");
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [STORAGE_KEY, JSON.stringify(data)],
  );
  await page.goto(path);
}

/** Lv. 2 (30 EXP) with today's entry; deleting it drops to Lv. 1. */
const piyo = {
  version: 1,
  character: { name: "ぴよ", totalExp: 30, startDate: "2026-11-01" },
  entries: [
    {
      date: "2026-11-07",
      body: "きょう書いた日記",
      createdAt: "2026-11-07T12:00:00.000Z",
    },
  ],
};

async function rename(page: Page, name: string) {
  const group = character(page);
  await group.getByRole("button", { name: "名前を変える" }).click();
  await expectNoHorizontalScroll(page);
  await group.getByLabel("新しい名前（10 文字まで）").fill(name);
  await group.getByRole("button", { name: "この名前にする" }).click();
  await expect(group.getByText(`「${name}」に変える？`)).toBeVisible();
  await expectNoHorizontalScroll(page);
  await group.getByRole("button", { name: "変える" }).click();
  await expect(group.getByText(name, { exact: true })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  // Freeze only the clock reading at 2026-11-07 21:00; timers keep running.
  await page.clock.setFixedTime(new Date(2026, 10, 7, 21, 0));
});

test("AC-1, AC-2, AC-6, AC-7, AC-15: 「設定」で名前を変えると、ホームと振り返りに新しい名前が出て、レベルと日記はそのまま。幅 375px で横スクロールが出ない", async ({
  page,
}) => {
  await seed(page, piyo, "/settings");
  await expect(
    character(page).getByText("ぴよ", { exact: true }),
  ).toBeVisible();
  await expectNoHorizontalScroll(page);

  await rename(page, "ちびすけ");
  await expectNoHorizontalScroll(page);

  await tab(page, "ホーム").click();
  await expect(page).toHaveURL(/\/$/);
  await expect(main(page).getByText("ちびすけ", { exact: true })).toBeVisible();
  await expect(main(page).getByText("Lv. 2")).toBeVisible();
  await expect(main(page).getByText("きょう書いた日記")).toBeVisible();

  await tab(page, "ふりかえる").click();
  await expect(page).toHaveURL(/\/history$/);
  await main(page).getByRole("button", { name: "消す" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "ちびすけ のレベルが 2 から 1 に下がるよ。",
  );
});

test("AC-4: 名前を付ける前は、ホームへの案内が出て、ホームで名前を付けられる", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(character(page)).toContainText("まだ名前がないよ。");

  await character(page)
    .getByRole("link", { name: /ホームで名前を付けてね/ })
    .click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel("名前（10 文字まで）")).toBeVisible();
});

test.describe("端末が暗い色の設定のとき", () => {
  test.use({ colorScheme: "dark" });

  // The colors from docs/aidlc/settings/mockup.md, as the browser reports them.
  const DARK = { page: "rgb(31, 24, 19)", card: "rgb(42, 33, 27)" };
  const LIGHT = { page: "rgb(255, 248, 236)", card: "rgb(255, 255, 255)" };

  const background = (page: Page, selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((element) => getComputedStyle(element).backgroundColor);

  /** The circle behind the character art, drawn only in dark mode. */
  const artBacking = (page: Page) =>
    main(page)
      .getByRole("img", { name: /のすがた/ })
      .evaluate(
        (image) => getComputedStyle(image.parentElement!).backgroundImage,
      );

  test("AC-11, AC-13: 背景・帯・タブが暗い色になり、絵の後ろに丸が出る。開いたまま明るい設定にすると、今の色に戻る", async ({
    page,
  }) => {
    await seed(page, piyo, "/");
    await expect(main(page).getByText("ぴよ", { exact: true })).toBeVisible();

    expect(await background(page, "body")).toBe(DARK.page);
    expect(await background(page, 'nav[aria-label="メインメニュー"]')).toBe(
      DARK.card,
    );
    expect(await artBacking(page)).toContain("radial-gradient");

    await page.emulateMedia({ colorScheme: "light" });

    expect(await background(page, "body")).toBe(LIGHT.page);
    expect(await background(page, 'nav[aria-label="メインメニュー"]')).toBe(
      LIGHT.card,
    );
    expect(await artBacking(page)).toBe("none");
  });

  test("AC-14: ブラウザの上の帯の色が、暗い色の設定では暗い色になる", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.locator(
        'meta[name="theme-color"][media="(prefers-color-scheme: dark)"]',
      ),
    ).toHaveAttribute("content", "#1f1813");
    await expect(
      page.locator(
        'meta[name="theme-color"][media="(prefers-color-scheme: light)"]',
      ),
    ).toHaveAttribute("content", "#fff8ec");
  });

  test("AC-12, AC-15: 「設定」のカードが暗い色で、名前を変える流れを通して、幅 375px で横スクロールが出ない", async ({
    page,
  }) => {
    await seed(page, piyo, "/settings");
    await expect(
      character(page).getByText("ぴよ", { exact: true }),
    ).toBeVisible();
    expect(
      await character(page)
        .locator("div")
        .first()
        .evaluate((element) => getComputedStyle(element).backgroundColor),
    ).toBe(DARK.card);
    await expectNoHorizontalScroll(page);

    await rename(page, "ちびすけ");
    await expectNoHorizontalScroll(page);
  });
});

/*
 * Signed-in flows use the test-only email/password login (ADR-0006), which
 * exists only on the local dev server Playwright starts.
 */
test.describe("ログインしたとき", () => {
  test.skip(
    !!process.env.BASE_URL,
    "テスト用のログインは、手元の開発サーバーでだけ使える",
  );

  const PASSWORD = "e2e-password-123";

  test("AC-8: ログイン中に名前を変えると、ほかの端末で開き直しても新しい名前になる", async ({
    page,
    browser,
    baseURL,
  }) => {
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const response = await page.request.post("/api/auth/sign-up/email", {
      data: { email, password: PASSWORD, name: "e2e" },
    });
    expect(response.ok()).toBe(true);
    await page.goto("/");
    await page.getByLabel("名前（10 文字まで）").fill("ぴよ");
    await page.getByRole("button", { name: "この名前にする" }).click();
    await page.getByRole("button", { name: "これにする" }).click();
    await expect(main(page).getByText("ぴよ", { exact: true })).toBeVisible();

    await page.goto("/settings");
    await rename(page, "ちびすけ");

    const other = await browser.newContext({
      baseURL,
      viewport: { width: 375, height: 667 },
    });
    const phone = await other.newPage();
    await phone.request.post("/api/auth/sign-in/email", {
      data: { email, password: PASSWORD },
    });
    await phone.goto("/");
    await expect(
      main(phone).getByText("ちびすけ", { exact: true }),
    ).toBeVisible();
    await other.close();
  });
});
