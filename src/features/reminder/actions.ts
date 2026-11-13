"use server";

/**
 * This device's reminder: `minute` is its time, or null when it is off on
 * this device (AC-6 to AC-8, AC-15).
 */
export type ReminderResult =
  | { ok: true; minute: number | null }
  | { ok: false; reason: "unauthorized" | "invalid" | "failed" };

export async function getReminder(endpoint: string): Promise<ReminderResult> {
  // Bolt-3 ⑥: placeholder until ⑦ fills it in.
  void endpoint;
  return { ok: false, reason: "failed" };
}

export async function saveReminder(input: unknown): Promise<ReminderResult> {
  // Bolt-3 ⑥: placeholder until ⑦ fills it in.
  void input;
  return { ok: false, reason: "failed" };
}

export async function removeReminder(
  endpoint: string,
): Promise<ReminderResult> {
  // Bolt-3 ⑥: placeholder until ⑦ fills it in.
  void endpoint;
  return { ok: false, reason: "failed" };
}
