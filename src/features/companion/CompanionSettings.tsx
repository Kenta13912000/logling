"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { useDiaryData } from "@/features/cloud/useDiaryData";
import { authClient } from "@/lib/auth-client";

import { getCompanionSetting, setCompanionEnabled } from "./actions";
import { ConsentDialog } from "./ConsentDialog";

const SAVE_ERROR = "⚠ 保存できなかった…通信できるところで、もう一度ためしてね";
const LOAD_ERROR = "⚠ 読み込めなかった…通信できるところで、開き直してね";

/** On or off once known; "loading" while it is read, "failed" if it cannot be. */
type Setting = boolean | "loading" | "failed";

/**
 * The 「キャラクターのコメント」 item on the settings page (AC-1 to AC-4,
 * docs/aidlc/ai-companion/mockup.md screens 1 to 3).
 */
export function CompanionSettings() {
  const titleId = useId();
  const { data: session, isPending } = authClient.useSession();
  const signedIn = !isPending && Boolean(session);
  const { state } = useDiaryData();
  const name =
    (state.status === "ok" && state.data.character?.name) || "キャラクター";

  const [setting, setSetting] = useState<Setting>("loading");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!signedIn) {
      return;
    }
    let current = true;
    getCompanionSetting().then(
      (result) => {
        if (current) {
          setSetting(result.ok ? result.enabled : "failed");
        }
      },
      () => {
        if (current) {
          setSetting("failed");
        }
      },
    );
    return () => {
      current = false;
    };
  }, [signedIn]);

  const on = signedIn && setting === true;
  const usable = signedIn && typeof setting === "boolean" && !busy;

  async function save(enabled: boolean) {
    setBusy(true);
    setFailed(false);
    try {
      const result = await setCompanionEnabled(enabled);
      if (result.ok) {
        setSetting(result.enabled);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  function toggle() {
    if (on) {
      // AC-3: turning off needs no confirmation.
      void save(false);
    } else {
      // AC-2: nothing is sent until the person confirms.
      setConfirming(true);
    }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p id={titleId} className="text-[15px] font-bold">
            日記へのコメント
          </p>
          <p className="text-ink-muted">
            {`日記を書くと、${name}がひとことコメントするよ`}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby={titleId}
          disabled={!usable}
          onClick={toggle}
          className="group flex h-11 w-14 flex-none items-center justify-center disabled:opacity-45"
        >
          <span
            aria-hidden="true"
            className={`relative h-8 w-[52px] rounded-full transition-colors ${
              on ? "bg-ember" : "bg-switch-off"
            }`}
          >
            <span
              className={`absolute top-[3px] size-[26px] rounded-full bg-white transition-[left] ${
                on ? "left-[23px]" : "left-[3px]"
              }`}
            />
          </span>
        </button>
      </div>
      {!isPending && !signedIn && (
        <p className="mt-2.5 rounded-xl bg-ember-soft px-3 py-2.5">
          ログインすると使えるよ。
          <Link href="/account" className="font-bold text-link underline">
            ログインする<span aria-hidden="true">&nbsp;›</span>
          </Link>
        </p>
      )}
      {signedIn && setting === "failed" && (
        <p role="alert" className="mt-2 text-alert">
          {LOAD_ERROR}
        </p>
      )}
      {failed && (
        <p role="alert" className="mt-2 text-alert">
          {SAVE_ERROR}
        </p>
      )}
      {confirming && (
        <ConsentDialog
          name={name}
          onConfirm={() => {
            setConfirming(false);
            void save(true);
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
