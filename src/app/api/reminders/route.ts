import { timingSafeEqual } from "node:crypto";

import { sendDueReminders } from "@/features/reminder/send-reminders";
import { createWebPushSender } from "@/features/reminder/web-push-sender";
import { getDb } from "@/lib/db/client";

/** Vercel requires CRON_SECRET to be at least this long (ADR-0007). */
const MIN_SECRET_LENGTH = 16;

/**
 * Vercel Schedules sends `Authorization: Bearer <CRON_SECRET>`. Compared in
 * constant time, so the answer time reveals nothing about the secret.
 */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < MIN_SECRET_LENGTH) {
    return false;
  }
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Called every 30 minutes by Vercel Schedules (vercel.json, ADR-0007) to
 * send the reminders that are due. Logs counts only.
 */
export async function POST(request: Request): Promise<Response> {
  if (!authorized(request)) {
    return new Response(null, { status: 401 });
  }
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
  if (!publicKey || !privateKey) {
    console.error("reminders: push keys are not set");
    return new Response(null, { status: 503 });
  }
  try {
    const summary = await sendDueReminders(
      getDb(),
      new Date(),
      createWebPushSender({ publicKey, privateKey }),
    );
    console.log("reminders:", JSON.stringify(summary));
    return Response.json(summary);
  } catch (error) {
    // Never log the error itself: it can carry an address or a name.
    console.error("reminders failed:", (error as Error).name);
    return new Response(null, { status: 500 });
  }
}
