import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { EntryForm } from "./EntryForm";

function setup(initialBody = "今日は晴れた。") {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  render(
    <EntryForm
      label="11月7日の日記"
      initialBody={initialBody}
      submitLabel="保存する"
      onSubmit={onSubmit}
      onCancel={onCancel}
    />,
  );
  return {
    user,
    onSubmit,
    onCancel,
    textarea: screen.getByRole("textbox", { name: "11月7日の日記" }),
    submit: screen.getByRole("button", { name: "保存する" }),
  };
}

test("AC-6: 入力欄には今の本文と文字数が入り、入力欄にフォーカスがある", () => {
  const { textarea } = setup();

  expect(textarea).toHaveValue("今日は晴れた。");
  expect(textarea).toHaveFocus();
  expect(screen.getByText("7 / 2000")).toBeInTheDocument();
});

test("AC-7: 保存すると、前後の空白・改行を除いた本文が渡される", async () => {
  const { user, onSubmit, textarea, submit } = setup();

  await user.clear(textarea);
  await user.type(textarea, "  雨だった。{Enter}");
  await user.click(submit);

  expect(onSubmit).toHaveBeenCalledWith("雨だった。");
});

test("AC-8: 空にして保存すると、diary-exp と同じメッセージが出て、本文は渡されない", async () => {
  const { user, onSubmit, textarea, submit } = setup();

  await user.clear(textarea);
  await user.click(submit);

  expect(
    screen.getByText(/なにか書いてくれるとうれしいな/),
  ).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("AC-8: 2001 文字で保存すると、diary-exp と同じメッセージが出て、本文は渡されない", async () => {
  const { user, onSubmit, textarea, submit } = setup("");

  await user.click(textarea);
  await user.paste("あ".repeat(2001));
  await user.click(submit);

  expect(
    screen.getByText(/2000 文字までにしてね（いま 2001 文字）/),
  ).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("AC-9: 「やめる」を押すと、やめたことが伝わり、本文は渡されない", async () => {
  const { user, onSubmit, onCancel, textarea } = setup();

  await user.type(textarea, "書き足し");
  await user.click(screen.getByRole("button", { name: "やめる" }));

  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onSubmit).not.toHaveBeenCalled();
});
