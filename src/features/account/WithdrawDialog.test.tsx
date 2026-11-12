import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import type { SaveData } from "@/features/home/save-data";

import { WithdrawDialog } from "./WithdrawDialog";

const piyo = {
  version: 1 as const,
  character: { name: "ぴよ", totalExp: 180 },
  entries: Array.from({ length: 12 }, (_, i) => ({
    date: `2026-10-${String(i + 1).padStart(2, "0")}`,
    body: `日記 ${i + 1}`,
    createdAt: "2026-10-01T12:00:00.000Z",
  })),
};

function setup(data: SaveData = piyo) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <WithdrawDialog
      data={data}
      busy={false}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );
  return { user: userEvent.setup(), onConfirm, onCancel };
}

test("AC-25: 消えるもの・元に戻せないこと・Google アカウントは消えないことがわかる", () => {
  setup();

  const dialog = screen.getByRole("dialog", { name: "退会する？" });
  expect(dialog).toHaveTextContent(
    "ぴよ（Lv. 5）と日記 12 件が、すべて消えるよ。",
  );
  expect(dialog).toHaveTextContent("元にはもどせないよ。");
  expect(dialog).toHaveTextContent("Google アカウントそのものは消えないよ");
});

test("AC-25: キャラクターがいないときは、アカウントの記録が消えることがわかる", () => {
  setup({ version: 1, character: null, entries: [] });

  expect(screen.getByRole("dialog")).toHaveTextContent(
    "アカウントの記録が、すべて消えるよ。",
  );
});

test("AC-26, AC-28: 「退会する」で決まり、「やめる」では何もしない", async () => {
  const { user, onConfirm, onCancel } = setup();

  await user.click(screen.getByRole("button", { name: "やめる" }));
  expect(onCancel).toHaveBeenCalled();
  expect(onConfirm).not.toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: "退会する" }));
  expect(onConfirm).toHaveBeenCalled();
});
