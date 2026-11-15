"use client";

import type { DiaryEntry } from "@/features/diary/diary";

/** What the bubble under one entry shows (mockup screens 4, 6 and 7). */
export type CommentState =
  | { kind: "pending" }
  | { kind: "comment"; text: string }
  | { kind: "failed" }
  | { kind: "dailyLimit" }
  | { kind: "monthlyLimit" };

/**
 * Character comments on one page. `active` is true while the page shows
 * the cloud data (signed in); only then is the setting read and comments
 * requested (AC-5, AC-9).
 */
export function useComments(active: boolean): {
  enabled: boolean;
  /** The bubble for this entry, or null for none. */
  stateOf: (entry: DiaryEntry) => CommentState | null;
  /** Asks for a comment on the entry for `date` (after saving it, or retry). */
  request: (date: string) => void;
} {
  // Bolt-4 ⑥: placeholder until ⑦ fills it in.
  void active;
  return { enabled: false, stateOf: () => null, request: () => {} };
}
