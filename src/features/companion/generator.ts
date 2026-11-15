import "server-only";

import type { CommentGenerator } from "./claude";

/** What the E2E test server's fake generator always says. */
export const TEST_COMMENT = "（テスト）書いてくれてありがとう！";

/**
 * The comment generator for this server: Claude when the API key is set,
 * a fixed fake on the E2E test server (test login on, no key), else none
 * (comments cannot be made, AC-13).
 */
export function getCommentGenerator(
  env: Record<string, string | undefined> = process.env,
): CommentGenerator | null {
  // Bolt-2 ⑥: placeholder until ⑦ fills it in.
  void env;
  return null;
}
