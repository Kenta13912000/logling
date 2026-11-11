import { expect, test } from "@playwright/test";

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

  await expect(page.getByRole("alert")).toContainText("ログインできなかった");
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
