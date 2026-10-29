import { useEffect, useId, useRef, useState, type SubmitEvent } from "react";

import { validateName, type NameValidation } from "./name";

const ERROR_MESSAGES: Record<
  Extract<NameValidation, { ok: false }>["reason"],
  string
> = {
  empty: "名前を入れてね",
  tooLong: "名前は 10 文字までにしてね",
};

type Props = {
  onSubmit: (name: string) => void;
};

export function NameForm({ onSubmit }: Props) {
  const inputId = useId();
  const errorId = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  // The validated name waiting for confirmation, or null while typing.
  const [pendingName, setPendingName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLParagraphElement>(null);
  const isFirstRender = useRef(true);

  // Move focus with the step so screen readers announce the change.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (pendingName === null) {
      inputRef.current?.focus();
    } else {
      confirmRef.current?.focus();
    }
  }, [pendingName]);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateName(value);
    if (!result.ok) {
      setError(ERROR_MESSAGES[result.reason]);
      return;
    }
    setError(null);
    setPendingName(result.name);
  }

  if (pendingName !== null) {
    return (
      <section aria-label="名前の確認" className="flex flex-col p-4">
        <p aria-hidden="true" className="mt-8 mb-4 text-center text-8xl">
          🐣
        </p>
        <p
          ref={confirmRef}
          tabIndex={-1}
          className="text-center text-lg font-bold focus:outline-none"
        >
          {`「${pendingName}」でいい？`}
        </p>
        <p className="mt-2 text-center text-sm text-ink-muted">
          名前はあとから変えられないよ
        </p>
        <button
          type="button"
          onClick={() => onSubmit(pendingName)}
          className="mt-6 min-h-12 rounded-xl bg-ember font-bold text-white"
        >
          これにする
        </button>
        <button
          type="button"
          onClick={() => setPendingName(null)}
          className="mt-3 min-h-12 rounded-xl border border-line bg-white font-bold"
        >
          えらびなおす
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col p-4">
      <p aria-hidden="true" className="mt-8 mb-4 text-center text-8xl">
        🐣
      </p>
      <p className="text-center">
        はじめまして！
        <br />
        名前をつけてくれる？
      </p>
      <label htmlFor={inputId} className="mt-4 mb-1.5 text-sm font-bold">
        名前（10 文字まで）
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        autoComplete="off"
        aria-invalid={error !== null}
        aria-describedby={error ? errorId : undefined}
        className="min-h-11 rounded-xl border border-line bg-white px-3 py-2.5"
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-alert">
          ⚠ {error}
        </p>
      )}
      <button
        type="submit"
        className="mt-4 min-h-12 rounded-xl bg-ember font-bold text-white"
      >
        この名前にする
      </button>
    </form>
  );
}
