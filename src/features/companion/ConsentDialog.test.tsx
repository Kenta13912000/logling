import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { ConsentDialog } from "./ConsentDialog";

function setup() {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConsentDialog name="ちびすけ" onConfirm={onConfirm} onCancel={onCancel} />,
  );
  const dialog = screen.getByRole("dialog", { name: "コメントをオンにする？" });
  return { onConfirm, onCancel, dialog };
}

test("AC-2: 送るもの・送り先・送ったものの扱い（説明ページへのリンク）が、ふだんの言葉で書かれている", () => {
  const { dialog } = setup();

  expect(dialog).toHaveTextContent(
    "日記を書くたびに、その日記を AI に読んでもらって、ちびすけのコメントを作るよ。",
  );
  expect(dialog).toHaveTextContent("送るもの");
  expect(dialog).toHaveTextContent(
    // fix/companion-name: the name is no longer sent.
    "その日の日記の本文だけ",
  );
  expect(dialog).toHaveTextContent("送り先");
  expect(dialog).toHaveTextContent("AI のサービス（Anthropic の Claude）");
  expect(dialog).toHaveTextContent("送ったものの扱い");
  expect(
    within(dialog).getByRole("link", { name: /日記の保存のしかた/ }),
  ).toHaveAttribute("href", "/privacy");
  expect(dialog).toHaveTextContent("いつでもオフにできるよ");
});

test("AC-2: 開いたときは「やめる」にフォーカスがある（うっかり Enter でオンにならない）", () => {
  const { dialog } = setup();

  expect(within(dialog).getByRole("button", { name: "やめる" })).toHaveFocus();
});

test("AC-2: 「オンにする」で onConfirm、「やめる」で onCancel だけが呼ばれる", async () => {
  const user = userEvent.setup();
  const { dialog, onConfirm, onCancel } = setup();

  await user.click(within(dialog).getByRole("button", { name: "オンにする" }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(onCancel).not.toHaveBeenCalled();

  // 「やめる」 closes the dialog, which reports a cancel.
  await user.click(within(dialog).getByRole("button", { name: "やめる" }));
  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onConfirm).toHaveBeenCalledTimes(1);
});
