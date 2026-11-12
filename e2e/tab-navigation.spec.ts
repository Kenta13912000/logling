import { expect, test, type Locator, type Page } from "@playwright/test";

// Phone width (SC-9). Each test starts with empty browser storage, so the
// character has no name yet (AC-12).
test.use({ viewport: { width: 375, height: 667 } });

const STORAGE_KEY = "logling:v1";
const PAGES = ["/", "/history", "/more", "/account", "/privacy", "/settings"];

const menu = (page: Page) =>
  page.getByRole("navigation", { name: "メインメニュー" });

const tab = (page: Page, name: string) =>
  menu(page).getByRole("link", { name });

/** The tab bar itself, found even while a modal dialog makes it inert. */
const tabBar = (page: Page) => page.locator('nav[aria-label="メインメニュー"]');

/** Only `name` is marked as the current page, and the top bar is just the name. */
async function expectAt(page: Page, path: RegExp, current: string) {
  await expect(page).toHaveURL(path);
  await expect(tab(page, current)).toHaveAttribute("aria-current", "page");
  await expect(menu(page).locator('[aria-current="page"]')).toHaveCount(1);
  await expect(page.getByRole("banner")).toHaveText("logling");
}

async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

/** What is drawn at the middle of the tab bar is not the tab bar (AC-11). */
async function expectTabsCovered(page: Page) {
  const box = await tabBar(page).boundingBox();
  expect(box).not.toBeNull();
  const covered = await page.evaluate(
    ([x, y]) =>
      document
        .elementFromPoint(x, y)
        ?.closest('nav[aria-label="メインメニュー"]') === null,
    [box!.x + box!.width / 2, box!.y + box!.height / 2],
  );
  expect(covered).toBe(true);
}

/** The element ends above the tab bar, so the tabs hide none of it. */
async function expectAboveTabs(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  const bar = await tabBar(page).boundingBox();
  expect(box).not.toBeNull();
  expect(bar).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(bar!.y);
}

async function seed(page: Page, data: unknown, path: string) {
  await page.goto("/");
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [STORAGE_KEY, JSON.stringify(data)],
  );
  await page.goto(path);
}

/** Today (11/7) is written; 20 EXP, so one more entry reaches Lv. 2. */
function piyo(totalExp: number, written: boolean) {
  return {
    version: 1,
    character: { name: "ぴよ", totalExp, startDate: "2026-11-01" },
    entries: written
      ? [
          {
            date: "2026-11-07",
            body: "きょう書いた日記",
            createdAt: "2026-11-07T12:00:00.000Z",
          },
        ]
      : [],
  };
}

async function nameCharacter(page: Page, name: string) {
  await page.getByLabel("名前（10 文字まで）").fill(name);
  await page.getByRole("button", { name: "この名前にする" }).click();
  await page.getByRole("button", { name: "これにする" }).click();
}

async function writeDiary(page: Page, body: string) {
  await page.getByRole("textbox", { name: "今日の日記" }).fill(body);
  await page.getByRole("button", { name: "日記をのこす" }).click();
}

test.beforeEach(async ({ page }) => {
  // Freeze only the clock reading at 2026-11-07 21:00; timers keep running.
  await page.clock.setFixedTime(new Date(2026, 10, 7, 21, 0));
});

test("AC-1, AC-3, AC-5, AC-12: 名前を付ける前から、下のタブで 3 つの画面と「その他」の中の画面を行き来でき、今いるタブが変わる", async ({
  page,
}) => {
  await page.goto("/");
  await expectAt(page, /\/$/, "ホーム");
  await expect(page.getByLabel("名前（10 文字まで）")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /ほかの端末で使っていた人は ログイン/ }),
  ).toBeVisible();

  await tab(page, "ふりかえる").click();
  await expectAt(page, /\/history$/, "ふりかえる");
  await expect(page.getByText("ホームで名前を付けてね")).toBeVisible();

  await tab(page, "その他").click();
  await expectAt(page, /\/more$/, "その他");
  await expect(
    page.getByRole("heading", { level: 1, name: "その他" }),
  ).toBeVisible();
  const account = page.getByRole("link", { name: /アカウント/ });
  await expect(account).toContainText("ログインしていない");

  await account.click();
  await expectAt(page, /\/account$/, "その他");
  await expect(
    page.getByRole("heading", { level: 1, name: "アカウント" }),
  ).toBeVisible();

  await tab(page, "その他").click();
  await page.getByRole("link", { name: /日記の保存のしかた/ }).click();
  await expectAt(page, /\/privacy$/, "その他");
  await expect(
    page.getByRole("heading", { level: 1, name: "日記の保存のしかた" }),
  ).toBeVisible();

  await tab(page, "その他").click();
  await page.getByRole("link", { name: /設定/ }).click();
  await expectAt(page, /\/settings$/, "その他");
  await expect(page.getByText("設定は、これから増えるよ")).toBeVisible();

  await tab(page, "ホーム").click();
  await expectAt(page, /\/$/, "ホーム");
});

