import { CharacterArt } from "@/features/evolution/CharacterArt";
import { STAGES } from "@/features/evolution/stages";

type Props = {
  onReset: () => void;
};

export function BrokenDataNotice({ onReset }: Props) {
  return (
    <section aria-label="データのお知らせ" className="flex flex-col p-4">
      {/* The saved character cannot be read, so show the first stage. */}
      <div className="mt-6 mb-2 flex justify-center">
        <CharacterArt stage={STAGES[0]} size={160} />
      </div>
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
