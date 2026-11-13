/** A device's push address and keys, as the browser gives them. */
export type PushTarget = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** What saveReminder stores for one device (AC-7, AC-8). */
export type ReminderInput = {
  subscription: PushTarget;
  /** Minutes after midnight: 0 to 1410, every 30. 21:00 is 1260. */
  minute: number;
  /** The device's IANA time zone, such as Asia/Tokyo. */
  timeZone: string;
};

/** The checked input, or null when anything is wrong (ADR-0007). */
export function validateReminder(input: unknown): ReminderInput | null {
  // Bolt-3 ⑥: placeholder until ⑦ fills it in.
  void input;
  return null;
}
