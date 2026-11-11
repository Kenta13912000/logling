// @vitest-environment node
import { describe, expect, test } from "vitest";

import { buildAuthOptions, type AuthEnv } from "./auth-options";

const ENV: AuthEnv = {
  NODE_ENV: "production",
  GOOGLE_CLIENT_ID: "client-id",
  GOOGLE_CLIENT_SECRET: "client-secret",
};

const DAY = 60 * 60 * 24;

describe("ログインの有効期間", () => {
  test("AC-6: ログインは 60 日もち、使うと 1 日に 1 回延びる", () => {
    const { session } = buildAuthOptions(ENV);

    expect(session?.expiresIn).toBe(60 * DAY);
    expect(session?.updateAge).toBe(DAY);
  });
});

describe("Google でのログイン", () => {
  test("AC-3: Google のログインは、毎回アカウントを選ぶ画面を出す", () => {
    const { socialProviders } = buildAuthOptions(ENV);

    expect(socialProviders?.google).toMatchObject({
      clientId: "client-id",
      clientSecret: "client-secret",
      prompt: "select_account",
    });
  });

  test("ADR-0006: アカウントを作るときも変えるときも、Google のトークンを保存しない", async () => {
    const hooks = buildAuthOptions(ENV).databaseHooks?.account;
    const tokens = {
      accessToken: "ya29.access",
      refreshToken: "1//refresh",
      idToken: "eyJ.id.token",
    };

    const created = await hooks?.create?.before?.({
      id: "acc-1",
      userId: "user-a",
      providerId: "google",
      accountId: "google-sub-123",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...tokens,
    });
    const updated = await hooks?.update?.before?.(tokens);

    for (const result of [created, updated]) {
      expect(result).toMatchObject({
        data: { accessToken: null, refreshToken: null, idToken: null },
      });
    }
  });

  test("ADR-0006: 人を作るときも変えるときも、Google の表示名とアイコンを保存しない", async () => {
    const hooks = buildAuthOptions(ENV).databaseHooks?.user;
    const profile = {
      name: "山田 ぴよ",
      image: "https://lh3.googleusercontent.com/a/photo",
    };

    const created = await hooks?.create?.before?.({
      id: "user-a",
      email: "piyo@example.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...profile,
    });
    const updated = await hooks?.update?.before?.(profile);

    for (const result of [created, updated]) {
      expect(result).toMatchObject({ data: { name: "", image: null } });
    }
  });
});

describe("テスト用のログイン", () => {
  test("ADR-0006: 本番では、テスト用の印があってもメールアドレスとパスワードでのログインは無効", () => {
    const options = buildAuthOptions({ ...ENV, LOGLING_E2E_AUTH: "1" });

    expect(options.emailAndPassword?.enabled ?? false).toBe(false);
  });

  test("ADR-0006: 開発でも、テスト用の印がなければ無効", () => {
    const options = buildAuthOptions({ ...ENV, NODE_ENV: "development" });

    expect(options.emailAndPassword?.enabled ?? false).toBe(false);
  });

  test("ADR-0006: 本番でなく、テスト用の印があるときだけ有効", () => {
    const options = buildAuthOptions({
      ...ENV,
      NODE_ENV: "development",
      LOGLING_E2E_AUTH: "1",
    });

    expect(options.emailAndPassword?.enabled).toBe(true);
  });
});

describe("そのほかの設定", () => {
  test("ADR-0005: Better Auth の利用状況は送らない", () => {
    expect(buildAuthOptions(ENV).telemetry?.enabled).toBe(false);
  });
});
