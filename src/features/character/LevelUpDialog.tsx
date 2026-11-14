import { useEffect, useId, useRef } from "react";

import { CharacterArt } from "@/features/evolution/CharacterArt";
import type { Stage } from "@/features/evolution/stages";

type Props = {
  name: string;
  level: number;
  /** The new stage when this level-up changed the character's look. */
  evolvedTo?: Stage;
  onClose: () => void;
};

export function LevelUpDialog({ name, level, evolvedTo, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // showModal() lets the browser trap focus and restore it on close.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-auto w-[calc(100%-3rem)] max-w-sm rounded-2xl bg-surface p-6 text-center text-ink backdrop:bg-scrim"
    >
      {evolvedTo ? (
        // The title below says the same, so the art is decorative.
        <div className="flex justify-center">
          <CharacterArt stage={evolvedTo} size={240} />
        </div>
      ) : (
        <p aria-hidden="true" className="text-5xl leading-none">
          🎉
        </p>
      )}
      <p id={titleId} className="mt-3 mb-1 text-xl font-bold">
        {evolvedTo
          ? `${name} が ${evolvedTo.name} になった！`
          : `${name} が レベル ${level} になった！`}
      </p>
      <p>{evolvedTo ? `レベル ${level} になったよ` : "これからもよろしくね"}</p>
      <button
        type="button"
        autoFocus
        onClick={() => dialogRef.current?.close()}
        className="mt-4 min-h-12 w-full rounded-xl bg-ember font-bold text-white"
      >
        とじる
      </button>
    </dialog>
  );
}
