"use client";

import { useId, useState } from "react";

import { getLevelInfo } from "@/features/character/character";
import { CharacterArt } from "@/features/evolution/CharacterArt";
import { getStage } from "@/features/evolution/stages";
import type { SaveData } from "@/features/home/save-data";

import { summarize, type Summary } from "./migration";

export type Side = "browser" | "account";

type Props = {
  browser: SaveData;
  account: SaveData;
  /** True while moving the data; the buttons wait. */
  busy: boolean;
  onConfirm: (side: Side) => void;
};

const LABELS: Record<Side, string> = {
  browser: "このブラウザ",
  account: "アカウント（ほかの端末）",
};

/** Where the character that would be deleted lives, in the confirmation. */
const PLACES: Record<Side, string> = {
  browser: "このブラウザの",
  account: "アカウントの",
};

const describe = (summary: Summary) =>
  `Lv. ${summary.level}・日記 ${summary.entryCount} 件`;

function Card({
  side,
  data,
  disabled,
  onChoose,
}: {
  side: Side;
  data: SaveData;
  disabled: boolean;
  onChoose: () => void;
}) {
  const titleId = useId();
  const summary = summarize(data);
  const stage = getStage(getLevelInfo(data.character?.totalExp ?? 0).level);
  return (
    <section
      aria-labelledby={titleId}
      className="rounded-2xl border border-line bg-white p-4"
    >
      <p id={titleId} className="text-xs font-bold text-ink-muted">
        {LABELS[side]}
      </p>
      <div className="mt-1 flex items-center gap-3">
        <CharacterArt stage={stage} size={56} crop />
        <p>
          <span className="font-bold">{summary.name}</span>
          {`（${summary.stageName}）`}
          <br />
          <span className="text-sm text-ink-muted">{describe(summary)}</span>
        </p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onChoose}
        className="mt-3 min-h-12 w-full rounded-xl bg-ember font-bold text-white disabled:opacity-60"
      >
        {`${summary.name} で続ける`}
      </button>
    </section>
  );
}

/**
 * Both this browser and the account have a character (AC-18). The person
 * picks one; the other is deleted after a confirmation (AC-19, AC-20).
 */
export function MigrationChoice({ browser, account, busy, onConfirm }: Props) {
  const headingId = useId();
  const dialogTitleId = useId();
  const [chosen, setChosen] = useState<Side | null>(null);
  const data: Record<Side, SaveData> = { browser, account };

  let dialog = null;
  if (chosen !== null) {
    const other: Side = chosen === "browser" ? "account" : "browser";
    const keep = summarize(data[chosen]);
    const drop = summarize(data[other]);
    dialog = (
      <div className="fixed inset-0 flex items-center justify-center bg-ink/45 p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          className="w-full max-w-[420px] rounded-3xl bg-white p-6 text-center"
        >
          <p id={dialogTitleId} className="text-lg font-bold">
            {`${keep.name} で続ける？`}
          </p>
          <p className="mt-2">
            {`${PLACES[other]} ${drop.name}（${describe(drop)}）は消えるよ。`}
          </p>
          <p className="mt-1 font-bold text-alert">元にはもどせないよ。</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => onConfirm(chosen)}
            className="mt-6 min-h-12 w-full rounded-xl bg-alert font-bold text-white disabled:opacity-60"
          >
            {busy
              ? "移しているよ…"
              : `${drop.name} を消して ${keep.name} で続ける`}
          </button>
          <button
            type="button"
            autoFocus
            disabled={busy}
            onClick={() => setChosen(null)}
            className="mt-3 min-h-12 w-full rounded-xl border border-line bg-white font-bold disabled:opacity-60"
          >
            えらびなおす
          </button>
        </div>
      </div>
    );
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3 p-4">
      <h2 id={headingId} className="mt-2 text-lg font-bold">
        どちらのキャラクターで続ける？
      </h2>
      <p className="text-sm text-ink-muted">
        アカウントにも、このブラウザにもキャラクターがいるよ。選ばなかった方は消えるよ
      </p>
      <Card
        side="browser"
        data={browser}
        disabled={busy}
        onChoose={() => setChosen("browser")}
      />
      <Card
        side="account"
        data={account}
        disabled={busy}
        onChoose={() => setChosen("account")}
      />
      {dialog}
    </section>
  );
}
