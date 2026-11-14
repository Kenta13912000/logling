"use client";

import Link from "next/link";

import { authClient } from "@/lib/auth-client";

import { GearIcon, ShieldIcon, UserIcon } from "./icons";

type RowProps = {
  href: string;
  icon: typeof UserIcon;
  title: string;
  note?: string | null;
};

function Row({ href, icon: Icon, title, note }: RowProps) {
  return (
    <li className="border-t border-line first:border-t-0">
      <Link
        href={href}
        className="flex min-h-14 items-center gap-3 px-4 py-2.5"
      >
        <Icon className="size-[22px] flex-none fill-none text-ink-muted" />
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{title}</span>
          {note && (
            <span className="block text-xs break-all text-ink-muted">
              {note}
            </span>
          )}
        </span>
        <span aria-hidden="true" className="text-ink-muted">
          ›
        </span>
      </Link>
    </li>
  );
}

/** 「その他」: account, how diaries are kept, and settings (tab-navigation). */
export function MorePage() {
  const { data: session, isPending } = authClient.useSession();
  // AC-6: whether signed in, without opening the account page.
  const accountNote = isPending
    ? null
    : session
      ? `ログイン中：${session.user.email}`
      : "ログインしていない";

  return (
    <main className="px-4 py-5">
      <h1 className="text-lg font-bold">その他</h1>
      <ul className="mt-3 overflow-hidden rounded-2xl border border-line bg-surface">
        <Row
          href="/account"
          icon={UserIcon}
          title="アカウント"
          note={accountNote}
        />
        <Row href="/privacy" icon={ShieldIcon} title="日記の保存のしかた" />
        <Row href="/settings" icon={GearIcon} title="設定" />
      </ul>
    </main>
  );
}
