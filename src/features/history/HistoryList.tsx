import { useState } from "react";

import { EXP_PER_LATE_ENTRY } from "@/features/character/character";
import type { DiaryEntry } from "@/features/diary/diary";
import type { Stage } from "@/features/evolution/stages";
import {
  RECENT_DAYS,
  formatMonthDay,
  formatShortDiaryDate,
} from "@/lib/diary-date";

import { EntryForm } from "./EntryForm";
import type { HistoryItem } from "./history";

/** True when it was saved. A promise while saving to the cloud. */
type SaveResult = boolean | Promise<boolean>;

type Props = {
  items: HistoryItem[];
  /** The character's current stage, shown when writing a missed day. */
  stage: Stage;
  /** Saves the new body. */
  onSaveEdit: (date: string, body: string) => SaveResult;
  /** Saves an entry for a missed day. */
  onSaveLater: (date: string, body: string) => SaveResult;
  onRequestDelete: (date: string) => void;
};

function isOld(item: HistoryItem): boolean {
  return item.kind === "entry" && !item.editable;
}

const smallButton =
  "min-h-11 rounded-xl border border-line bg-white px-4 text-sm font-bold";

type MissingCardProps = {
  date: string;
  stage: Stage;
  /** Shows the write button. */
  showActions: boolean;
  writing: boolean;
  onWrite: () => void;
  onSave: (body: string) => Promise<void>;
  onCancel: () => void;
};

function MissingCard({
  date,
  stage,
  showActions,
  writing,
  onWrite,
  onSave,
  onCancel,
}: MissingCardProps) {
  return (
    <li className="rounded-xl border border-dashed border-line p-3">
      <div className="mb-1.5 font-bold">{formatShortDiaryDate(date)}</div>
      {writing ? (
        <EntryForm
          label={`${formatMonthDay(date)}の日記`}
          initialBody=""
          prompt={`${formatMonthDay(date)}は、どんな一日だった？`}
          stage={stage}
          placeholder="思い出せることを書いてみよう"
          submitLabel="日記をのこす"
          onSubmit={onSave}
          onCancel={onCancel}
        />
      ) : (
        <>
          <p className="text-sm text-ink-muted">
            {`この日はまだ書いていないよ（あとから書くと +${EXP_PER_LATE_ENTRY} 経験値）`}
          </p>
          {showActions && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={onWrite}
                className="min-h-11 rounded-xl bg-ember px-4 text-sm font-bold text-white"
              >
                この日の日記を書く
              </button>
            </div>
          )}
        </>
      )}
    </li>
  );
}

type EntryCardProps = {
  entry: DiaryEntry;
  /** Shows the edit and delete buttons. */
  showActions: boolean;
  editing: boolean;
  onEdit: () => void;
  onSave: (body: string) => Promise<void>;
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

export function HistoryList({
  items,
  stage,
  onSaveEdit,
  onSaveLater,
  onRequestDelete,
}: Props) {
  // Only one card takes input at a time, whether rewriting or writing later.
  const [activeDate, setActiveDate] = useState<string | null>(null);
  // Hide other buttons during input so typed text is not lost.
  const showActions = activeDate === null;

  // Close the form only once saving is done; on failure the text stays.
  const saveWith =
    (save: (date: string, body: string) => SaveResult, date: string) =>
    async (body: string) => {
      if (await save(date, body)) {
        setActiveDate(null);
      }
    };

  function renderItem(item: HistoryItem) {
    if (item.kind === "missing") {
      const { date } = item;
      return (
        <MissingCard
          key={date}
          date={date}
          stage={stage}
          showActions={showActions}
          writing={activeDate === date}
          onWrite={() => setActiveDate(date)}
          onSave={saveWith(onSaveLater, date)}
          onCancel={() => setActiveDate(null)}
        />
      );
    }
    const { date } = item.entry;
    return (
      <EntryCard
        key={date}
        entry={item.entry}
        showActions={item.editable && showActions}
        editing={item.editable && activeDate === date}
        onEdit={() => setActiveDate(date)}
        onSave={saveWith(onSaveEdit, date)}
        onCancel={() => setActiveDate(null)}
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
