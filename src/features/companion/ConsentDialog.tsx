import Link from "next/link";
import { useEffect, useId, useRef } from "react";

type Props = {
  /** The character's name, used in the explanation. */
  name: string;
  onConfirm: () => void;
  /** Called for 「やめる」 and whenever the dialog closes (e.g. Esc). */
  onCancel: () => void;
};

/**
 * The confirmation before turning comments on (AC-2, mockup screen 2):
 * what is sent, where, and how it is handled (ADR-0009).
 */
export function ConsentDialog({ name, onConfirm, onCancel }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  // showModal() lets the browser trap focus and restore it on close.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    // Start on 「やめる」 so a stray Enter does not send any diary.
    cancelRef.current?.focus();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onCancel}
      className="m-auto w-[calc(100%-3rem)] max-w-sm rounded-2xl bg-surface p-6 text-sm text-ink backdrop:bg-scrim"
    >
      <p id={titleId} className="mb-2 text-center text-lg font-bold">
        コメントをオンにする？
      </p>
      <p>
        {`日記を書くたびに、その日記を AI に読んでもらって、${name}のコメントを作るよ。`}
      </p>
      <dl className="mt-3">
        <dt className="font-bold">送るもの</dt>
        <dd>その日の日記の本文と、キャラクターの名前だけ</dd>
        <dt className="mt-2 font-bold">送り先</dt>
        <dd>AI のサービス（Anthropic の Claude）</dd>
        <dt className="mt-2 font-bold">送ったものの扱い</dt>
        <dd>
          <Link href="/privacy" className="font-bold text-link underline">
            日記の保存のしかた<span aria-hidden="true">&nbsp;›</span>
          </Link>{" "}
          にくわしく書いたよ
        </dd>
      </dl>
      <p className="mt-3 text-ink-muted">いつでもオフにできるよ</p>
      {/* Confirm without close() so the close event only means "cancel". */}
      <button
        type="button"
        onClick={onConfirm}
        className="mt-4 min-h-12 w-full rounded-xl bg-ember font-bold text-white"
      >
        オンにする
      </button>
      <button
        ref={cancelRef}
        type="button"
        autoFocus
        onClick={() => dialogRef.current?.close()}
        className="mt-2 min-h-12 w-full rounded-xl border border-line bg-surface font-bold"
      >
        やめる
      </button>
    </dialog>
  );
}
