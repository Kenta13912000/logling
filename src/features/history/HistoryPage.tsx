"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useSaveData } from "@/features/home/useSaveData";
import { useToday } from "@/features/home/useToday";
import { RECENT_DAYS } from "@/lib/diary-date";

import { buildHistory } from "./history";
import { HistoryList } from "./HistoryList";

function Guide({ emoji, message }: { emoji?: string; message: string }) {
  return (
    <section className="flex flex-col items-center gap-4 px-4 py-12 text-center">
      {emoji && (
        <span aria-hidden="true" className="text-5xl">
          {emoji}
        </span>
      )}
      <p>{message}</p>
      <Link
        href="/"
        className="flex min-h-12 items-center rounded-xl bg-ember px-8 font-bold text-white"
      >
        ホームへ
      </Link>
    </section>
  );
}

export function HistoryPage() {
  const { state } = useSaveData();
  const today = useToday();

  let content: ReactNode = null;

  if (state.status === "broken") {
    content = <Guide message="データを読み込めなかったみたい…" />;
  } else if (state.status === "ok" && today !== null) {
    const { character, entries } = state.data;

    if (character === null) {
      content = <Guide emoji="🐣" message="ホームで名前を付けてね" />;
    } else if (entries.length === 0) {
      content = (
        <Guide
          emoji="🐣"
          message="まだ日記がないよ。ホームで今日の日記を書いてみよう"
        />
      );
    } else {
      content = (
        <section className="flex flex-col gap-3 px-4 py-5">
          <h1 className="text-lg font-bold">ふりかえり</h1>
          <p className="text-sm text-ink-muted">
            {`最近 ${RECENT_DAYS} 日の日記は、書き直したり消したりできるよ`}
          </p>
          <HistoryList items={buildHistory(entries, today)} />
        </section>
      );
    }
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
      <main>{content}</main>
    </div>
  );
}
