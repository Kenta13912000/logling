/** Comments one person can ask for in one day, retries included (AC-14). */
export const DAILY_COMMENT_LIMIT = 3;

/** The whole app's monthly budget: $5 in millionths of a dollar (AC-15). */
export const MONTHLY_BUDGET_MICRO_USD = 5_000_000;

/** What the AI's reply used, in tokens. */
export type CommentUsage = { inputTokens: number; outputTokens: number };

/**
 * Cost of one request in millionths of a dollar, rounded up. Claude Haiku
 * 5.5: $0.10 per million input tokens and $0.50 per million output tokens.
 */
export function costMicroUsd(usage: CommentUsage): number {
  // Bolt-2 ⑥: placeholder until ⑦ fills it in.
  void usage;
  return 0;
}

/** The day (Japan time, split at 4 AM like diary days) for the daily count. */
export function usageDay(now: Date): string {
  // Bolt-2 ⑥: placeholder until ⑦ fills it in.
  void now;
  return "";
}

/** The month (Japan time, "YYYY-MM") for the monthly budget. */
export function usageMonth(now: Date): string {
  // Bolt-2 ⑥: placeholder until ⑦ fills it in.
  void now;
  return "";
}
