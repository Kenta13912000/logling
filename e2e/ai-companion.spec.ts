import { expect, test, type Page } from "@playwright/test";

/*
 * ai-companion with the test login (ADR-0006). The E2E dev server has no
 * Anthropic key, so the fake generator answers with TEST_COMMENT and
 * nothing is sent to the AI service (ADR-0009).
 */
test.skip(
  !!process.env.BASE_URL,
  "テスト用のログインは、手元の開発サーバーでだけ使える",
);
test.use({ viewport: { width: 375, height: 667 } });

const TEST_COMMENT = "（テスト）書いてくれてありがとう！";
const PASSWORD = "e2e-password-123";

const main = (page: Page) => page.getByRole("main");

async function signUpAndName(page: Page) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const response = await page.request.post("/api/auth/sign-up/email", {
    data: { email, password: PASSWORD, name: "e2e" },
  });
  expect(response.ok()).toBe(true);
  await page.goto("/");
  await page.getByLabel("名前（10 文字まで）").fill("ちびすけ");
  await page.getByRole("button", { name: "この名前にする" }).click();
  await page.getByRole("button", { name: "これにする" }).click();
  await expect(main(page).getByText("ちびすけ", { exact: true })).toBeVisible();
}

async function turnOn(page: Page) {
  await page.goto("/settings");
  const toggle = page.getByRole("switch", { name: "日記へのコメント" });
  await expect(toggle).toBeEnabled();
  await toggle.click();
  await page.getByRole("button", { name: "オンにする" }).click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
}

test("AC-2, AC-5, AC-10: 「設定」でオンにして日記を書くと、本文の下にコメントが出て、開き直しても振り返りにも出る", async ({
  page,
}) => {
  await signUpAndName(page);
  await turnOn(page);

  await page.goto("/");
  await page
    .getByRole("textbox", { name: "今日の日記" })
    .fill("発表があって緊張した。");
  await page.getByRole("button", { name: "日記をのこす" }).click();

  await expect(main(page).getByText(TEST_COMMENT)).toBeVisible();
  await expect(main(page).getByText("ちびすけより")).toBeVisible();

  await page.reload();
  await expect(main(page).getByText(TEST_COMMENT)).toBeVisible();

  await page.goto("/history");
  await expect(main(page).getByText(TEST_COMMENT)).toBeVisible();
});

test("AC-9: オフのままなら、日記を書いても吹き出しは出ない", async ({
  page,
}) => {
  await signUpAndName(page);

  await page
    .getByRole("textbox", { name: "今日の日記" })
    .fill("オフのまま書いた日記");
  await page.getByRole("button", { name: "日記をのこす" }).click();

  await expect(main(page).getByText("オフのまま書いた日記")).toBeVisible();
  await expect(main(page).getByText(/が読んでいるよ/)).toHaveCount(0);
  await expect(main(page).getByText(TEST_COMMENT)).toHaveCount(0);
});
