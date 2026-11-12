import { expect, test, type Page } from "@playwright/test";

// Phone width (SC-9). Each test starts with empty browser storage, so the
// character has no name yet (AC-12).
test.use({ viewport: { width: 375, height: 667 } });

const menu = (page: Page) =>
  page.getByRole("navigation", { name: "メインメニュー" });

const tab = (page: Page, name: string) =>
  menu(page).getByRole("link", { name });

/** Only `name` is marked as the current page, and the top bar is just the name. */
async function expectAt(page: Page, path: RegExp, current: string) {
  await expect(page).toHaveURL(path);
  await expect(tab(page, current)).toHaveAttribute("aria-current", "page");
  await expect(menu(page).locator('[aria-current="page"]')).toHaveCount(1);
  await expect(page.getByRole("banner")).toHaveText("logling");
}

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
