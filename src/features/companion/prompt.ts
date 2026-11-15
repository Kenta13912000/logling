/** The longest comment shown (characters as seen). Shorter than the DB's 200. */
export const COMMENT_MAX_CHARS = 150;

/** The rules for every comment (AC-7, AC-8). */
export const SYSTEM_PROMPT = "";

/**
 * The request for one comment: only the character's name and the entry's
 * body are sent (AC-16), each inside its own tag that the text cannot close.
 */
export function buildCommentRequest(
  name: string,
  body: string,
): { system: string; userText: string } {
  // Bolt-2 ⑥: placeholder until ⑦ fills it in.
  void [name, body];
  return { system: SYSTEM_PROMPT, userText: "" };
}

/** The comment to keep, or null when the reply is empty or too long. */
export function parseComment(text: string): string | null {
  // Bolt-2 ⑥: placeholder until ⑦ fills it in.
  void text;
  return null;
}
