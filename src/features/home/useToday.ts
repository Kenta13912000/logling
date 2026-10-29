import { useSyncExternalStore } from "react";

import { getDiaryDate } from "@/lib/diary-date";

// The current time is only read in the browser. Reading it during the
// server prerender would freeze the build time into the HTML.

function subscribe(listener: () => void): () => void {
  // Pick up the next diary day when the user comes back after 4 AM.
  document.addEventListener("visibilitychange", listener);
  window.addEventListener("focus", listener);
  return () => {
    document.removeEventListener("visibilitychange", listener);
    window.removeEventListener("focus", listener);
  };
}

function getSnapshot(): string {
  return getDiaryDate(new Date());
}

function getServerSnapshot(): null {
  return null;
}

/** Today's diary date, or null while rendering on the server. */
export function useToday(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