test("AC-2: 幅 375px で、タブは高さも幅も 44px 以上あり、6 つの画面のどれにも横スクロールが出ない", async ({
  page,
}) => {
  for (const path of PAGES) {
    await page.goto(path);
    await expect(menu(page)).toBeVisible();
    for (const name of ["ホーム", "ふりかえる", "その他"]) {
      const box = await tab(page, name).boundingBox();
      expect(box, `${path} の ${name}`).not.toBeNull();
      expect(box!.height, `${path} の ${name}`).toBeGreaterThanOrEqual(44);
      expect(box!.width, `${path} の ${name}`).toBeGreaterThanOrEqual(44);
    }
    await expectNoHorizontalScroll(page);
  }
});

test("AC-9: 名前・日記・振り返りの入力欄で文字を打っている間はタブが隠れ、入力欄から離れると、また出る", async ({
  page,
}) => {
  await page.goto("/");
  const name = page.getByLabel("名前（10 文字まで）");
  await name.click();
  await expect(menu(page)).toBeHidden();
  await name.fill("ぴよ");
  await page.getByRole("button", { name: "この名前にする" }).click();
  await expect(menu(page)).toBeVisible();
  await page.getByRole("button", { name: "これにする" }).click();

  const diary = page.getByRole("textbox", { name: "今日の日記" });
  await diary.click();
  await expect(menu(page)).toBeHidden();
  // Tapping outside the field (here, the top bar) brings the tabs back.
  await page.getByRole("banner").click();
  await expect(menu(page)).toBeVisible();
  await writeDiary(page, "タブのじゃまにならない日記");
  await expect(menu(page)).toBeVisible();

  await tab(page, "ふりかえる").click();
  await page.getByRole("button", { name: "書き直す" }).click();
  await page.getByRole("textbox", { name: "11月7日の日記" }).click();
  await expect(menu(page)).toBeHidden();
  await page.getByRole("button", { name: "やめる" }).click();
  await expect(menu(page)).toBeVisible();
});

test("AC-10: ホームのいちばん下まで動かすと、フッターがタブより上に見える。iPhone の画面の下の線の分の長さを使える設定がある", async ({
  page,
}) => {
  await seed(page, piyo(20, true), "/");
  await expect(page.getByText("きょう書いた日記")).toBeVisible();
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );

  const footer = page.getByRole("contentinfo");
  await expect(
    footer.getByRole("link", { name: "日記の保存のしかた" }),
  ).toBeVisible();
  await expectAboveTabs(page, footer);
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    /viewport-fit=cover/,
  );
});

test("AC-11: 消す確認の窓が出ている間、タブは窓の後ろにある", async ({
  page,
}) => {
  await seed(page, piyo(20, true), "/history");
  await page.getByRole("button", { name: "消す" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await expectTabsCovered(page);
});

test("AC-11: 経験値のお知らせはタブにかぶらず、レベルアップの確認の窓が出ている間、タブは窓の後ろにある", async ({
  page,
}) => {
  await seed(page, piyo(20, false), "/");
  await writeDiary(page, "レベルが上がる日記");

  await expect(page.getByRole("dialog")).toBeVisible();
  await expectTabsCovered(page);
  const toast = page.getByText("✨ +10 経験値！");
  await expect(toast).toBeVisible();
  await expectAboveTabs(page, toast);
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

  async function signUp(page: Page): Promise<string> {
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const response = await page.request.post("/api/auth/sign-up/email", {
      data: { email, password: PASSWORD, name: "e2e" },
    });
    expect(response.ok()).toBe(true);
    return email;
  }

  test("AC-11: 移したお知らせはタブの上に出る", async ({ page }) => {
    await page.goto("/");
    await nameCharacter(page, "まえぴよ");
    await writeDiary(page, "ログイン前に書いた日記");
    await expect(page.getByText("ログイン前に書いた日記")).toBeVisible();

    await signUp(page);
    await page.goto("/");

    const toast = page.getByText(
      "☁ まえぴよ と日記 1 件をアカウントに移したよ",
    );
    await expect(toast).toBeVisible();
    await expectAboveTabs(page, toast);
  });

  test("AC-11: 退会の確認の窓が出ている間、タブは窓の後ろにある", async ({
    page,
  }) => {
    await signUp(page);
    await page.goto("/account");
    await page.getByRole("button", { name: "退会する" }).click();
    await expect(
      page.getByRole("dialog", { name: "退会する？" }),
    ).toBeVisible();

    await expectTabsCovered(page);
  });

  test("AC-11: 引き継ぎの確認の窓が出ている間、タブは窓の後ろにある", async ({
    page,
    browser,
    baseURL,
  }) => {
    // The account already has a character, made on another device.
    const email = await signUp(page);
    await page.goto("/");
    await nameCharacter(page, "アカウント");
    await expect(page.getByText("アカウント", { exact: true })).toBeVisible();

    // This browser has its own character, made before signing in.
    const other = await browser.newContext({
      baseURL,
      viewport: { width: 375, height: 667 },
    });
    const phone = await other.newPage();
    await phone.goto("/");
    await nameCharacter(phone, "ブラウザ");
    await writeDiary(phone, "ブラウザで書いた日記");
    await expect(phone.getByText("ブラウザで書いた日記")).toBeVisible();
    await phone.request.post("/api/auth/sign-in/email", {
      data: { email, password: PASSWORD },
    });
    await phone.goto("/");

    await phone.getByRole("button", { name: "ブラウザ で続ける" }).click();
    await expect(phone.getByRole("dialog")).toBeVisible();
    await expectTabsCovered(phone);
    await other.close();
  });
});
