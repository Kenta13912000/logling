"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { DiaryEntry } from "@/features/diary/diary";

import { getCompanionSetting, requestComment } from "./actions";

/** What the bubble under one entry shows (mockup screens 4, 6 and 7). */
export type CommentState =
  | { kind: "pending" }
  | { kind: "comment"; text: string }
  | { kind: "failed" }
  | { kind: "dailyLimit" }
  | { kind: "monthlyLimit" };

/** Reads whether comments are on. Unknown (a failure) counts as off (AC-9). */
function readEnabled(): Promise<boolean> {
  return getCompanionSetting().then(
    (result) => result.ok && result.enabled,
    () => false,
  );
}

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
  const [enabled, setEnabled] = useState(false);
  // The setting being read, so a save made before it arrives still waits
  // for it instead of being treated as "off".
  const setting = useRef<Promise<boolean> | null>(null);
  // What this page asked for, by diary date. Gone when the page closes.
  const [requests, setRequests] = useState<Record<string, CommentState>>({});

  useEffect(() => {
    if (!active) {
      setting.current = null;
      return;
    }
    let current = true;
    const reading = readEnabled();
    setting.current = reading;
    void reading.then((value) => {
      if (current) {
        setEnabled(value);
      }
    });
    return () => {
      current = false;
    };
  }, [active]);

  const request = useCallback((date: string) => {
    const reading = setting.current;
    if (reading === null) {
      return;
    }
    const settle = (state: CommentState | null) =>
      setRequests((all) => {
        const next = { ...all };
        if (state === null) {
          delete next[date];
        } else {
          next[date] = state;
        }
        return next;
      });

    void reading.then((on) => {
      // Off: nothing is sent and no bubble shows, not even for a moment.
      if (!on) {
        return;
      }
      settle({ kind: "pending" });
      requestComment(date).then(
        (result) => {
          switch (result.status) {
            case "ok":
              return settle({ kind: "comment", text: result.comment });
            case "failed":
            case "dailyLimit":
            case "monthlyLimit":
              return settle({ kind: result.status });
            default:
              // Off, no entry, before turning on, ...: show nothing.
              return settle(null);
          }
        },
        () => settle({ kind: "failed" }),
      );
    });
  }, []);

  const stateOf = (entry: DiaryEntry): CommentState | null =>
    entry.comment !== undefined
      ? { kind: "comment", text: entry.comment }
      : (requests[entry.date] ?? null);

  return { enabled: active && enabled, stateOf, request };
}
