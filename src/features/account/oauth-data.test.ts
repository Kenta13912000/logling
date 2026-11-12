import { describe, expect, test } from "vitest";

import { withoutOAuthTokens, withoutProfile } from "./oauth-data";

// ADR-0006: keep only what logling needs from Google.
describe("Google から受け取った情報", () => {
  test("AC-34: アカウントの情報から、Google のトークンと有効期限を外す", () => {
    const account = {
      id: "acc-1",
      userId: "user-a",
      providerId: "google",
      accountId: "google-sub-123",
      accessToken: "ya29.access",
      refreshToken: "1//refresh",
      idToken: "eyJ.id.token",
      accessTokenExpiresAt: new Date("2026-11-11T10:00:00Z"),
      refreshTokenExpiresAt: new Date("2027-11-11T10:00:00Z"),
      scope: "openid,email,profile",
    };

    expect(withoutOAuthTokens(account)).toStrictEqual({
      id: "acc-1",
      userId: "user-a",
      providerId: "google",
      accountId: "google-sub-123",
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      scope: "openid,email,profile",
    });
  });

  test("AC-34: トークンが入っていない変更でも、トークンの項目は空にする", () => {
    expect(withoutOAuthTokens({ scope: "openid" })).toStrictEqual({
      scope: "openid",
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
    });
  });

  test("AC-34: 人の情報から、Google の表示名とアイコンを外し、メールアドレスは残す", () => {
    const user = {
      id: "user-a",
      email: "piyo@example.com",
      name: "山田 ぴよ",
      image: "https://lh3.googleusercontent.com/a/photo",
      emailVerified: true,
    };

    expect(withoutProfile(user)).toStrictEqual({
      id: "user-a",
      email: "piyo@example.com",
      name: "",
      image: null,
      emailVerified: true,
    });
  });
});
