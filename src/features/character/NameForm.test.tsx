import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { NameForm } from "./NameForm";

function setup() {
  const onSubmit = vi.fn();
  render(<NameForm onSubmit={onSubmit} />);
  return {
    onSubmit,
    input: screen.getByLabelText("名前（10 文字まで）"),
    button: screen.getByRole("button", { name: "この名前にする" }),
  };
}

test("AC-1: 名前の入力欄とあいさつが表示される", () => {
  setup();
  expect(screen.getByText(/名前をつけてくれる？/)).toBeInTheDocument();
});

test("AC-2: 1〜10 文字の名前を決定すると、前後の空白を除いた名前が渡される", async () => {
  const user = userEvent.setup();
  const { onSubmit, input, button } = setup();

  await user.type(input, " ぴよ ");
  await user.click(button);

  expect(onSubmit).toHaveBeenCalledWith("ぴよ");
});

test("AC-3: 空のまま決定するとメッセージが出て、名前は渡されない", async () => {
  const user = userEvent.setup();
  const { onSubmit, button } = setup();

  await user.click(button);

  expect(screen.getByText(/名前を入れてね/)).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("AC-4: 11 文字以上で決定するとメッセージが出て、名前は渡されない", async () => {
  const user = userEvent.setup();
  const { onSubmit, input, button } = setup();

  await user.type(input, "あいうえおかきくけこさ");
  await user.click(button);

  expect(screen.getByText(/名前は 10 文字までにしてね/)).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});
