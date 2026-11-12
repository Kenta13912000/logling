import { expect, test, type Page } from "@playwright/test";

/*
 * Signed-in flows use the test-only email/password login (ADR-0006). It is
 * enabled only on the local dev server Playwright starts, never in
 * production, so these tests are skipped against a deployed site.
 */
test.skip(
  !!process.env.BASE_URL,
  "テスト用のログインは、手元の開発サーバーでだけ使える",
);

const PASSWORD = "e2e-password-123";

function newEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/** Creates a test user and signs the page in as them. */
async function signUp(page: Page): Promise<string> {
  const email = newEmail();
  const response = await page.request.post("/api/auth/sign-up/email", {
    data: { email, password: PASSWORD, name: "e2e" },
  });
  expect(response.ok()).toBe(true);
  return email;
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

const storedInBrowser = (page: Page) =>
  page.evaluate(() => localStorage.getItem("logling:v1"));

/** No horizontal scroll at the current viewport (AC-32). */
async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

test("AC-30, AC-31: ログインしていなくても、ホームとアカウントの画面から説明ページが開け、ホームに戻れる", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "日記の保存のしかた" })
    .click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(
    page.getByRole("heading", { name: "ログインして使うとき" }),
  ).toBeVisible();

  await page.goto("/account");
  await page.getByRole("link", { name: /日記の保存のしかた/ }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await page.getByRole("link", { name: /ホーム/ }).click();
  await expect(page).toHaveURL(/\/$/);
});

