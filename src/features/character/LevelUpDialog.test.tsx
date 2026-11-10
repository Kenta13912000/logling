import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { getStage } from "@/features/evolution/stages";

import { LevelUpDialog } from "./LevelUpDialog";

test("AC-12: 名前と新しいレベルのお知らせが表示される", () => {
  render(<LevelUpDialog name="ぴよ" level={2} onClose={() => {}} />);

  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveTextContent("ぴよ が レベル 2 になった！");
  expect(dialog).toHaveTextContent("これからもよろしくね");
});

test("character-evolution AC-6: 段階が変わったときは、新しい段階の絵と、すがたが変わったことが出る", () => {
  const { container } = render(
    <LevelUpDialog
      name="ぴよ"
      level={5}
      evolvedTo={getStage(5)}
      onClose={() => {}}
    />,
  );

  const dialog = screen.getByRole("dialog", {
    name: "ぴよ が ころねこ になった！",
  });
  expect(dialog).toHaveTextContent("レベル 5 になったよ");
  expect(dialog).not.toHaveTextContent("🎉");
  const art = container.querySelector("img");
  expect(art).toHaveAttribute("src", "/characters/stage-2.svg");
  expect(art).toHaveAttribute("alt", "");
  expect(screen.getByRole("button", { name: "とじる" })).toBeInTheDocument();
});

test("character-evolution AC-7: 段階が変わらないときは、これまでどおりのお知らせ", () => {
  const { container } = render(
    <LevelUpDialog name="ぴよ" level={2} onClose={() => {}} />,
  );

  expect(screen.getByRole("dialog")).toHaveTextContent(
    "ぴよ が レベル 2 になった！",
  );
  expect(container.querySelector("img")).not.toBeInTheDocument();
});

test("AC-12: 「とじる」を押すと閉じたことが伝わる", async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  render(<LevelUpDialog name="ぴよ" level={2} onClose={onClose} />);

  await user.click(screen.getByRole("button", { name: "とじる" }));

  expect(onClose).toHaveBeenCalledTimes(1);
});
