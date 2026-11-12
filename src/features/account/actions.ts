"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { user } from "@/lib/db/schema";

export type WithdrawResult =
  { ok: true } | { ok: false; reason: "unauthorized" | "reauth" | "failed" };

/**
 * How recent the sign-in must be to withdraw: the same rule as Better
 * Auth's own account deletion (session.freshAge, 1 day by default).
 */
const FRESH_MS = 24 * 60 * 60 * 1000;

/**
 * Deletes the signed-in person's account (AC-26). The person row is deleted
 * with one statement; the database cascades it to sessions, Google account
 * links, the character and every entry, so nothing is half deleted (AC-28).
 * Better Auth's deleteUser removes those in separate steps, so it is not
 * used here. The browser signs out afterwards to clear its cookie.
 */
export async function withdrawAccount(): Promise<WithdrawResult> {
  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return { ok: false, reason: "unauthorized" };
    }
    // A device left signed in must not delete everything (AC-25).
    const signedInAt = new Date(session.session.createdAt).getTime();
    if (Date.now() - signedInAt >= FRESH_MS) {
      return { ok: false, reason: "reauth" };
    }
    await getDb().delete(user).where(eq(user.id, session.user.id));
    return { ok: true };
  } catch (error) {
    // Never log the error itself: a failed query can carry personal data.
    console.error("withdraw failed:", (error as Error).name);
    return { ok: false, reason: "failed" };
  }
}
