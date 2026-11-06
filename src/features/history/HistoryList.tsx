import { EXP_PER_LATE_ENTRY } from "@/features/character/character";
import { RECENT_DAYS, formatShortDiaryDate } from "@/lib/diary-date";

import type { HistoryItem } from "./history";

type Props = {
  items: HistoryItem[];
};

function isOld(item: HistoryItem): boolean {
  return item.kind === "entry" && !item.editable;
}

function HistoryCard({ item }: { item: HistoryItem }) {
  if (item.kind === "missing") {
    return (
      <li className="rounded-xl border border-dashed border-line p-3">
        <div className="mb-1.5 font-bold">
          {formatShortDiaryDate(item.date)}
        </div>
        <p className="text-sm text-ink-muted">
          {`この日はまだ書いていないよ（あとから書くと +${EXP_PER_LATE_ENTRY} 経験値）`}
        </p>
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-line bg-white p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="flex-1 font-bold">
          {formatShortDiaryDate(item.entry.date)}
        </span>
        {item.entry.writtenLater && (
          <span className="rounded-full border border-honey px-2 text-xs text-ink">
            あとから
          </span>
        )}
      </div>
      <p className="whitespace-pre-wrap break-words">{item.entry.body}</p>
    </li>
  );
}

const keyOf = (item: HistoryItem) =>
  item.kind === "entry" ? item.entry.date : item.date;

export function HistoryList({ items }: Props) {
  // Two lists keep the divider outside <ul>, where only <li> is allowed.
  const recent = items.filter((item) => !isOld(item));
  const old = items.filter(isOld);

  return (
    <div className="flex flex-col gap-3">
      {recent.length > 0 && (
        <ul className="flex flex-col gap-3">
          {recent.map((item) => (
            <HistoryCard key={keyOf(item)} item={item} />
          ))}
        </ul>
      )}
      {old.length > 0 && (
        <>
          <p className="my-1 text-center text-xs text-ink-muted">
            {`― ここから下は ${RECENT_DAYS + 1} 日以上前の日記（読むだけ） ―`}
          </p>
          <ul className="flex flex-col gap-3">
            {old.map((item) => (
              <HistoryCard key={keyOf(item)} item={item} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
