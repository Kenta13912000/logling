import {
  getReminder,
  removeReminder,
  saveReminder,
  type ReminderResult,
} from "./actions";

/*
 * The browser side of reminders: permission, the service worker, the push
 * subscription, and the Server Actions that store it (ADR-0007).
 */

/** A reminder action's result, or the browser's permission was not given. */
export type ClientResult =
  ReminderResult | { ok: false; reason: "denied" | "dismissed" };

const FAILED: ClientResult = { ok: false, reason: "failed" };

/** The server's public key (VAPID). Missing on preview deployments. */
const publicKey = () => process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** Push, notifications and service workers exist here, and a key is set. */
export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    publicKey().length > 0
  );
}

/** The browser's notification permission, or "default" without one. */
export function notificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "default";
  }
  return window.Notification.permission;
}

/** base64url → bytes, the form `subscribe` takes the public key in. */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

const deviceTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** This device's subscription, without registering anything. */
async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

function save(subscription: PushSubscription, minute: number) {
  return saveReminder({
    subscription: subscription.toJSON(),
    minute,
    timeZone: deviceTimeZone(),
  }).catch(() => FAILED);
}

/** This device's reminder time, or null when it is off here (AC-6). */
export async function loadReminder(): Promise<ClientResult> {
  try {
    const subscription = await currentSubscription();
    if (subscription === null) {
      return { ok: true, minute: null };
    }
    return await getReminder(subscription.endpoint);
  } catch {
    return FAILED;
  }
}

/**
 * Asks for permission (only now, on the person's tap), registers the
 * service worker, subscribes this device and saves `minute` (AC-6). If
 * saving fails, the subscription is dropped again so nothing is half on.
 */
export async function turnOn(minute: number): Promise<ClientResult> {
  try {
    const permission = await window.Notification.requestPermission();
    if (permission !== "granted") {
      return {
        ok: false,
        reason: permission === "denied" ? "denied" : "dismissed",
      };
    }
    await navigator.serviceWorker.register("/sw.js");
    const registration = await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(publicKey()),
      }));
    const result = await save(subscription, minute);
    if (!result.ok) {
      await subscription.unsubscribe().catch(() => false);
    }
    return result;
  } catch {
    return FAILED;
  }
}

/** Saves a new time for this device (AC-7). */
export async function changeTime(minute: number): Promise<ClientResult> {
  try {
    const subscription = await currentSubscription();
    return subscription === null ? FAILED : await save(subscription, minute);
  } catch {
    return FAILED;
  }
}

/**
 * Forgets this device on the server, then drops its subscription (AC-15).
 * If the server could not be reached, it stays on, as the screen says.
 */
export async function turnOff(): Promise<ClientResult> {
  try {
    const subscription = await currentSubscription();
    if (subscription === null) {
      return { ok: true, minute: null };
    }
    const result = await removeReminder(subscription.endpoint).catch(
      () => FAILED,
    );
    if (result.ok) {
      await subscription.unsubscribe().catch(() => false);
    }
    return result;
  } catch {
    return FAILED;
  }
}
