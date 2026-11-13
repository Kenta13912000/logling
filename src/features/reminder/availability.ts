/** Whether reminders can be used here, or why not (AC-9). */
export type Availability =
  | "checking"
  | "signedOut"
  | "denied"
  | "available"
  | "needsHomeScreen"
  | "unsupported";

export type AvailabilityInput = {
  session: "checking" | "signedIn" | "signedOut";
  /** The browser has push, notifications and service workers (and a key). */
  pushSupported: boolean;
  permission: NotificationPermission;
  /** An iPhone or iPad, where push needs the home screen. */
  iosDevice: boolean;
  /** Opened from the home screen. */
  standalone: boolean;
};

export function reminderAvailability(input: AvailabilityInput): Availability {
  // Bolt-4 ⑥: placeholder until ⑦ fills it in.
  void input;
  return "unsupported";
}

/** iPhone or iPad, including iPads that say they are a Mac. */
export function isIosDevice(nav: {
  userAgent: string;
  maxTouchPoints: number;
}): boolean {
  // Bolt-4 ⑥: placeholder until ⑦ fills it in.
  void nav;
  return false;
}
