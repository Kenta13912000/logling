import type { ReminderResult } from "./actions";

/** A reminder action's result, or the browser's permission was not given. */
export type ClientResult =
  ReminderResult | { ok: false; reason: "denied" | "dismissed" };

/** Push, notifications and service workers exist here, and a key is set. */
export function pushSupported(): boolean {
  // Bolt-4 ⑥: placeholder until ⑦ fills it in.
  return false;
}

/** The browser's notification permission, or "default" without one. */
export function notificationPermission(): NotificationPermission {
  // Bolt-4 ⑥: placeholder until ⑦ fills it in.
  return "default";
}

/** This device's reminder time, or null when it is off here. */
export async function loadReminder(): Promise<ClientResult> {
  // Bolt-4 ⑥: placeholder until ⑦ fills it in.
  return { ok: false, reason: "failed" };
}

/** Asks for permission, subscribes this device and saves `minute`. */
export async function turnOn(minute: number): Promise<ClientResult> {
  // Bolt-4 ⑥: placeholder until ⑦ fills it in.
  void minute;
  return { ok: false, reason: "failed" };
}

/** Saves a new time for this device. */
export async function changeTime(minute: number): Promise<ClientResult> {
  // Bolt-4 ⑥: placeholder until ⑦ fills it in.
  void minute;
  return { ok: false, reason: "failed" };
}

/** Forgets this device on the server, then drops its subscription. */
export async function turnOff(): Promise<ClientResult> {
  // Bolt-4 ⑥: placeholder until ⑦ fills it in.
  return { ok: false, reason: "failed" };
}
