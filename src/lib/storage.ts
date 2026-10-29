// Browsers may throw on any storage access (private mode, blocked site data,
// quota exceeded). Return results instead so callers never crash.

export function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readItem(
  storage: Storage,
  key: string,
): { ok: true; value: string | null } | { ok: false } {
  try {
    return { ok: true, value: storage.getItem(key) };
  } catch {
    return { ok: false };
  }
}

export function writeItem(
  storage: Storage,
  key: string,
  value: string,
): boolean {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeItem(storage: Storage, key: string): boolean {
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
