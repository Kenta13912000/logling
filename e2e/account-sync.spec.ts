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

test("ADR-0006: ログインしても、Google の表示名は保存されず、画面にも出ない", async ({
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
