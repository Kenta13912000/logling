import { useId, useState, type FormEvent } from "react";

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateName(value);
    if (!result.ok) {
      setError(ERROR_MESSAGES[result.reason]);
      return;
    }
    setError(null);
    onSubmit(result.name);
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
