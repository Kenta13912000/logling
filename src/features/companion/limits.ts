import { DAY_START_HOUR } from "@/lib/diary-date";

/** Comments one person can ask for in one day, retries included (AC-14). */
export const DAILY_COMMENT_LIMIT = 3;

/** The whole app's monthly budget: $5 in millionths of a dollar (AC-15). */
export const MONTHLY_BUDGET_MICRO_USD = 5_000_000;

/** What the AI's reply used, in tokens. */
export type CommentUsage = { inputTokens: number; outputTokens: number };

/**
 * Claude Haiku 5.5 per token in millionths of a dollar: $0.10 and $0.50
 * per million input and output tokens (ADR-0009).
 */
const MICRO_USD_PER_INPUT_TOKEN = 0.1;
const MICRO_USD_PER_OUTPUT_TOKEN = 0.5;

/** Cost of one request in millionths of a dollar, rounded up. */
export function costMicroUsd(usage: CommentUsage): number {
  // Whole tenths first, so 0.1 + 0.5 adds up without floating-point dust.
  const tenths =
    usage.inputTokens * MICRO_USD_PER_INPUT_TOKEN * 10 +
    usage.outputTokens * MICRO_USD_PER_OUTPUT_TOKEN * 10;
  return Math.ceil(Math.round(tenths) / 10);
}

/** Japan has no daylight saving time, so its offset is always 9 hours. */
const JAPAN_OFFSET_MS = 9 * 60 * 60 * 1000;

const pad = (value: number) => String(value).padStart(2, "0");

/** `now` moved so its UTC fields read as Japan time minus `hours`. */
function japanTime(now: Date, hours = 0): Date {
  return new Date(now.getTime() + JAPAN_OFFSET_MS - hours * 60 * 60 * 1000);
}

/** The day (Japan time, split at 4 AM like diary days) for the daily count. */
export function usageDay(now: Date): string {
  const time = japanTime(now, DAY_START_HOUR);
  return `${time.getUTCFullYear()}-${pad(time.getUTCMonth() + 1)}-${pad(time.getUTCDate())}`;
}

/** The month (Japan time, "YYYY-MM") for the monthly budget. */
export function usageMonth(now: Date): string {
  const time = japanTime(now);
  return `${time.getUTCFullYear()}-${pad(time.getUTCMonth() + 1)}`;
}
