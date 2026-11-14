import { useId } from "react";

type Props = {
  /** The text that could not be saved. */
  body: string;
  hint?: string;
};

/**
 * Text written on this device that another device's change kept from
 * being saved (AC-13). Shown so it is not lost and can be copied.
 */
export function UnsavedText({
  body,
  hint = "必要なら、コピーして振り返りの画面から書き直してね",
}: Props) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="mx-4 mt-3">
      <h2 id={titleId} className="text-sm font-bold">
        この端末で書いていた文（保存されていないよ）
      </h2>
      <p className="mt-2 rounded-xl border border-dashed border-line bg-surface px-3 py-2.5 text-sm whitespace-pre-wrap">
        {body}
      </p>
      <p className="mt-1 text-sm text-ink-muted">{hint}</p>
    </section>
  );
}
