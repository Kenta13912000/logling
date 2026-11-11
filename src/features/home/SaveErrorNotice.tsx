type Props = {
  /**
   * Set while signed in (cloud): what to do once back online, e.g.
   * 「もう一度「日記をのこす」を押してね」 (AC-11).
   */
  cloudHint?: string;
};

/** Shown at the top of a page when saving failed. */
export function SaveErrorNotice({ cloudHint }: Props) {
  return (
    <p role="alert" className="mx-4 mt-4 text-sm text-alert">
      {cloudHint === undefined
        ? "⚠ 保存できなかった…少し時間をおいて、もう一度ためしてね"
        : `⚠ 保存できなかった…通信できるところで、${cloudHint}`}
    </p>
  );
}
