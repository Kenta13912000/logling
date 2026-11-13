import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

test("AC-9, AC-18, AC-20: ログインしていないと「ログインすると使えるよ」。ページを見ただけでは、お知らせのしくみは登録されない。/sw.js は毎回取り直す設定で届く", async ({
  page,
}) => {
  for (const path of ["/", "/history", "/more", "/settings"]) {
    await page.goto(path);
  }
  const reminder = page.getByRole("region", { name: "お知らせ" });
  await expect(reminder).toContainText("ログインすると使えるよ");
  await expect(
    page.getByRole("switch", { name: "書き忘れのお知らせ" }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistration()) ?? null,
    ),
  ).toBeNull();

  const sw = await page.request.get("/sw.js");
  expect(sw.ok()).toBe(true);
  expect(sw.headers()["content-type"]).toContain("javascript");
  expect(sw.headers()["cache-control"]).toContain("no-cache");
});

test.describe("ログインしたとき", () => {
  test.skip(
    !!process.env.BASE_URL,
    "テスト用のログインは、手元の開発サーバーでだけ使える",
  );

  test("AC-6: 「設定」の「書き忘れのお知らせ」は、はじめはオフで、押せる", async ({
    page,
  }) => {
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const response = await page.request.post("/api/auth/sign-up/email", {
      data: { email, password: "e2e-password-123", name: "e2e" },
    });
    expect(response.ok()).toBe(true);

    await page.goto("/settings");
    const toggle = page.getByRole("switch", { name: "書き忘れのお知らせ" });
    await expect(toggle).toBeEnabled();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect(page.getByRole("combobox", { name: "時刻" })).toHaveCount(0);
  });
});

test.describe("スマホの幅（375px）", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("AC-4, AC-21: 「その他」→「設定」で、ホーム画面に追加する手順が見え、横スクロールが出ない", async ({
    page,
  }) => {
    await page.goto("/more");
    await expect(
      page.getByRole("heading", { level: 1, name: "その他" }),
    ).toBeVisible();
    await page.getByRole("link", { name: /設定/ }).click();

    await expect(page).toHaveURL(/\/settings$/);
    const install = page.getByRole("region", { name: "ホーム画面に追加" });
    await expect(install).toContainText(
      "ホーム画面に追加すると、アプリのように開けるよ",
    );
    await expect(install.getByText("iPhone（Safari）")).toBeVisible();
    await expect(install.getByText("Android（Chrome）")).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});

test("AC-1, AC-2: ページにマニフェストと iPhone 用の設定・アイコンがあり、マニフェストとアイコンが届く", async ({
  page,
}) => {
  await page.goto("/");

  // iPhone: a home screen web app named logling, with its own icon.
  await expect(
    page.locator('meta[name="apple-mobile-web-app-title"]'),
  ).toHaveAttribute("content", "logling");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#fff8ec",
  );
  const appleIcon = await page
    .locator('link[rel="apple-touch-icon"]')
    .getAttribute("href");
  const pngFavicon = await page
    .locator('link[rel="icon"][type="image/png"]')
    .getAttribute("href");

  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).not.toBeNull();
  const response = await page.request.get(href!);
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    name: "logling",
    display: "standalone",
    start_url: "/",
  });

  const icons: string[] = [
    ...manifest.icons.map((icon: { src: string }) => icon.src),
    appleIcon,
    pngFavicon,
  ];
  expect(icons).toHaveLength(5);
  for (const src of icons) {
    const icon = await page.request.get(src);
    expect(icon.ok(), src).toBe(true);
    expect(icon.headers()["content-type"], src).toBe("image/png");
  }
});
