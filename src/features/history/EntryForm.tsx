import { useId, useState, type SubmitEvent } from "react";

import {
  BODY_MAX_LENGTH,
  bodyErrorMessage,
  validateBody,
} from "@/features/diary/diary";
import { CharacterArt } from "@/features/evolution/CharacterArt";
import type { Stage } from "@/features/evolution/stages";
import { countCharacters } from "@/lib/text";

type Props = {
  /** Accessible name of the textarea, e.g. "11月7日の日記". */
  label: string;
  initialBody: string;
  /** Question from the character above the textarea, when writing later. */
  prompt?: string;
  /** The character's current stage, shown beside the prompt. */
  stage?: Stage;
  placeholder?: string;
  submitLabel: string;
  /** Receives the trimmed, valid body. May return a promise while saving. */
  onSubmit: (body: string) => void | Promise<unknown>;
  onCancel: () => void;
};

/** Body input shown inside a history card. */
export function EntryForm({
  label,
  initialBody,
  prompt,
  stage,
  placeholder,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const textareaId = useId();
  const errorId = useId();
  const [value, setValue] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  // account-sync AC-11: one save at a time while waiting for the cloud.
  const [saving, setSaving] = useState(false);
  const length = countCharacters(value.trim());

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) {
      return;
    }
    const result = validateBody(value);
    if (!result.ok) {
      setError(bodyErrorMessage(result));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit(result.body);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col">
      {prompt && (
        <div className="mb-2 flex items-start gap-2">
          {stage && <CharacterArt stage={stage} size={48} crop />}
          <p className="rounded-2xl border border-line bg-cream px-3 py-2 text-sm">
            {prompt}
          </p>
        </div>
      )}
      <label htmlFor={textareaId} className="sr-only">
        {label}
      </label>
      <textarea
        id={textareaId}
        value={value}
        placeholder={placeholder}
        autoFocus
        onChange={(event) => setValue(event.target.value)}
        aria-invalid={error !== null}
        aria-describedby={error ? errorId : undefined}
        className="min-h-32 rounded-xl border border-line bg-white px-3 py-2.5"
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
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="submit"
          disabled={saving}
          className="min-h-11 rounded-xl bg-ember px-4 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? "保存しているよ…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-xl border border-line bg-white px-4 text-sm font-bold"
        >
          やめる
        </button>
      </div>
    </form>
  );
}
