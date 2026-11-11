/*
 * ADR-0006: keep only what logling needs from a Google sign-in. Better Auth
 * calls these right before writing an account or a person to the database.
 */

const NO_TOKENS = {
  accessToken: null,
  refreshToken: null,
  idToken: null,
  accessTokenExpiresAt: null,
  refreshTokenExpiresAt: null,
} as const;

/** Google tokens are never used, so they are never stored. */
export function withoutOAuthTokens<T extends object>(
  account: T,
): T & typeof NO_TOKENS {
  return { ...account, ...NO_TOKENS };
}

/** Only the email is shown, so the Google name and photo are not stored. */
export function withoutProfile<T extends object>(
  user: T,
): T & { name: string; image: null } {
  return { ...user, name: "", image: null };
}
