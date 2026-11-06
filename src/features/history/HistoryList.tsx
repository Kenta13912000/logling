import { useState } from "react";

import { EXP_PER_LATE_ENTRY } from "@/features/character/character";
import type { DiaryEntry } from "@/features/diary/diary";
import {
  RECENT_DAYS,
  formatMonthDay,
  formatShortDiaryDate,
} from "@/lib/diary-date";

import { EntryForm } from "./EntryForm";
import type { HistoryItem } from "./history";

type Props = {
  items: HistoryItem[];
  /** Saves the new body. Returns true when it was saved. */
  onSaveEdit: (date: string, body: string) => boolean;
  onRequestDelete: (date: string) => void;
};

function isOld(item: HistoryItem): boolean {
  return item.kind === "entry" && !item.editable;
}

const smallButton =
  "min-h-11 rounded-xl border border-line bg-white px-4 text-sm font-bold";

function MissingCard({ date }: { date: string }) {
  return (
    <li className="rounded-xl border border-dashed border-line p-3">
      <div className="mb-1.5 font-bold">{formatShortDiaryDate(date)}</div>
      <p className="text-sm text-ink-muted">
        {`この日はまだ書いていないよ（あとから書くと +${EXP_PER_LATE_ENTRY} 経験値）`}
      </p>
    </li>
  );
}

type EntryCardProps = {
  entry: DiaryEntry;
  /** Shows the edit and delete buttons. */
  showActions: boolean;
  editing: boolean;
  onEdit: () => void;
  onSave: (body: string) => void;
  onCancel: () => void;
  onDelete: () => void;
};

function EntryCard({
  entry,
  showActions,
  editing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: EntryCardProps) {
  return (
    <li className="rounded-xl border border-line bg-white p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="flex-1 font-bold">
          {formatShortDiaryDate(entry.date)}
        </span>
        {entry.writtenLater && (
          <span className="rounded-full border border-honey px-2 text-xs text-ink">
            あとから
          </span>
        )}
      </div>
      {editing ? (
        <EntryForm
          label={`${formatMonthDay(entry.date)}の日記`}
          initialBody={entry.body}
          submitLabel="保存する"
          onSubmit={onSave}
          onCancel={onCancel}
        />
      ) : (
        <>
          <p className="break-words whitespace-pre-wrap">{entry.body}</p>
          {showActions && (
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={onEdit} className={smallButton}>
                書き直す
              </button>
              <button
                type="button"
                onClick={onDelete}
                className={`${smallButton} text-alert`}
              >
                消す
              </button>
            </div>
          )}
        </>
      )}
    </li>
  );
}

export function HistoryList({ items, onSaveEdit, onRequestDelete }: Props) {
  // Only one card is edited at a time.
  const [editingDate, setEditingDate] = useState<string | null>(null);

  function renderItem(item: HistoryItem) {
    if (item.kind === "missing") {
      return <MissingCard key={item.date} date={item.date} />;
    }
    const { date } = item.entry;
    return (
      <EntryCard
        key={date}
        entry={item.entry}
        // Hide other buttons while editing so typed text is not lost.
        showActions={item.editable && editingDate === null}
        editing={item.editable && editingDate === date}
        onEdit={() => setEditingDate(date)}
        onSave={(body) => {
          if (onSaveEdit(date, body)) {
            setEditingDate(null);
          }
        }}
        onCancel={() => setEditingDate(null)}
        onDelete={() => onRequestDelete(date)}
      />
    );
  }

  // Two lists keep the divider outside <ul>, where only <li> is allowed.
  const recent = items.filter((item) => !isOld(item));
  const old = items.filter(isOld);

  return (
    <div className="flex flex-col gap-3">
      {recent.length > 0 && (
        <ul className="flex flex-col gap-3">{recent.map(renderItem)}</ul>
      )}
      {old.length > 0 && (
        <>
          <p className="my-1 text-center text-xs text-ink-muted">
            {`― ここから下は ${RECENT_DAYS + 1} 日以上前の日記（読むだけ） ―`}
          </p>
          <ul className="flex flex-col gap-3">{old.map(renderItem)}</ul>
        </>
      )}
    </div>
  );
}
