import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import type { CommentUsage } from "./limits";
import { buildCommentRequest, parseComment } from "./prompt";

/** The model for comments (ADR-0009). */
export const COMMENT_MODEL = "claude-haiku-5-5";

/** Enough for a 100-character comment, with room to spare. */
const MAX_TOKENS = 400;

/** The first request, and one more when the reply breaks the rules. */
const ATTEMPTS = 2;

export type GenerateResult =
  | { ok: true; text: string; usage: CommentUsage }
  | { ok: false; usage: CommentUsage };

/** Makes one comment from the character's name and the entry's body. */
export type CommentGenerator = (input: {
  name: string;
  body: string;
}) => Promise<GenerateResult>;

/**
 * A generator that asks Claude through the official SDK. Network and API
 * errors are thrown; the caller treats them as "could not make" (AC-13).
 */
export function createClaudeGenerator(
  client: Pick<Anthropic, "messages">,
): CommentGenerator {
  return async ({ name, body }) => {
    const { system, userText } = buildCommentRequest(name, body);
    const usage = { inputTokens: 0, outputTokens: 0 };
    // A finished reply that breaks the rules (e.g. says "ぼく") is asked
    // for once more; both requests are counted in the cost.
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const response = await client.messages.create({
        model: COMMENT_MODEL,
        max_tokens: MAX_TOKENS,
        // A short comment needs little thinking: cheaper and faster.
        output_config: { effort: "low" },
        system,
        messages: [{ role: "user", content: userText }],
      });
      usage.inputTokens += response.usage.input_tokens;
      usage.outputTokens += response.usage.output_tokens;
      // Cut off or declined replies are not used, nor asked again.
      if (response.stop_reason !== "end_turn") {
        return { ok: false, usage };
      }
      const text = response.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("");
      const comment = parseComment(text);
      if (comment !== null) {
        return { ok: true, text: comment, usage };
      }
    }
    return { ok: false, usage };
  };
}
