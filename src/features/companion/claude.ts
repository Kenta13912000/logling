import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import type { CommentUsage } from "./limits";

/** The model for comments (ADR-0009). */
export const COMMENT_MODEL = "claude-haiku-5-5";

export type GenerateResult =
  | { ok: true; text: string; usage: CommentUsage }
  | { ok: false; usage: CommentUsage };

/** Makes one comment from the character's name and the entry's body. */
export type CommentGenerator = (input: {
  name: string;
  body: string;
}) => Promise<GenerateResult>;

/** A generator that asks Claude through the official SDK. */
export function createClaudeGenerator(
  client: Pick<Anthropic, "messages">,
): CommentGenerator {
  // Bolt-2 ⑥: placeholder until ⑦ fills it in.
  void client;
  return async () => ({
    ok: false,
    usage: { inputTokens: 0, outputTokens: 0 },
  });
}
