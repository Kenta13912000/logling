import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { DiaryEditor } from "./DiaryEditor";

function setup() {
  const user = userEvent.setup();
  const onSave = vi.fn();
  render(<DiaryEditor date="2026-10-28" onSave={onSave} />);
  return {
    user,
    onSave,
    textarea: screen.getByRole("textbox", { name: "今日の日記" }),
    button: screen.getByRole("button", { name: "日記をのこす" }),
  };
}

test("AC-5: 今日の日付・呼びかけ・入力欄・文字数が表示される", () => {
  setup();

  expect(screen.getByText("2026年10月28日（水）")).toBeInTheDocument();
  expect(
    screen.getByText("今日はどんな一日だった？きかせて！"),
  ).toBeInTheDocument();
  expect(screen.getByText("0 / 2000")).toBeInTheDocument();
});

test("AC-5: 入力すると文字数の表示が増える", async () => {
  const { user, textarea } = setup();

  await user.type(textarea, "晴れた");

  expect(screen.getByText("3 / 2000")).toBeInTheDocument();
});

test("AC-6: 保存すると、前後の空白・改行を除いた本文が渡される", async () => {
  const { user, onSave, textarea, button } = setup();

  await user.type(textarea, "  晴れた。{Enter}公園を歩いた。{Enter}");
  await user.click(button);

  expect(onSave).toHaveBeenCalledWith("晴れた。\n公園を歩いた。");
});

test("AC-7: 空のまま保存するとメッセージが出て、本文は渡されない", async () => {
  const { user, onSave, button } = setup();

  await user.click(button);

  expect(
    screen.getByText(/なにか書いてくれるとうれしいな/),
  ).toBeInTheDocument();
  expect(onSave).not.toHaveBeenCalled();
});

test("AC-8: 2001 文字で保存するとメッセージと文字数が出て、本文は渡されない", async () => {
  const { user, onSave, textarea, button } = setup();

  await user.click(textarea);
  await user.paste("あ".repeat(2001));
  await user.click(button);

  expect(
    screen.getByText(/2000 文字までにしてね（いま 2001 文字）/),
  ).toBeInTheDocument();
  expect(onSave).not.toHaveBeenCalled();
});

test("AC-8: 2000 文字ちょうどは保存できる", async () => {
  const { user, onSave, textarea, button } = setup();

  await user.click(textarea);
  await user.paste("あ".repeat(2000));
  await user.click(button);

  expect(onSave).toHaveBeenCalledWith("あ".repeat(2000));
});
