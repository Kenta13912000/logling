import { useEffect, useId, useRef } from "react";

import { formatMonthDay } from "@/lib/diary-date";

type Props = {
  /** Diary date of the entry to delete, e.g. "2026-11-07". */
  date: string;
  name: string;
  lost: number;
  levelBefore: number;
  levelAfter: number;
  onConfirm: () => void;
  /** Called for "やめる" and whenever the dialog closes (e.g. Esc). */
  onCancel: () => void;
};

export function DeleteDialog({
  date,
  name,
  lost,
  levelBefore,
  levelAfter,
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  // showModal() lets the browser trap focus and restore it on close.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    // Start on "やめる" so a stray Enter does not delete the entry.
    cancelRef.current?.focus();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onCancel}
      className="m-auto w-[calc(100%-3rem)] max-w-sm rounded-2xl bg-white p-6 text-center text-ink backdrop:bg-ink/45"
    >
      <p id={titleId} className="mb-2 text-lg font-bold">
        {`${formatMonthDay(date)}の日記を消す？`}
      </p>
      <p>{`消すと経験値が ${lost} 減るよ。`}</p>
      {levelAfter < levelBefore && (
        <p className="font-bold text-alert">
          {`${name} のレベルが ${levelBefore} から ${levelAfter} に下がるよ。`}
        </p>
      )}
      <p className="mt-1 text-sm text-ink-muted">消した日記は元に戻せないよ</p>
      {/* Confirm without close() so the close event only means "cancel". */}
      <button
        type="button"
        onClick={onConfirm}
        className="mt-4 min-h-12 w-full rounded-xl bg-alert font-bold text-white"
      >
        消す
      </button>
      <button
        ref={cancelRef}
        type="button"
        autoFocus
        onClick={() => dialogRef.current?.close()}
        className="mt-2 min-h-12 w-full rounded-xl border border-line bg-white font-bold"
      >
        やめる
      </button>
    </dialog>
  );
}
