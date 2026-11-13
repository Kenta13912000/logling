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

const MAX_ENDPOINT = 2000;

/** Push services' hosts (ADR-0007): Google's exactly, the others by name. */
const EXACT_HOSTS = new Set(["fcm.googleapis.com", "android.googleapis.com"]);
const HOST_SUFFIXES = [
  ".push.apple.com",
  ".push.services.mozilla.com",
  ".notify.windows.com",
];

/** base64url, as browsers give the keys (padding allowed). */
const KEY = /^[A-Za-z0-9_-]+=*$/;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * Only a known push service may be stored: the server later sends a
 * request to this address, so any other address would let someone make
 * logling's server call a place of their choosing (SSRF).
 */
export function isPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length > MAX_ENDPOINT) {
    return false;
  }
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    return false;
  }
  const host = url.hostname;
  return (
    EXACT_HOSTS.has(host) ||
    HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
  );
}

const isKey = (value: unknown, min: number, max: number) =>
  typeof value === "string" &&
  value.length >= min &&
  value.length <= max &&
  KEY.test(value);

const isMinute = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= 1410 &&
  value % 30 === 0;

function isTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) {
    return false;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** The checked input, or null when anything is wrong (ADR-0007). */
export function validateReminder(input: unknown): ReminderInput | null {
  if (!isObject(input) || !isObject(input.subscription)) {
    return null;
  }
  const { endpoint, keys } = input.subscription;
  if (
    !isPushEndpoint(endpoint) ||
    !isObject(keys) ||
    !isKey(keys.p256dh, 80, 100) ||
    !isKey(keys.auth, 16, 32) ||
    !isMinute(input.minute) ||
    !isTimeZone(input.timeZone)
  ) {
    return null;
  }
  // Rebuild it: anything else that came along (such as an ID) is dropped.
  return {
    subscription: {
      endpoint,
      keys: { p256dh: keys.p256dh as string, auth: keys.auth as string },
    },
    minute: input.minute,
    timeZone: input.timeZone,
  };
}
