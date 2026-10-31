import { expect, test, type Request } from "@playwright/test";

const DIARY_TEXT = "だれにも見せない日記 release-check";

test("AC-8: 名前を付けて日記を保存するまで、同じオリジン以外へ通信せず、日記の本文も送らない", async ({
  page,
}) => {
  const requests: Request[] = [];
  page.on("request", (request) => requests.push(request));

  await page.goto("/");
  const origin = new URL(page.url()).origin;

  await page.getByLabel("名前（10 文字まで）").fill("ぴよ");
  await page.getByRole("button", { name: "この名前にする" }).click();
  await page.getByRole("button", { name: "これにする" }).click();
  await page.getByRole("textbox", { name: "今日の日記" }).fill(DIARY_TEXT);
  await page.getByRole("button", { name: "日記をのこす" }).click();
  await expect(page.getByText(DIARY_TEXT)).toBeVisible();

  const network = requests.filter((request) => /^https?:/.test(request.url()));
  expect(network.length).toBeGreaterThan(0);
  for (const request of network) {
    expect(new URL(request.url()).origin, request.url()).toBe(origin);
    expect(request.postData() ?? "").not.toContain(DIARY_TEXT);
  }
});

test("AC-9: ページが読み込むスクリプトは、すべて同じオリジンから", async ({
  page,
}) => {
  await page.goto("/");
  const origin = new URL(page.url()).origin;

  const sources = await page
    .locator("script[src]")
    .evaluateAll((scripts) =>
      scripts.map((script) => (script as HTMLScriptElement).src),
    );

  expect(sources.length).toBeGreaterThan(0);
  for (const source of sources) {
    expect(new URL(source).origin, source).toBe(origin);
  }
});

test("AC-10: トップページの応答に、基本的なセキュリティの設定が付いている", async ({
  page,
}) => {
  const response = await page.goto("/");
  expect(response).not.toBeNull();
  const headers = response!.headers();

  expect(headers["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});
