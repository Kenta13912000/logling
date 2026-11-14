import { useId } from "react";

import { getLevelInfo } from "@/features/character/character";
import type { SaveData } from "@/features/home/save-data";

type Props = {
  /** The account's data, to say what will be deleted. */
  data: SaveData;
  /** True while withdrawing; the buttons wait. */
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Confirms withdrawal: what is deleted and that it cannot be undone (AC-25). */
export function WithdrawDialog({ data, busy, onConfirm, onCancel }: Props) {
  const titleId = useId();
  const { character, entries } = data;
  const lost =
    character === null
      ? "アカウントの記録が、すべて消えるよ。"
      : `${character.name}（Lv. ${getLevelInfo(character.totalExp).level}）と日記 ${entries.length} 件が、すべて消えるよ。`;

  return (
    // z-20: in front of the tabs, which are dimmed too (tab-navigation AC-11).
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-scrim p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[420px] rounded-3xl bg-surface p-6 text-center"
      >
        <p id={titleId} className="text-lg font-bold">
          退会する？
        </p>
        <p className="mt-2">{lost}</p>
        <p className="mt-1 font-bold text-alert">元にはもどせないよ。</p>
        <p className="mt-2 text-sm text-ink-muted">
          Google アカウントそのものは消えないよ
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className="mt-6 min-h-12 w-full rounded-xl bg-danger font-bold text-white disabled:opacity-60"
        >
          {busy ? "退会しているよ…" : "退会する"}
        </button>
        <button
          type="button"
          autoFocus
          disabled={busy}
          onClick={onCancel}
          className="mt-3 min-h-12 w-full rounded-xl border border-line bg-surface font-bold disabled:opacity-60"
        >
          やめる
        </button>
      </div>
    </div>
  );
}
