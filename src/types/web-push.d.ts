/*
 * web-push 4.0.0 is an ES module with named exports and ships no type
 * declarations. Only what logling uses is declared here (pwa-reminder
 * Bolt-5, ADR-0007).
 */
declare module "web-push" {
  export type PushSubscription = {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  export type RequestOptions = {
    /** Seconds the push service keeps the message for an offline device. */
    TTL?: number;
    vapidDetails?: { subject: string; publicKey: string; privateKey: string };
  };

  /** Rejects with an error carrying `statusCode` when the service refuses. */
  export function sendNotification(
    subscription: PushSubscription,
    payload?: string,
    options?: RequestOptions,
  ): Promise<{ statusCode: number }>;
}
