import "server-only";

import { sendNotification } from "web-push";

import type { Sender } from "./send-reminders";

/** The server's key pair for signing what it sends (ADR-0007). */
export type VapidKeys = { publicKey: string; privateKey: string };

/** Whom push services contact about this sender: not a personal address. */
const SUBJECT = "https://github.com/Kenta13912000/logling/issues";

/** How long a push service keeps a reminder for a device that is off. */
const TTL_SECONDS = 60 * 60;

/** Sends through web-push; a 404 or 410 means the address is gone (AC-17). */
export function createWebPushSender(keys: VapidKeys): Sender {
  return async (target, message) => {
    try {
      await sendNotification(target, JSON.stringify(message), {
        TTL: TTL_SECONDS,
        vapidDetails: {
          subject: SUBJECT,
          publicKey: keys.publicKey,
          privateKey: keys.privateKey,
        },
      });
      return "sent";
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      return status === 404 || status === 410 ? "gone" : "failed";
    }
  };
}
