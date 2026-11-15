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
 * The comment generator for this server: a fixed fake on the E2E test
 * server (test login on, even with a key, since it reads the same
 * .env.local: no cost, same answer every time), Claude when the API key is
 * set, else none (comments cannot be made, AC-13). The test login never
 * runs in production (ADR-0006).
 */
export function getCommentGenerator(
  env: Record<string, string | undefined> = process.env,
): CommentGenerator | null {
  if (env.LOGLING_E2E_AUTH === "1") {
    return fakeGenerator;
  }
  const apiKey = env.ANTHROPIC_API_KEY;
  if (apiKey) {
    // Wait up to 20 seconds and retry once (ADR-0009).
    return createClaudeGenerator(
      new Anthropic({ apiKey, timeout: 20_000, maxRetries: 1 }),
    );
  }
  return null;
}
