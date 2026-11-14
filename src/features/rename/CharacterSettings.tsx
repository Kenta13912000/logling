"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type SubmitEvent } from "react";

import { NAME_ERROR_MESSAGES } from "@/features/character/name";
import { useDiaryData } from "@/features/cloud/useDiaryData";

import { planRename, withName } from "./rename";

const SAVE_ERROR = "⚠ 保存できなかった…通信できるところで、もう一度ためしてね";
const GONE =
  "⚠ ほかの端末で、キャラクターがなくなっていたよ。最新の内容を表示したよ";

/** The card's contents: the name, the input, or the confirmation. */
type Step =
  | { kind: "view" }
  | { kind: "edit"; value: string; error: string | null }
  | { kind: "confirm"; value: string; name: string };

/** Shown in the card after a save that did not go through. */
type Notice = "saveFailed" | "gone" | null;

const PRIMARY =
  "mt-3 min-h-12 w-full rounded-xl bg-ember font-bold text-white disabled:opacity-60";
const SECONDARY =
  "mt-3 min-h-12 w-full rounded-xl border border-line bg-white font-bold disabled:opacity-60";

function HomeLink({ children }: { children: string }) {
  return (
    <Link href="/" className="font-bold text-ember underline">
      {children}
      <span aria-hidden="true">&nbsp;›</span>
    </Link>
  );
}

/**
 * The 「キャラクター」 group on the settings page: the current name and the
 * way to change it (docs/aidlc/settings/mockup.md, AC-1 to AC-10).
 */
export function CharacterSettings() {
  const { state, save, reload } = useDiaryData();
  const inputId = useId();
  const errorId = useId();
  const [step, setStep] = useState<Step>({ kind: "view" });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const changeRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLParagraphElement>(null);
  // The step focus was last moved for, so the first view stays unfocused
  // even when React runs the effect twice in development (as in NameForm).
  const focusedStep = useRef<Step["kind"]>("view");

  // Move focus with the step so screen readers announce the change.
  useEffect(() => {
    if (focusedStep.current === step.kind) {
      return;
    }
    focusedStep.current = step.kind;
    if (step.kind === "edit") {
      inputRef.current?.focus();
    } else if (step.kind === "confirm") {
      confirmRef.current?.focus();
    } else {
      changeRef.current?.focus();
    }
  }, [step.kind]);

  if (state.status === "loading") {
    return (
      <p role="status" className="text-ink-muted">
        読み込んでいるよ…
      </p>
    );
  }
  if (state.status === "loadFailed") {
    return (
      <>
        <p className="font-bold">データを読み込めなかった…</p>
        <p className="mt-1 text-ink-muted">
          通信できるところで、もう一度ためしてね
        </p>
        <button type="button" onClick={reload} className={SECONDARY}>
          もう一度読み込む
        </button>
      </>
    );
  }
  if (state.status === "broken") {
    // Repairing is left to home, which explains what will be lost.
    return (
      <p>
        データを読めなかったよ。<HomeLink>ホームで直してね</HomeLink>
      </p>
    );
  }

  const data = state.data;
  const character = data.character;

  const noticeText =
    notice === "saveFailed" ? SAVE_ERROR : notice === "gone" ? GONE : null;
  const alert = noticeText && (
    <p role="alert" className="mt-2 text-alert">
      {noticeText}
    </p>
  );

  if (character === null) {
    return (
      <>
        <p>
          まだ名前がないよ。<HomeLink>ホームで名前を付けてね</HomeLink>
        </p>
        {alert}
      </>
    );
  }

  async function rename(name: string) {
    if (saving) {
      return;
    }
    setSaving(true);
    const outcome = await save(
      { type: "renameCharacter", name },
      withName(data, name),
    );
    setSaving(false);
    setNotice(
      outcome === "saved"
        ? null
        : outcome === "conflict"
          ? "gone"
          : "saveFailed",
    );
    setStep({ kind: "view" });
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step.kind !== "edit" || character === null) {
      return;
    }
    const plan = planRename(character.name, step.value);
    if (plan.kind === "invalid") {
      setStep({ ...step, error: NAME_ERROR_MESSAGES[plan.reason] });
    } else if (plan.kind === "same") {
      setStep({ kind: "view" });
    } else {
      setStep({ kind: "confirm", value: step.value, name: plan.name });
    }
  }

  if (step.kind === "edit") {
    return (
      <form onSubmit={handleSubmit} noValidate className="flex flex-col">
        <label htmlFor={inputId} className="mb-1.5 font-bold">
          新しい名前（10 文字まで）
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={step.value}
          onChange={(event) => setStep({ ...step, value: event.target.value })}
          autoComplete="off"
          aria-invalid={step.error !== null}
          aria-describedby={step.error ? errorId : undefined}
          className="min-h-11 rounded-xl border border-line bg-white px-3 py-2.5 text-base"
        />
        {step.error && (
          <p id={errorId} role="alert" className="mt-1.5 text-alert">
            ⚠ {step.error}
          </p>
        )}
        <button type="submit" className={PRIMARY}>
          この名前にする
        </button>
        <button
          type="button"
          onClick={() => setStep({ kind: "view" })}
          className={SECONDARY}
        >
          やめる
        </button>
      </form>
    );
  }

  if (step.kind === "confirm") {
    return (
      <section aria-label="名前の確認" className="flex flex-col text-center">
        <p
          ref={confirmRef}
          tabIndex={-1}
          className="text-[17px] font-bold break-all focus:outline-none"
        >
          {`「${step.name}」に変える？`}
        </p>
        <p className="mt-1 text-ink-muted">
          経験値やレベル、日記はそのままだよ
        </p>
        <button
          type="button"
          disabled={saving}
          onClick={() => rename(step.name)}
          className={PRIMARY}
        >
          {saving ? "保存しているよ…" : "変える"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            setStep({ kind: "edit", value: step.value, error: null })
          }
          className={SECONDARY}
        >
          やめる
        </button>
      </section>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-ink-muted">名前</p>
          <p className="text-[17px] font-bold break-all">{character.name}</p>
        </div>
        <button
          ref={changeRef}
          type="button"
          onClick={() => {
            setNotice(null);
            setStep({ kind: "edit", value: character.name, error: null });
          }}
          className="min-h-11 flex-none rounded-xl border border-line bg-white px-3.5 font-bold"
        >
          名前を変える
        </button>
      </div>
      {alert}
    </>
  );
}
