import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { UnsavedText } from "./UnsavedText";

test("AC-13: 保存されなかった文を、そのことがわかる見出しとコピーの案内といっしょに出す", () => {
  render(<UnsavedText body={"今日は駅まで歩いた。\n手袋を出した。"} />);

  const box = screen.getByRole("region", {
    name: "この端末で書いていた文（保存されていないよ）",
  });
  expect(box).toHaveTextContent("今日は駅まで歩いた。");
  expect(box).toHaveTextContent("手袋を出した。");
  expect(box).toHaveTextContent(
    "必要なら、コピーして振り返りの画面から書き直してね",
  );
});
