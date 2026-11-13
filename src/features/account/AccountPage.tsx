"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { loadCloudData } from "@/features/cloud/actions";
import type { SaveData } from "@/features/home/save-data";
import { forgetThisDevice } from "@/features/reminder/device";
import { authClient } from "@/lib/auth-client";

import { withdrawAccount } from "./actions";
import { WithdrawDialog } from "./WithdrawDialog";

type Props = {
  /** True when Google sent the person back after a failed sign-in. */
  loginFailed: boolean;
  /** True when back from signing in again to withdraw. */
  withdrawAgain?: boolean;
};

/** Google's "G" mark for the sign-in button (Google branding guidelines). */
function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

type Notice =
  "loginFailed" | "logoutFailed" | "withdrawFailed" | "reauth" | null;

const EMPTY: SaveData = { version: 1, character: null, entries: [] };

export function AccountPage({ loginFailed, withdrawAgain = false }: Props) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [notice, setNotice] = useState<Notice>(
    loginFailed ? "loginFailed" : null,
  );
  // Back from signing in again to withdraw: ask once more (AC-25).
  const [withdrawing, setWithdrawing] = useState(withdrawAgain);
  const [busy, setBusy] = useState(false);
  // The account's data, to say what withdrawal deletes.
  const [cloudData, setCloudData] = useState<SaveData | null>(null);
  const signedIn = !isPending && session !== null && session !== undefined;

  useEffect(() => {
    if (!signedIn) {
      return;
    }
    let current = true;
    loadCloudData().then(
      (result) => {
        if (current && result.ok) {
          setCloudData(result.data);
        }
      },
      () => {},
    );
    return () => {
      current = false;
    };
  }, [signedIn]);

  async function withdraw() {
    setBusy(true);
    const result = await withdrawAccount().catch(
      () => ({ ok: false, reason: "failed" }) as const,
    );
    setBusy(false);
    if (result.ok) {
      // The session is already gone; this clears the cookie and the
      // browser's memory of being signed in.
      await authClient.signOut().catch(() => undefined);
      router.push("/");
      return;
    }
    setWithdrawing(false);
    setNotice(result.reason === "reauth" ? "reauth" : "withdrawFailed");
  }

  function signInAgain() {
    void authClient.signIn.social({
      provider: "google",
      callbackURL: "/account?withdraw=again",
      errorCallbackURL: "/account?error=login",
    });
  }

  async function signIn() {
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
      errorCallbackURL: "/account?error=login",
    });
    // On success the browser has already left for Google.
    if (error) {
      setNotice("loginFailed");
    }
  }

  async function signOut() {
    // pwa-reminder AC-16: stop this device's reminders first. Signing out
    // goes ahead even if that fails.
    await forgetThisDevice().catch(() => undefined);
    const { error } = await authClient.signOut();
    if (error) {
      setNotice("logoutFailed");
      return;
    }
    router.push("/");
  }

  let content = null;
  if (!isPending) {
    content = session ? (
      <div className="rounded-2xl border border-line bg-white p-4">
        <p className="text-xs font-bold text-ink-muted">ログイン中</p>
        <p className="mt-1 font-bold break-all">{session.user.email}</p>
        <p className="mt-1 text-sm text-ink-muted">
          <span aria-hidden="true">☁ </span>
          日記はインターネット上の保管場所にしまわれているよ。ほかのスマホや PC
          でも、このアカウントでログインすれば続きが書けるよ
        </p>
        <button
          type="button"
          onClick={signOut}
          className="mt-4 min-h-12 w-full rounded-xl border border-line bg-white font-bold"
        >
          ログアウト
        </button>
        <p className="mt-2 text-sm text-ink-muted">
          ログアウトすると、この端末には日記もキャラクターも残らないよ
        </p>
      </div>
    ) : (
      <>
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="font-bold">
            ログインすると、スマホでも PC
            でも、同じキャラクターと日記で続きが書けるよ
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm text-ink-muted">
            <li>
              日記はインターネット上の保管場所にしまわれ、あなたしか読めない
            </li>
            <li>このブラウザのキャラクターと日記は、そのまま引き継げる</li>
          </ul>
          <button
            type="button"
            onClick={signIn}
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-[#747775] bg-white font-medium text-[#1f1f1f]"
          >
            <GoogleMark />
            Google でログイン
          </button>
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          ログインしなくても、このブラウザの中に保存して使えるよ
        </p>
      </>
    );
  }

  // The top bar and the tabs come from the common layout (tab-navigation).
  return (
    <>
      <main className="p-4">
        {notice === "loginFailed" && (
          <p role="alert" className="mb-4 text-sm text-alert">
            ⚠
            ログインできなかった…もう一度ためしてね。このブラウザの日記はそのまま残っているよ
          </p>
        )}
        {notice === "logoutFailed" && (
          <p role="alert" className="mb-4 text-sm text-alert">
            ⚠ ログアウトできなかった…通信できるところで、もう一度ためしてね
          </p>
        )}
        {notice === "withdrawFailed" && (
          <p role="alert" className="mb-4 text-sm text-alert">
            ⚠ 退会できなかった…通信できるところで、もう一度ためしてね
          </p>
        )}
        {notice === "reauth" && (
          <div className="mb-4 rounded-2xl border border-line bg-white p-4 text-sm">
            <p>本人の確認のため、もう一度ログインしてね</p>
            <p className="mt-1 text-ink-muted">
              ログインし直すと、退会の確認がもう一度出るよ
            </p>
            <button
              type="button"
              onClick={signInAgain}
              className="mt-3 min-h-11 w-full rounded-xl border border-[#747775] bg-white font-medium text-[#1f1f1f]"
            >
              Google でログインし直す
            </button>
          </div>
        )}
        <h1 className="mt-2 mb-3 text-lg font-bold">アカウント</h1>
        {content}
        {!isPending && (
          <Link
            href="/privacy"
            className="mt-4 flex min-h-11 items-center justify-center text-sm font-bold text-ember underline"
          >
            日記の保存のしかた<span aria-hidden="true">&nbsp;›</span>
          </Link>
        )}
        {signedIn && (
          <button
            type="button"
            onClick={() => {
              setNotice(null);
              setWithdrawing(true);
            }}
            className="mx-auto mt-10 flex min-h-11 items-center text-sm font-bold text-alert underline"
          >
            退会する
          </button>
        )}
      </main>
      {signedIn && withdrawing && (
        <WithdrawDialog
          data={cloudData ?? EMPTY}
          busy={busy}
          onConfirm={withdraw}
          onCancel={() => setWithdrawing(false)}
        />
      )}
    </>
  );
}
