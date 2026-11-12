import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
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

test("tab-navigation AC-12: 開発中と同じく準備の処理を 2 回動かしても、開いたときに名前の入力欄は選ばれていない（下のタブが隠れない）", () => {
  render(
    <StrictMode>
      <NameForm onSubmit={vi.fn()} />
    </StrictMode>,
  );

  expect(screen.getByLabelText("名前（10 文字まで）")).not.toHaveFocus();
});

test("account-sync AC-2: ほかの端末で使っていた人は、名前を付ける前にログインの画面に行ける", () => {
  setup();

  expect(
    screen.getByRole("link", { name: /ほかの端末で使っていた人は ログイン/ }),
  ).toHaveAttribute("href", "/account");
});

test("account-sync AC-33: 名前を保存している間は「これにする」が「保存しているよ…」になって押せず、終わると元に戻る", async () => {
  const user = userEvent.setup();
  let finish = () => {};
  const onSubmit = vi.fn(
    () => new Promise<void>((resolve) => (finish = resolve)),
  );
  render(<NameForm onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText("名前（10 文字まで）"), "ぴよ");
  await user.click(screen.getByRole("button", { name: "この名前にする" }));
  await user.click(screen.getByRole("button", { name: "これにする" }));
  const saving = screen.getByRole("button", { name: "保存しているよ…" });
  expect(saving).toBeDisabled();
  await user.click(saving);
  expect(onSubmit).toHaveBeenCalledTimes(1);

  await act(async () => finish());
  expect(screen.getByRole("button", { name: "これにする" })).toBeEnabled();
});

const stageOneArt = () =>
  document.querySelector('img[src="/characters/stage-1.svg"]');

test("character-evolution AC-3: 名前の入力では、段階 1 の絵が飾りとして出る", () => {
  setup();

  expect(stageOneArt()).toHaveAttribute("alt", "");
});

test("character-evolution AC-3: 名前の確認でも、段階 1 の絵が出る", async () => {
  const user = userEvent.setup();
  const { input, button } = setup();

  await user.type(input, "ぴよ");
  await user.click(button);

  expect(screen.getByText("「ぴよ」でいい？")).toBeInTheDocument();
  expect(stageOneArt()).toHaveAttribute("alt", "");
});

test("AC-2: 1〜10 文字の名前を決定して確認すると、前後の空白を除いた名前が渡される", async () => {
  const user = userEvent.setup();
  const { onSubmit, input, button } = setup();

  await user.type(input, " ぴよ ");
  await user.click(button);
  await user.click(screen.getByRole("button", { name: "これにする" }));

  expect(onSubmit).toHaveBeenCalledWith("ぴよ");
});

test("AC-23: 名前を決定すると確認が表示され、まだ名前は渡されない", async () => {
  const user = userEvent.setup();
  const { onSubmit, input, button } = setup();

  await user.type(input, " ぴよ ");
  await user.click(button);

  expect(screen.getByText("「ぴよ」でいい？")).toBeInTheDocument();
  expect(screen.getByText("名前はあとから変えられないよ")).toBeInTheDocument();
  expect(screen.getByText("「ぴよ」でいい？")).toHaveFocus();
  expect(
    screen.queryByLabelText("名前（10 文字まで）"),
  ).not.toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("AC-23: 「えらびなおす」で入力欄に戻り、入力した名前が残っている", async () => {
  const user = userEvent.setup();
  const { onSubmit, input, button } = setup();

  await user.type(input, "ぴよ");
  await user.click(button);
  await user.click(screen.getByRole("button", { name: "えらびなおす" }));

  const back = screen.getByLabelText("名前（10 文字まで）");
  expect(back).toHaveValue("ぴよ");
  expect(back).toHaveFocus();
  expect(onSubmit).not.toHaveBeenCalled();
});

test("AC-23: エラーがあるときは確認に進まない", async () => {
  const user = userEvent.setup();
  const { button } = setup();

  await user.click(button);

  expect(
    screen.queryByRole("button", { name: "これにする" }),
  ).not.toBeInTheDocument();
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
