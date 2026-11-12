type Props = {
  onRetry: () => void;
};

/**
 * Signed in, the cloud data could not be read (AC-12). The name form is not
 * shown here, so a new character never overwrites the account's data.
 */
export function LoadErrorNotice({ onRetry }: Props) {
  return (
    <section aria-label="データのお知らせ" className="flex flex-col p-4">
      <p className="mt-6 text-center font-bold">データを読み込めなかった…</p>
      <p className="mt-2 text-center text-sm text-ink-muted">
        通信できるところで、もう一度ためしてね
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 min-h-12 rounded-xl bg-ember font-bold text-white"
      >
        もう一度読み込む
      </button>
    </section>
  );
}

/** While the account's data is on its way (AC-12). */
export function LoadingNotice({ message = "読み込んでいるよ…" }) {
  return (
    <p role="status" className="px-4 py-24 text-center text-ink-muted">
      {message}
    </p>
  );
}
