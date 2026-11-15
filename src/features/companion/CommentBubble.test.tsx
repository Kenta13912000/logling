import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { STAGES } from "@/features/evolution/stages";

import { CommentBubble } from "./CommentBubble";
import type { CommentState } from "./useComments";

function show(state: CommentState) {
  const onRetry = vi.fn();
  const { container } = render(
    <CommentBubble
      name="ちびすけ"
      stage={STAGES[1]!}
      size={48}
      state={state}
      onRetry={onRetry}
    />,
  );
  return { onRetry, container };
}

test("AC-5: できたコメントは、「<名前>より」と一緒に、文字としてそのまま出る", () => {
  show({ kind: "comment", text: "発表おつかれさま！<b>すごい</b>" });

  expect(screen.getByText("ちびすけより")).toBeInTheDocument();
  expect(
    screen.getByText("発表おつかれさま！<b>すごい</b>"),
  ).toBeInTheDocument();
});

test("AC-5: 作っている間は「<名前>が読んでいるよ…」で、読み上げでも伝わる", () => {
  const { container } = show({ kind: "pending" });

  expect(screen.getByRole("status")).toHaveTextContent(
    "ちびすけが読んでいるよ…",
  );
  expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
});

test("AC-13: 作れなかったときは「コメントを作れなかった…」と「もう一度」が出て、押すと頼み直す", async () => {
  const user = userEvent.setup();
  const { onRetry } = show({ kind: "failed" });

  expect(screen.getByText("コメントを作れなかった…")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "もう一度" }));

  expect(onRetry).toHaveBeenCalledTimes(1);
});

test("AC-14, AC-15: 上限のときは、その文が出て、「もう一度」は出ない", () => {
  show({ kind: "dailyLimit" });
  expect(
    screen.getByText("今日のコメントはここまで。また明日ね"),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "もう一度" }),
  ).not.toBeInTheDocument();
});

test("AC-15: 月の上限のときは「今月のコメントはお休み中だよ」", () => {
  show({ kind: "monthlyLimit" });

  expect(screen.getByText("今月のコメントはお休み中だよ")).toBeInTheDocument();
});

test("AC-5: キャラクターの絵（今の段階）が横に出る", () => {
  const { container } = show({ kind: "comment", text: "いいね" });

  expect(container.querySelector("img")).toHaveAttribute("src", STAGES[1]!.src);
});
