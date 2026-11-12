import { existsSync } from "node:fs";

import { neon } from "@neondatabase/serverless";

/**
 * Removes the people the E2E tests created with the test-only login
 * (ADR-0006) from the Neon dev branch. Only addresses like
 * e2e-…@example.com are touched: example.com is reserved for examples, so
 * no real person has one. Their diaries go too (cascade).
 */
export default async function globalTeardown() {
  // Never against a deployed site, and only with the local dev settings.
  if (process.env.BASE_URL || !existsSync(".env.local")) {
    return;
  }
  process.loadEnvFile(".env.local");
  const url = process.env.DATABASE_URL;
  if (!url) {
    return;
  }
  const sql = neon(url);
  const removed = await sql.query(
    `delete from "user" where email like 'e2e-%@example.com' returning id`,
  );
  console.log(`E2E のテスト用の人を ${removed.length} 人片付けた`);
}
