import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import type { SaveData } from "@/features/home/save-data";

import { MigrationChoice } from "./MigrationChoice";

const browser: SaveData = {
  version: 1,
  character: { name: "ぴよ", totalExp: 180 },
  entries: Array.from({ length: 12 }, (_, i) => ({
    date: `2026-10-${String(i + 1).padStart(2, "0")}`,
    body: `日記 ${i + 1}`,
    createdAt: "2026-10-01T12:00:00.000Z",
  })),
};
const account: SaveData = {
  version: 1,
  character: { name: "たま", totalExp: 0 },
  entries: [],
};

function setup() {
  const onConfirm = vi.fn();
  const user = userEvent.setup();
  render(
    <MigrationChoice
      browser={browser}
      account={account}
      busy={false}
      onConfirm={onConfirm}
    />,
  );
  return { user, onConfirm };
}

test("AC-18: どちらのキャラクターで続けるかを、名前・段階・レベル・日記の件数を見比べて選べる", () => {
  setup();

  expect(
    screen.getByRole("heading", { name: "どちらのキャラクターで続ける？" }),
  ).toBeInTheDocument();
  const mine = screen.getByRole("region", { name: "このブラウザ" });
  expect(mine).toHaveTextContent("ぴよ");
  expect(mine).toHaveTextContent("ころねこ");
  expect(mine).toHaveTextContent("Lv. 5・日記 12 件");
  const theirs = screen.getByRole("region", {
    name: "アカウント（ほかの端末）",
  });
  expect(theirs).toHaveTextContent("たま");
  expect(theirs).toHaveTextContent("Lv. 1・日記 0 件");
});

test("AC-19: ブラウザの方を選ぶと、アカウントのキャラクターが消えて元に戻せないことの確認が出て、確認すると決まる", async () => {
  const { user, onConfirm } = setup();

  await user.click(screen.getByRole("button", { name: "ぴよ で続ける" }));
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveTextContent("ぴよ で続ける？");
  expect(dialog).toHaveTextContent(
    "アカウントの たま（Lv. 1・日記 0 件）は消えるよ。",
  );
  expect(dialog).toHaveTextContent("元にはもどせないよ。");
  await user.click(
    within(dialog).getByRole("button", { name: "たま を消して ぴよ で続ける" }),
  );

  expect(onConfirm).toHaveBeenCalledWith("browser");
});

test("AC-19: アカウントの方を選ぶと、このブラウザのキャラクターが消えることの確認が出て、確認すると決まる", async () => {
  const { user, onConfirm } = setup();

  await user.click(screen.getByRole("button", { name: "たま で続ける" }));
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveTextContent(
    "このブラウザの ぴよ（Lv. 5・日記 12 件）は消えるよ。",
  );
  await user.click(
    within(dialog).getByRole("button", { name: "ぴよ を消して たま で続ける" }),
  );

  expect(onConfirm).toHaveBeenCalledWith("account");
});

test("AC-20: 確認でやめると、選ぶ画面に戻り、何も決まらない", async () => {
  const { user, onConfirm } = setup();

  await user.click(screen.getByRole("button", { name: "ぴよ で続ける" }));
  await user.click(screen.getByRole("button", { name: "えらびなおす" }));

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "どちらのキャラクターで続ける？" }),
  ).toBeInTheDocument();
  expect(onConfirm).not.toHaveBeenCalled();
});
