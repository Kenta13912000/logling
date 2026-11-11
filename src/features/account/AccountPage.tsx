"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

type Props = {
  /** True when Google sent the person back after a failed sign-in. */
  loginFailed: boolean;
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

export function AccountPage({ loginFailed }: Props) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [notice, setNotice] = useState<"loginFailed" | "logoutFailed" | null>(
    loginFailed ? "loginFailed" : null,
  );

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
        <button
          type="button"
          onClick={signOut}
          className="mt-4 min-h-12 w-full rounded-xl border border-line bg-white font-bold"
        >
          ログアウト
        </button>
      </div>
    ) : (
      <>
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="font-bold">
            ログインすると、スマホでも PC
            でも、同じキャラクターと日記で続きが書けるよ
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm text-ink-muted">
            <li>日記はクラウドに保存され、あなたしか読めない</li>
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

  return (
    <div className="mx-auto min-h-full w-full max-w-[480px] bg-cream text-ink">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-line px-4 py-3">
        <Link
          href="/"
          className="flex min-h-11 items-center justify-self-start text-sm font-bold text-ember underline"
        >
          <span aria-hidden="true">‹&nbsp;</span>ホーム
        </Link>
        <span className="font-bold tracking-wide">logling</span>
      </header>
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
        <h1 className="mt-2 mb-3 text-lg font-bold">アカウント</h1>
        {content}
      </main>
    </div>
  );
}
