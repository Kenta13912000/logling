"use server";

import { headers } from "next/headers";

import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import type { Db } from "@/lib/db/types";

import { findCompanionSetting, saveCompanionSetting } from "./repository";

/** Whether this person has comments on (AC-1 to AC-4). */
export type CompanionSettingResult =
  | { ok: true; enabled: boolean }
  | { ok: false; reason: "unauthorized" | "invalid" | "failed" };

/**
 * Runs `task` for the signed-in person. The person comes only from the
 * session on the server, never from what the browser sends (AC-4).
 */
async function asSignedIn(
  task: (db: Db, userId: string) => Promise<CompanionSettingResult>,
): Promise<CompanionSettingResult> {
  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return { ok: false, reason: "unauthorized" };
    }
    return await task(getDb(), session.user.id);
  } catch (error) {
    // Never log the error itself: a failed query can carry diary text.
    console.error("companion action failed:", (error as Error).name);
    return { ok: false, reason: "failed" };
  }
}

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

/** Makes (or returns the existing) comment on the entry for `date`. */
export async function requestComment(date: string): Promise<CommentResult> {
  // Bolt-2 ⑥: placeholder until ⑦ fills it in.
  void date;
  return { status: "failed" };
}

export async function getCompanionSetting(): Promise<CompanionSettingResult> {
  return asSignedIn(async (db, userId) => ({
    ok: true,
    enabled: (await findCompanionSetting(db, userId)).enabled,
  }));
}

/** Turns comments on (after the confirmation, AC-2) or off (AC-3). */
export async function setCompanionEnabled(
  enabled: boolean,
): Promise<CompanionSettingResult> {
  return asSignedIn(async (db, userId) => {
    if (typeof enabled !== "boolean") {
      return { ok: false, reason: "invalid" };
    }
    const saved = await saveCompanionSetting(db, userId, enabled, new Date());
    return { ok: true, enabled: saved.enabled };
  });
}
