import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { DeleteDialog } from "./DeleteDialog";

function setup(lost: number, levelBefore: number, levelAfter: number) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <DeleteDialog
      date="2026-11-07"
      name="ぴよ"
      lost={lost}
      levelBefore={levelBefore}
      levelAfter={levelAfter}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );
  return { onConfirm, onCancel, dialog: screen.getByRole("dialog") };
}

test("AC-10: 確認には、消す日と減る経験値と、元に戻せないことが表示される", () => {
  const { dialog } = setup(10, 2, 2);

  expect(dialog).toHaveAccessibleName("11月7日の日記を消す？");
  expect(dialog).toHaveTextContent("消すと経験値が 10 減るよ。");
  expect(dialog).toHaveTextContent("消した日記は元に戻せないよ");
});

test("AC-10: 後から書いた日記なら、減る経験値は 5 と表示される", () => {
  const { dialog } = setup(5, 2, 2);

  expect(dialog).toHaveTextContent("消すと経験値が 5 減るよ。");
});

test("AC-11: レベルが下がるときは、下がった後のレベルも表示される", () => {
  const { dialog } = setup(10, 3, 2);

  expect(dialog).toHaveTextContent("ぴよ のレベルが 3 から 2 に下がるよ。");
});

test("AC-11: レベルが下がらないときは、レベルの文は出ない", () => {
  const { dialog } = setup(10, 2, 2);

  expect(dialog).not.toHaveTextContent(/下がるよ/);
});

test("AC-10: 開いたときは「やめる」にフォーカスがある（うっかり消さないため）", () => {
  setup(10, 2, 2);

  expect(screen.getByRole("button", { name: "やめる" })).toHaveFocus();
});

test("AC-12: 「消す」を押すと、消すことが伝わる", async () => {
  const user = userEvent.setup();
  const { onConfirm, onCancel } = setup(10, 2, 2);

  await user.click(screen.getByRole("button", { name: "消す" }));

  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(onCancel).not.toHaveBeenCalled();
});

test("AC-12: 「やめる」を押すと、やめたことが伝わる", async () => {
  const user = userEvent.setup();
  const { onConfirm, onCancel } = setup(10, 2, 2);

  await user.click(screen.getByRole("button", { name: "やめる" }));

  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onConfirm).not.toHaveBeenCalled();
});

test("streak AC-15: ボーナスが付いた日記なら、合計の減る量と内訳が出る", () => {
  render(
    <DeleteDialog
      date="2026-11-07"
      name="ぴよ"
      lost={30}
      bonus={{ amount: 20, days: 7 }}
      levelBefore={2}
      levelAfter={2}
      onConfirm={() => {}}
      onCancel={() => {}}
    />,
  );

  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveTextContent("消すと経験値が 30 減るよ。");
  expect(dialog).toHaveTextContent("（日記の 10 と、7 日連続のボーナス 20）");
});

test("streak AC-15: ボーナスが付いていなければ、内訳は出ない", () => {
  const { dialog } = setup(10, 2, 2);

  expect(dialog).not.toHaveTextContent("ボーナス");
});

test("character-evolution AC-12: 消すと前の段階に戻るときは、すがたも戻ることが出る", () => {
  // Lv. 5 is stage 2 and Lv. 4 is stage 1.
  const { dialog } = setup(10, 5, 4);

  expect(dialog).toHaveTextContent("ぴよ のレベルが 5 から 4 に下がるよ。");
  expect(dialog).toHaveTextContent("すがたも前にもどるよ。");
});

test("character-evolution AC-12: レベルが下がっても段階が同じなら、すがたの文は出ない", () => {
  const { dialog } = setup(10, 6, 5);

  expect(dialog).toHaveTextContent("ぴよ のレベルが 6 から 5 に下がるよ。");
  expect(dialog).not.toHaveTextContent("すがた");
});

test("AC-12: Esc キーなどで窓が閉じられたときも、やめたことになる", () => {
  const { onConfirm, onCancel, dialog } = setup(10, 2, 2);

  // jsdom has no Esc handling for <dialog>; the browser fires "close".
  fireEvent(dialog, new Event("close"));

  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onConfirm).not.toHaveBeenCalled();
});
