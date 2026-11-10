import { useId, useState, type SubmitEvent } from "react";

import { CharacterArt } from "@/features/evolution/CharacterArt";
import type { Stage } from "@/features/evolution/stages";
import { formatDiaryDate } from "@/lib/diary-date";
import { countCharacters } from "@/lib/text";

import { BODY_MAX_LENGTH, bodyErrorMessage, validateBody } from "./diary";

type Props = {
  /** Diary date, e.g. "2026-10-28". */
  date: string;
  /** The character's current stage, shown beside the question. */
  stage: Stage;
  onSave: (body: string) => void;
};

export function DiaryEditor({ date, stage, onSave }: Props) {
  const textareaId = useId();
  const errorId = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const length = countCharacters(value.trim());

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateBody(value);
    if (!result.ok) {
      setError(bodyErrorMessage(result));
      return;
    }
    setError(null);
    onSave(result.body);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col p-4">
      <p className="font-bold">{formatDiaryDate(date)}</p>
      <div className="mt-2 mb-3 flex items-start gap-2">
        <CharacterArt stage={stage} size={48} crop />
        <p className="rounded-2xl border border-line bg-white px-3 py-2">
          今日はどんな一日だった？きかせて！
        </p>
      </div>
      <label htmlFor={textareaId} className="sr-only">
        今日の日記
      </label>
      <textarea
        id={textareaId}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="今日あったこと、思ったことを書いてみよう"
        aria-invalid={error !== null}
        aria-describedby={error ? errorId : undefined}
        className="min-h-50 rounded-xl border border-line bg-white px-3 py-2.5"
      />
      <p
        className={`mt-1 text-right text-sm ${length > BODY_MAX_LENGTH ? "text-alert" : "text-ink-muted"}`}
      >
        {`${length} / ${BODY_MAX_LENGTH}`}
      </p>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-alert">
          ⚠ {error}
        </p>
      )}
      <button
        type="submit"
        className="mt-4 min-h-12 rounded-xl bg-ember font-bold text-white"
      >
        日記をのこす
      </button>
    </form>
  );
}
