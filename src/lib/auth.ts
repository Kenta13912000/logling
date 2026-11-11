import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { getDb } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";

import { buildAuthOptions } from "./auth-options";

function createAuth() {
  return betterAuth({
    ...buildAuthOptions(process.env),
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    // Must stay last: sets cookies from Server Actions (Better Auth docs).
    plugins: [nextCookies()],
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

/**
 * The Better Auth server. Created on first use so builds without secrets
 * (CI, preview deployments) do not fail. Reads BETTER_AUTH_SECRET and
 * BETTER_AUTH_URL from the environment.
 */
export function getAuth() {
  auth ??= createAuth();
  return auth;
}
