import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { LevelUpDialog } from "./LevelUpDialog";

test("AC-12: 名前と新しいレベルのお知らせが表示される", () => {
  render(<LevelUpDialog name="ぴよ" level={2} onClose={() => {}} />);

  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveTextContent("ぴよ が レベル 2 になった！");
  expect(dialog).toHaveTextContent("これからもよろしくね");
});

test("AC-12: 「とじる」を押すと閉じたことが伝わる", async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  render(<LevelUpDialog name="ぴよ" level={2} onClose={onClose} />);

  await user.click(screen.getByRole("button", { name: "とじる" }));

  expect(onClose).toHaveBeenCalledTimes(1);
});
