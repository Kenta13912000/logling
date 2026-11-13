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

/**
 * Signing in comes first: reminders are for signed-in people only, and the
 * other reasons do not matter until then.
 */
export function reminderAvailability(input: AvailabilityInput): Availability {
  if (input.session !== "signedIn") {
    return input.session;
  }
  if (input.pushSupported) {
    return input.permission === "denied" ? "denied" : "available";
  }
  // Safari on iPhone and iPad has push only for home screen web apps.
  return input.iosDevice && !input.standalone
    ? "needsHomeScreen"
    : "unsupported";
}

/** iPhone or iPad, including iPads that say they are a Mac. */
export function isIosDevice(nav: {
  userAgent: string;
  maxTouchPoints: number;
}): boolean {
  if (/iPhone|iPad|iPod/.test(nav.userAgent)) {
    return true;
  }
  return /Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1;
}
