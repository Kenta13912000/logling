import "server-only";

import type { Sender } from "./send-reminders";

/** The server's key pair for signing what it sends (ADR-0007). */
export type VapidKeys = { publicKey: string; privateKey: string };

/** Sends through web-push; a 404 or 410 means the address is gone. */
export function createWebPushSender(keys: VapidKeys): Sender {
  // Bolt-5 ⑥: placeholder until ⑦ fills it in.
  void keys;
  return async () => "failed";
}
