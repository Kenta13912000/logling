import { CharacterArt } from "@/features/evolution/CharacterArt";
import type { Stage } from "@/features/evolution/stages";
import { DAY_START_HOUR, formatDiaryDate } from "@/lib/diary-date";

import type { DiaryEntry } from "./diary";

type Props = {
  entry: DiaryEntry;
  /** The character's current stage, shown beside the thanks. */
  stage: Stage;
};

export function TodayEntry({ entry, stage }: Props) {
  return (
    <section aria-label="今日の日記" className="flex flex-col p-4">
      <p className="font-bold">{formatDiaryDate(entry.date)}</p>
      <div className="mt-2 mb-3 flex items-start gap-2">
        <CharacterArt stage={stage} size={48} crop />
        <p className="rounded-2xl border border-line bg-white px-3 py-2">
          今日も書いてくれてありがとう！また明日ね
        </p>
      </div>
      <p className="rounded-xl border border-line bg-white p-3 whitespace-pre-wrap">
        {entry.body}
      </p>
      <p className="mt-3 text-sm text-ink-muted">
        {`次の日記は、明日の朝 ${DAY_START_HOUR} 時から書けるよ`}
      </p>
    </section>
  );
}
