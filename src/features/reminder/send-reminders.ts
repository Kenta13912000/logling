import type { Db } from "@/lib/db/types";

import type { PushTarget } from "./validate";

/** What a reminder says. Never the diary itself (AC-11). */
export type PushMessage = { title: string; body: string; url: string };

/** How one send went: delivered, the address is gone, or another failure. */
export type SendResult = "sent" | "gone" | "failed";

export type Sender = (
  target: PushTarget,
  message: PushMessage,
) => Promise<SendResult>;

/** Counts only: never addresses, names or diaries. */
export type SendSummary = {
  sent: number;
  written: number;
  removed: number;
  failed: number;
};

/** The reminder text: with the character's name once there is one. */
export function reminderMessage(name: string | null): PushMessage {
  // Bolt-5 ⑥: placeholder until ⑦ fills it in.
  void name;
  return { title: "", body: "", url: "" };
}

/** Sends every reminder that is due now (AC-11 to AC-13, AC-17). */
export async function sendDueReminders(
  db: Db,
  now: Date,
  send: Sender,
): Promise<SendSummary> {
  // Bolt-5 ⑥: placeholder until ⑦ fills it in.
  void [db, now, send];
  return { sent: 0, written: 0, removed: 0, failed: 0 };
}
