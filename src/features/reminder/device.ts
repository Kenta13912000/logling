import { removeReminder } from "./actions";

/**
 * Stops reminders on this device before signing out (AC-16): forgets its
 * address on the server and drops the browser's own subscription, so the
 * address stops working even if the server could not be reached (the
 * server then deletes it the next time it tries to send: AC-17).
 *
 * Uses getRegistration, not `ready`: `ready` never settles in a browser
 * that has no service worker, which would block signing out.
 */
export async function forgetThisDevice(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) {
    return;
  }
  await removeReminder(subscription.endpoint).catch(() => undefined);
  await subscription.unsubscribe().catch(() => false);
}