test.describe("スマホの幅（375px）", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("AC-32: ログインの入口・アカウントの画面・退会の確認・説明ページに、横スクロールが出ない", async ({
    page,
  }) => {
    await page.goto("/account");
    await expect(
      page.getByRole("button", { name: "Google でログイン" }),
    ).toBeVisible();
    await expectNoHorizontalScroll(page);

    await page.goto("/privacy");
    await expect(
      page.getByRole("heading", { name: "ログインして使うとき" }),
    ).toBeVisible();
    await expectNoHorizontalScroll(page);

    await signUp(page);
    await page.goto("/");
    await nameCharacter(page, "とても長い名前のねこ");
    await page.goto("/account");
    await expect(page.getByText("ログイン中")).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.getByRole("button", { name: "退会する" }).click();
    await expect(
      page.getByRole("dialog", { name: "退会する？" }),
    ).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test("AC-32: 引き継ぎの選ぶ画面と確認に、横スクロールが出ない", async ({
    page,
    browser,
    baseURL,
  }) => {
    const email = await signUp(page);
    await page.goto("/");
    await nameCharacter(page, "アカウント");
    await expect(page.getByText("アカウント", { exact: true })).toBeVisible();

    const other = await browser.newContext({
      baseURL,
      viewport: { width: 375, height: 667 },
    });
    const phone = await other.newPage();
    await phone.goto("/");
    await nameCharacter(phone, "とても長い名前のねこ");
    await expect(phone.getByText("とても長い名前のねこ")).toBeVisible();
    await phone.request.post("/api/auth/sign-in/email", {
      data: { email, password: PASSWORD },
    });
    await phone.goto("/");

    await expect(
      phone.getByRole("heading", { name: "どちらのキャラクターで続ける？" }),
    ).toBeVisible();
    await expectNoHorizontalScroll(phone);
    await phone
      .getByRole("button", { name: "とても長い名前のねこ で続ける" })
      .click();
    await expect(phone.getByRole("dialog")).toBeVisible();
    await expectNoHorizontalScroll(phone);
    await other.close();
  });
});

test.describe("ログイン中のクラウド保存", () => {
  test("AC-8, AC-10: ログイン中に名前を付けて日記を書くと、開き直しても残り、ブラウザの中には保存されない", async ({
    page,
  }) => {
    await signUp(page);
    await page.goto("/");

    await nameCharacter(page, "くもぴよ");
    await writeDiary(page, "クラウドに残る日記");
    await expect(page.getByText("クラウドに残る日記")).toBeVisible();

    await page.reload();
    await expect(page.getByText("くもぴよ")).toBeVisible();
    await expect(page.getByText("クラウドに残る日記")).toBeVisible();
    expect(await storedInBrowser(page)).toBeNull();
  });

  test("AC-9: 同じアカウントで別のブラウザからログインすると、同じキャラクターと日記が見える", async ({
    page,
    browser,
    baseURL,
  }) => {
    const email = await signUp(page);
    await page.goto("/");
    await nameCharacter(page, "ふたりぴよ");
    await writeDiary(page, "PC で書いた日記");
    await expect(page.getByText("PC で書いた日記")).toBeVisible();

    // Another browser: no cookies or storage shared with the first one.
    const other = await browser.newContext({ baseURL });
    const phone = await other.newPage();
    const signIn = await phone.request.post("/api/auth/sign-in/email", {
      data: { email, password: PASSWORD },
    });
    expect(signIn.ok()).toBe(true);
    await phone.goto("/");

    await expect(phone.getByText("ふたりぴよ")).toBeVisible();
    await expect(phone.getByText("PC で書いた日記")).toBeVisible();
    await other.close();
  });

  test("AC-13: 2 つのブラウザで同じアカウントを開き、片方で今日の日記を書いたあとにもう片方でも書くと、お知らせが出て、日記は 1 件のまま、書いていた文が残る", async ({
    page,
    browser,
    baseURL,
  }) => {
    const email = await signUp(page);
    await page.goto("/");
    await nameCharacter(page, "どうじぴよ");

    // The phone opens the home page before the PC writes today's entry.
    const other = await browser.newContext({ baseURL });
    const phone = await other.newPage();
    await phone.request.post("/api/auth/sign-in/email", {
      data: { email, password: PASSWORD },
    });
    await phone.goto("/");
    await expect(
      phone.getByRole("textbox", { name: "今日の日記" }),
    ).toBeVisible();

    await writeDiary(page, "PC で先に書いた");
    await expect(page.getByText("PC で先に書いた")).toBeVisible();
    await writeDiary(phone, "スマホであとから書いた");

    await expect(
      phone
        .getByRole("alert")
        .filter({ hasText: "ほかの端末で、今日の日記がもう書かれていたよ" }),
    ).toBeVisible();
    await expect(phone.getByText("PC で先に書いた")).toBeVisible();
    await expect(
      phone.getByRole("region", {
        name: "この端末で書いていた文（保存されていないよ）",
      }),
    ).toContainText("スマホであとから書いた");

    await phone.goto("/history");
    await expect(phone.getByText("PC で先に書いた")).toBeVisible();
    await expect(phone.getByText("スマホであとから書いた")).toHaveCount(0);
    await other.close();
  });

  test("AC-14, AC-15, AC-22: ログインせずに書いたあとログインすると、同じキャラクターと日記がアカウントに移り、ブラウザの中は空になる。ログアウトすると名前を付ける画面になる", async ({
    page,
  }) => {
    await page.goto("/");
    await nameCharacter(page, "まえぴよ");
    await writeDiary(page, "ログイン前に書いた日記");
    await expect(page.getByText("ログイン前に書いた日記")).toBeVisible();
    expect(await storedInBrowser(page)).not.toBeNull();

    await signUp(page);
    await page.goto("/");

    await expect(
      page.getByText("☁ まえぴよ と日記 1 件をアカウントに移したよ"),
    ).toBeVisible();
    await expect(page.getByText("ログイン前に書いた日記")).toBeVisible();
    expect(await storedInBrowser(page)).toBeNull();

    await page.goto("/account");
    await page.getByRole("button", { name: "ログアウト" }).click();
    await expect(page.getByLabel("名前（10 文字まで）")).toBeVisible();
  });

  test("AC-18, AC-19: アカウントにもキャラクターがいるとき、ブラウザの方を選んで確認すると、ブラウザのキャラクターで続けられる", async ({
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
    const other = await browser.newContext({ baseURL });
    const phone = await other.newPage();
    await phone.goto("/");
    await nameCharacter(phone, "ブラウザ");
    await writeDiary(phone, "ブラウザで書いた日記");
    await expect(phone.getByText("ブラウザで書いた日記")).toBeVisible();
    await phone.request.post("/api/auth/sign-in/email", {
      data: { email, password: PASSWORD },
    });
    await phone.goto("/");

    await expect(
      phone.getByRole("heading", { name: "どちらのキャラクターで続ける？" }),
    ).toBeVisible();
    await phone.getByRole("button", { name: "ブラウザ で続ける" }).click();
    await phone
      .getByRole("button", { name: "アカウント を消して ブラウザ で続ける" })
      .click();

    await expect(phone.getByText("ブラウザで書いた日記")).toBeVisible();
    expect(await storedInBrowser(phone)).toBeNull();
    await page.reload();
    await expect(page.getByText("ブラウザで書いた日記")).toBeVisible();
    await other.close();
  });

  test("AC-25, AC-26, AC-27: 退会すると、名前を付ける画面になり、同じアドレスでまた作ると空のアカウントになる", async ({
    page,
  }) => {
    const email = await signUp(page);
    await page.goto("/");
    await nameCharacter(page, "やめるぴよ");
    await writeDiary(page, "退会で消える日記");
    await expect(page.getByText("退会で消える日記")).toBeVisible();

    await page.goto("/account");
    await page.getByRole("button", { name: "退会する" }).click();
    const dialog = page.getByRole("dialog", { name: "退会する？" });
    await expect(dialog).toContainText(
      "やめるぴよ（Lv. 1）と日記 1 件が、すべて消えるよ。",
    );
    await dialog.getByRole("button", { name: "退会する" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByLabel("名前（10 文字まで）")).toBeVisible();

    // The same address can sign up again: the old account is gone.
    const again = await page.request.post("/api/auth/sign-up/email", {
      data: { email, password: PASSWORD, name: "e2e" },
    });
    expect(again.ok()).toBe(true);
    await page.goto("/");
    await expect(page.getByLabel("名前（10 文字まで）")).toBeVisible();
    await expect(page.getByText("やめるぴよ")).toHaveCount(0);
  });

  test("AC-23: ログアウトすると、ホームでも振り返りでも、前のアカウントの日記もキャラクターも見えない", async ({
    page,
  }) => {
    await signUp(page);
    await page.goto("/");
    await nameCharacter(page, "かえるぴよ");
    await writeDiary(page, "ログアウトしたら見えない日記");
    await expect(page.getByText("ログアウトしたら見えない日記")).toBeVisible();

    await page.goto("/account");
    await page.getByRole("button", { name: "ログアウト" }).click();
    await expect(page).toHaveURL(/\/$/);

    await expect(page.getByLabel("名前（10 文字まで）")).toBeVisible();
    await expect(page.getByText("かえるぴよ")).toHaveCount(0);
    await page.goto("/history");
    await expect(page.getByText("ホームで名前を付けてね")).toBeVisible();
    await expect(page.getByText("ログアウトしたら見えない日記")).toHaveCount(0);
    expect(await storedInBrowser(page)).toBeNull();
  });
});

test("AC-2: ログインしていないアカウントの画面に、ログインで何ができるかと Google のボタンが出る", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: /アカウント/ }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(
    page.getByText(
      /スマホでも PC でも、同じキャラクターと日記で続きが書けるよ/,
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Google でログイン" }),
  ).toBeVisible();
});

test("AC-5: ログインに失敗して戻ってきたときは、失敗のお知らせが出る", async ({
  page,
}) => {
  await page.goto("/account?error=login");

  // Next.js also has an empty role="alert" route announcer on the page.
  await expect(
    page.getByRole("alert").filter({ hasText: "ログインできなかった" }),
  ).toBeVisible();
});

test("AC-4, AC-6, AC-22, AC-24: ログインするとメールアドレスが出て、開き直しても続き、ログアウトしてまたログインできる", async ({
  page,
}) => {
  const email = newEmail();
  // page.request shares cookies with the page, like a real sign-in.
  const signUp = await page.request.post("/api/auth/sign-up/email", {
    data: { email, password: PASSWORD, name: "e2e" },
  });
  expect(signUp.ok()).toBe(true);

  await page.goto("/account");
  await expect(page.getByText("ログイン中")).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();

  await page.reload();
  await expect(page.getByText(email)).toBeVisible();

  await page.getByRole("button", { name: "ログアウト" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/account");
  await expect(
    page.getByRole("button", { name: "Google でログイン" }),
  ).toBeVisible();

  const signIn = await page.request.post("/api/auth/sign-in/email", {
    data: { email, password: PASSWORD },
  });
  expect(signIn.ok()).toBe(true);
  await page.goto("/account");
  await expect(page.getByText(email)).toBeVisible();
});

test("AC-34: ログインしても、Google の表示名は保存されず、画面にも出ない", async ({
  page,
}) => {
  const email = newEmail();
  await page.request.post("/api/auth/sign-up/email", {
    data: { email, password: PASSWORD, name: "山田 ぴよ" },
  });

  const session = await page.request.get("/api/auth/get-session");
  const body = await session.json();

  expect(body.user.email).toBe(email);
  expect(body.user.name).toBe("");
  expect(body.user.image ?? null).toBeNull();
  await page.goto("/account");
  await expect(page.getByText("山田 ぴよ")).toHaveCount(0);
});
