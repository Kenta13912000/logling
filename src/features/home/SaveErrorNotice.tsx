/** Shown at the top of a page when writing to the browser storage failed. */
export function SaveErrorNotice() {
  return (
    <p role="alert" className="mx-4 mt-4 text-sm text-alert">
      ⚠ 保存できなかった…少し時間をおいて、もう一度ためしてね
    </p>
  );
}
