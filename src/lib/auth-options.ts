import type { BetterAuthOptions } from "better-auth";

import {
  withoutOAuthTokens,
  withoutProfile,
} from "@/features/account/oauth-data";

/** The environment variables the auth settings depend on. */
export type AuthEnv = {
  NODE_ENV?: string;
  LOGLING_E2E_AUTH?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
};

const DAY = 60 * 60 * 24;

/**
 * Better Auth settings without the database, built from the environment so
 * they can be tested on their own (ADR-0006).
 */
export function buildAuthOptions(env: AuthEnv) {
  // The test-only email/password login can never be on in production.
  const testLogin =
    env.LOGLING_E2E_AUTH === "1" && env.NODE_ENV !== "production";

  return {
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
        // Shared devices: always ask which Google account to use.
        prompt: "select_account",
      },
    },
    emailAndPassword: { enabled: testLogin },
    // AC-6: stay signed in for 60 days, extended at most once a day.
    session: { expiresIn: 60 * DAY, updateAge: DAY },
    databaseHooks: {
      account: {
        create: {
          before: async (account) => ({ data: withoutOAuthTokens(account) }),
        },
        update: {
          before: async (account) => ({ data: withoutOAuthTokens(account) }),
        },
      },
      user: {
        create: { before: async (user) => ({ data: withoutProfile(user) }) },
        update: { before: async (user) => ({ data: withoutProfile(user) }) },
      },
    },
    telemetry: { enabled: false },
  } satisfies BetterAuthOptions;
}
