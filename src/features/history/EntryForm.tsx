import { useId, useState, type SubmitEvent } from "react";

import {
  BODY_MAX_LENGTH,
  bodyErrorMessage,
  validateBody,
} from "@/features/diary/diary";
import { countCharacters } from "@/lib/text";

type Props = {
  /** Accessible name of the textarea, e.g. "11月7日の日記". */
  label: string;
  initialBody: string;
  /** Question from the character above the textarea, when writing later. */
  prompt?: string;
  placeholder?: string;
  submitLabel: string;
  /** Receives the trimmed, valid body. */
  onSubmit: (body: string) => void;
  onCancel: () => void;
};

/** Body input shown inside a history card. */
export function EntryForm({
  label,
  initialBody,
  prompt,
  placeholder,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const textareaId = useId();
  const errorId = useId();
  const [value, setValue] = useState(initialBody);
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
    onSubmit(result.body);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col">
      {prompt && (
        <div className="mb-2 flex items-start gap-2">
          <span aria-hidden="true" className="text-2xl leading-tight">
            🐣
          </span>
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
          className="min-h-11 rounded-xl bg-ember px-4 text-sm font-bold text-white"
        >
          {submitLabel}
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
