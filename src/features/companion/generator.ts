import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { createClaudeGenerator, type CommentGenerator } from "./claude";

/** What the E2E test server's fake generator always says. */
export const TEST_COMMENT = "（テスト）書いてくれてありがとう！";

const fakeGenerator: CommentGenerator = async () => ({
  ok: true,
  text: TEST_COMMENT,
  usage: { inputTokens: 0, outputTokens: 0 },
});

/**
 * The comment generator for this server: Claude when the API key is set,
 * a fixed fake on the E2E test server (test login on, no key), else none
 * (comments cannot be made, AC-13).
 */
export function getCommentGenerator(
  env: Record<string, string | undefined> = process.env,
): CommentGenerator | null {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (apiKey) {
    // Wait up to 20 seconds and retry once (ADR-0009).
    return createClaudeGenerator(
      new Anthropic({ apiKey, timeout: 20_000, maxRetries: 1 }),
    );
  }
  return env.LOGLING_E2E_AUTH === "1" ? fakeGenerator : null;
}
