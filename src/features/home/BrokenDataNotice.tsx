type Props = {
  onReset: () => void;
};

export function BrokenDataNotice({ onReset }: Props) {
  return (
    <section aria-label="データのお知らせ" className="flex flex-col p-4">
      <p aria-hidden="true" className="mt-8 mb-4 text-center text-6xl">
        🐣
      </p>
      <p className="text-center font-bold">データを読み込めなかったみたい…</p>
      <p className="mt-2 text-center text-sm text-ink-muted">
        はじめからにすると、今のデータは控えとして残して、最初からやり直すよ
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-6 min-h-12 rounded-xl bg-ember font-bold text-white"
      >
        はじめからにする
      </button>
    </section>
  );
}
