"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
} from "react";

import { useStandalone } from "@/features/pwa/display-mode";
import { authClient } from "@/lib/auth-client";

import { isIosDevice, reminderAvailability } from "./availability";
import {
  changeTime,
  loadReminder,
  notificationPermission,
  pushSupported,
  turnOff,
  turnOn,
  type ClientResult,
} from "./push-client";
import { DEFAULT_MINUTE, REMINDER_MINUTES, formatMinute } from "./time";

const SAVE_ERROR = "⚠ 保存できなかった…通信できるところで、もう一度ためしてね";
const DENIED =
  "お知らせが許可されていないよ。端末の設定で、logling のお知らせを許可してね";

/** The browser cannot be read while rendering on the server. */
const noChange = () => () => {};
const iosDevice = () => isIosDevice(navigator);

/** The 「お知らせ」 item on the settings page (AC-6 to AC-10, AC-15). */
export function ReminderSettings() {
  const titleId = useId();
  const timeId = useId();
  const { data: session, isPending } = authClient.useSession();
  const standalone = useStandalone();
  const supported = useSyncExternalStore(noChange, pushSupported, () => false);
  const permission = useSyncExternalStore(
    noChange,
    notificationPermission,
    () => "default" as NotificationPermission,
  );
  const ios = useSyncExternalStore(noChange, iosDevice, () => false);
  // Set when the person refuses permission while turning reminders on.
  const [refused, setRefused] = useState(false);

  const availability = reminderAvailability({
    session: isPending ? "checking" : session ? "signedIn" : "signedOut",
    pushSupported: supported,
    permission: refused ? "denied" : permission,
    iosDevice: ios,
    standalone,
  });
  const available = availability === "available";

  // This device's time, null when off; undefined until it is known.
  const [minute, setMinute] = useState<number | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!available) {
      return;
    }
    let current = true;
    void loadReminder().then((result) => {
      if (current) {
        setMinute(result.ok ? result.minute : null);
      }
    });
    return () => {
      current = false;
    };
  }, [available]);

  const on = available && typeof minute === "number";

  async function run(task: () => Promise<ClientResult>) {
    setBusy(true);
    setFailed(false);
    const result = await task();
    setBusy(false);
    return result;
  }

  async function toggle() {
    if (on) {
      const result = await run(turnOff);
      if (result.ok) {
        setMinute(null);
      } else {
        setFailed(true);
      }
      return;
    }
    const result = await run(() => turnOn(DEFAULT_MINUTE));
    if (result.ok) {
      setMinute(result.minute);
    } else if (result.reason === "denied") {
      setRefused(true);
    } else if (result.reason !== "dismissed") {
      setFailed(true);
    }
  }

  async function change(event: ChangeEvent<HTMLSelectElement>) {
    const previous = minute;
    const next = Number(event.target.value);
    setMinute(next);
    const result = await run(() => changeTime(next));
    if (result.ok) {
      setMinute(result.minute);
    } else {
      setMinute(previous);
      setFailed(true);
    }
  }

  let note = null;
  if (availability === "signedOut") {
    note = (
      <>
        ログインすると使えるよ。
        <Link href="/account" className="font-bold text-ember underline">
          ログインする<span aria-hidden="true">&nbsp;›</span>
        </Link>
      </>
    );
  } else if (availability === "denied") {
    note = DENIED;
  } else if (availability === "needsHomeScreen") {
    note =
      "iPhone では、ホーム画面に追加して、そこから開くと使えるよ（追加のしかたは下にあるよ）";
  } else if (availability === "unsupported") {
    note = "このブラウザでは、お知らせを使えないよ";
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p id={titleId} className="text-[15px] font-bold">
            書き忘れのお知らせ
          </p>
          <p className="text-ink-muted">
            まだ日記を書いていない日に、決めた時刻にお知らせするよ
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby={titleId}
          disabled={!available || minute === undefined || busy}
          onClick={toggle}
          className="group flex h-11 w-14 flex-none items-center justify-center disabled:opacity-45"
        >
          <span
            aria-hidden="true"
            className={`relative h-8 w-[52px] rounded-full transition-colors ${
              on ? "bg-ember" : "bg-[#d8cbb8]"
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
      {on && (
        <>
          <div className="-mx-4 my-3 border-t border-line" />
          <div className="flex items-center gap-3">
            <label htmlFor={timeId} className="flex-1 text-[15px] font-bold">
              時刻
            </label>
            <select
              id={timeId}
              value={String(minute)}
              disabled={busy}
              onChange={change}
              className="min-h-11 min-w-[104px] rounded-xl border border-[#d8c4a6] bg-white px-3 text-center font-bold disabled:opacity-60"
            >
              {REMINDER_MINUTES.map((value) => (
                <option key={value} value={String(value)}>
                  {formatMinute(value)}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-2 text-ink-muted">
            この端末にだけ届くよ。15 分ほど遅れることがあるよ
          </p>
        </>
      )}
      {note && (
        <p className="mt-2.5 rounded-xl bg-[#fde7d6] px-3 py-2.5">{note}</p>
      )}
      {failed && (
        <p role="alert" className="mt-2 text-alert">
          {SAVE_ERROR}
        </p>
      )}
    </>
  );
}
