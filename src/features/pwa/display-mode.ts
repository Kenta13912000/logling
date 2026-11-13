import { useSyncExternalStore } from "react";

const STANDALONE = "(display-mode: standalone)";

/** What `isStandalone` reads from the browser. */
export type DisplayEnv = {
  matchMedia: (query: string) => { matches: boolean };
  navigator: { standalone?: boolean };
};

/**
 * True when logling was opened from the home screen (AC-5): the page runs
 * without the browser's address bar, or, on older iPhones, Safari's own
 * `navigator.standalone` says so.
 */
export function isStandalone(env: DisplayEnv): boolean {
  return (
    env.matchMedia(STANDALONE).matches || env.navigator.standalone === true
  );
}

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== "function") {
    return () => {};
  }
  const media = window.matchMedia(STANDALONE);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function snapshot(): boolean {
  if (typeof window.matchMedia !== "function") {
    return false;
  }
  return isStandalone({
    matchMedia: (query) => window.matchMedia(query),
    // `standalone` exists only in Safari on iPhone; TypeScript does not know it.
    navigator: window.navigator as Navigator & { standalone?: boolean },
  });
}

/**
 * isStandalone for this browser. The server cannot know, so it renders as a
 * browser tab and the browser corrects it right after starting.
 */
export function useStandalone(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
