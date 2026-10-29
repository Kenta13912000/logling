import { expect, test, type Page } from "@playwright/test";

// Phone width from SC-6. Each test starts with empty browser storage.
test.use({ viewport: { width: 375, height: 667 } });

const STORAGE_KEY = "logling:v1";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

async function nameCharacter(page: Page, name = "ぴよ") {
  await page.getByLabel("名前（10 文字まで）").fill(name);
  await page.getByRole("button", { name: "この名前にする" }).click();
  await page.getByRole("button", { name: "これにする" }).click();
}

async function writeDiary(page: Page, text: string) {
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

test("AC-18, AC-23: 幅 375px で、名前を付けてから日記を保存するまでの操作ができる", async ({
  page,
}) => {
  await page.getByLabel("名前（10 文字まで）").fill("ぴよ");
  await page.getByRole("button", { name: "この名前にする" }).click();
  await expect(page.getByText("「ぴよ」でいい？")).toBeVisible();
  await page.getByRole("button", { name: "これにする" }).click();

  await expect(page.getByText("Lv. 1")).toBeVisible();
  await writeDiary(page, "晴れた。\n公園を歩いた。");

  await expect(page.getByText("✨ +10 経験値！")).toBeVisible();
  await expect(page.getByText("10 / 30")).toBeVisible();
  await expect(
    page.getByText("今日も書いてくれてありがとう！また明日ね"),
  ).toBeVisible();
});

test("AC-19: 長い名前や長い日記でも、どの画面でも横スクロールが出ない", async ({
  page,
}) => {
  await expectNoHorizontalScroll(page);

  await page.getByLabel("名前（10 文字まで）").fill("ああああああああああ");
  await page.getByRole("button", { name: "この名前にする" }).click();
  await expectNoHorizontalScroll(page);

  await page.getByRole("button", { name: "これにする" }).click();
  await expectNoHorizontalScroll(page);

  const longText = `${"a".repeat(300)}${"あ".repeat(300)}`;
  await page.getByRole("textbox", { name: "今日の日記" }).fill(longText);
  await expectNoHorizontalScroll(page);

  await page.getByRole("button", { name: "日記をのこす" }).click();
  await expect(
    page.getByText("今日も書いてくれてありがとう！また明日ね"),
  ).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test("AC-20: ページの言語は日本語で、タブのタイトルは logling", async ({
  page,
}) => {
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page).toHaveTitle("logling");
});

test("AC-16: 再読み込みしても、名前・経験値・今日の日記が残っている", async ({
  page,
}) => {
  await nameCharacter(page);
  await writeDiary(page, "晴れた。");

  await page.reload();

  await expect(page.getByText("ぴよ")).toBeVisible();
  await expect(page.getByText("10 / 30")).toBeVisible();
  await expect(page.getByText("晴れた。")).toBeVisible();
});

test("AC-12: レベルアップのお知らせは「とじる」にフォーカスがあり、Esc キーでも閉じられる", async ({
  page,
}) => {
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        character: { name: "ぴよ", totalExp: 20 },
        entries: [],
      }),
    ],
  );
  await page.reload();

  await writeDiary(page, "晴れた。");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("ぴよ が レベル 2 になった！");
  await expect(page.getByRole("button", { name: "とじる" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Lv. 2")).toBeVisible();
});
