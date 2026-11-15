"use server";

import { headers } from "next/headers";

import { isDiaryDate } from "@/features/cloud/validate";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import type { Db } from "@/lib/db/types";

import type { GenerateResult } from "./claude";
import { getCommentGenerator } from "./generator";
import {
  DAILY_COMMENT_LIMIT,
  MONTHLY_BUDGET_MICRO_USD,
  costMicroUsd,
  usageDay,
  usageMonth,
} from "./limits";
import {
  addComment,
  addMonthlyCost,
  claimDailyUse,
  findCompanionSetting,
  findEntryForComment,
  findMonthlyCost,
  releaseDailyUse,
  saveCompanionSetting,
} from "./repository";

/** Whether this person has comments on (AC-1 to AC-4). */
export type CompanionSettingResult =
  | { ok: true; enabled: boolean }
  | { ok: false; reason: "unauthorized" | "invalid" | "failed" };

/** What asking for a comment on one entry led to (AC-5 to AC-18). */
export type CommentResult =
  | { status: "ok"; comment: string }
  | {
      status:
        | "off"
        | "noEntry"
        | "beforeEnabled"
        | "dailyLimit"
        | "monthlyLimit"
        | "failed"
        | "invalid"
        | "unauthorized";
    };

/**
 * Only the kind of an error, never its message: a failed query or an AI
 * error can carry the diary text, the name or the reply (AC-18).
 */
function errorKind(error: unknown): string {
  const { name, status } = (error ?? {}) as {
    name?: unknown;
    status?: unknown;
  };
  return `${typeof name === "string" ? name : "Error"}${typeof status === "number" ? ` ${status}` : ""}`;
}

/**
 * Runs `task` for the signed-in person. The person comes only from the
 * session on the server, never from what the browser sends (AC-4).
 */
async function asSignedIn<T>(
  task: (db: Db, userId: string) => Promise<T>,
  unauthorized: T,
  failed: T,
): Promise<T> {
  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return unauthorized;
    }
    return await task(getDb(), session.user.id);
  } catch (error) {
    console.error("companion action failed:", errorKind(error));
    return failed;
  }
}

export async function getCompanionSetting(): Promise<CompanionSettingResult> {
  return asSignedIn<CompanionSettingResult>(
    async (db, userId) => ({
      ok: true,
      enabled: (await findCompanionSetting(db, userId)).enabled,
    }),
    { ok: false, reason: "unauthorized" },
    { ok: false, reason: "failed" },
  );
}

/** Turns comments on (after the confirmation, AC-2) or off (AC-3). */
export async function setCompanionEnabled(
  enabled: boolean,
): Promise<CompanionSettingResult> {
  return asSignedIn<CompanionSettingResult>(
    async (db, userId) => {
      if (typeof enabled !== "boolean") {
        return { ok: false, reason: "invalid" };
      }
      const saved = await saveCompanionSetting(db, userId, enabled, new Date());
      return { ok: true, enabled: saved.enabled };
    },
    { ok: false, reason: "unauthorized" },
    { ok: false, reason: "failed" },
  );
}

/**
 * Makes (or returns the existing) comment on the entry for `date`. Only
 * the character's name and the entry's body are sent (AC-16), and only
 * within the daily and monthly limits (AC-14, AC-15).
 */
export async function requestComment(date: string): Promise<CommentResult> {
  return asSignedIn<CommentResult>(
    async (db, userId) => {
      if (!isDiaryDate(date)) {
        return { status: "invalid" };
      }
      const setting = await findCompanionSetting(db, userId);
      if (!setting.enabled || setting.enabledAt === null) {
        return { status: "off" };
      }
      const entry = await findEntryForComment(db, userId, date);
      if (entry === null) {
        return { status: "noEntry" };
      }
      // Entries written before turning comments on are never sent (AC-9).
      if (entry.createdAt < setting.enabledAt) {
        return { status: "beforeEnabled" };
      }
      // One comment per entry, kept even after rewriting (AC-4, AC-11).
      if (entry.comment !== null) {
        return { status: "ok", comment: entry.comment };
      }
      const generate = getCommentGenerator();
      if (generate === null) {
        return { status: "failed" };
      }

      const now = new Date();
      const day = usageDay(now);
      const month = usageMonth(now);
      if (!(await claimDailyUse(db, userId, day, DAILY_COMMENT_LIMIT))) {
        return { status: "dailyLimit" };
      }
      if ((await findMonthlyCost(db, month)) >= MONTHLY_BUDGET_MICRO_USD) {
        await releaseDailyUse(db, userId, day);
        return { status: "monthlyLimit" };
      }

      let result: GenerateResult;
      try {
        // Only the body is sent: the AI took the character's name for the
        // person's and called them by it (fix/companion-name).
        result = await generate({ body: entry.body });
      } catch (error) {
        console.error("companion comment failed:", errorKind(error));
        return { status: "failed" };
      }
      await addMonthlyCost(db, month, costMicroUsd(result.usage));
      if (!result.ok) {
        return { status: "failed" };
      }

      const saved = await addComment(db, userId, date, result.text);
      if (saved === "noEntry") {
        return { status: "noEntry" };
      }
      if (saved === "exists") {
        // Another device kept its comment first: show that one.
        const latest = await findEntryForComment(db, userId, date);
        return latest?.comment
          ? { status: "ok", comment: latest.comment }
          : { status: "failed" };
      }
      return { status: "ok", comment: result.text };
    },
    { status: "unauthorized" },
    { status: "failed" },
  );
}
