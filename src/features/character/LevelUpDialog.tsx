import { useEffect, useId, useRef } from "react";

type Props = {
  name: string;
  level: number;
  onClose: () => void;
};

export function LevelUpDialog({ name, level, onClose }: Props) {
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
      className="m-auto w-[calc(100%-3rem)] max-w-sm rounded-2xl bg-white p-6 text-center text-ink backdrop:bg-ink/45"
    >
      <p aria-hidden="true" className="text-5xl leading-none">
        🎉
      </p>
      <p id={titleId} className="mt-3 mb-1 text-xl font-bold">
        {`${name} が レベル ${level} になった！`}
      </p>
      <p>これからもよろしくね</p>
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
