import type { Stage } from "@/features/evolution/stages";

import type { CommentState } from "./useComments";

type Props = {
  /** The character's name, shown as 「<名前>より」. */
  name: string;
  stage: Stage;
  /** Width of the art: 48 on home, 36 in the history list. */
  size: number;
  state: CommentState;
  /** 「もう一度」 after the comment could not be made. */
  onRetry: () => void;
};

/** The character's comment under one entry (AC-5, AC-13 to AC-15). */
export function CommentBubble({ name, stage, size, state, onRetry }: Props) {
  // Bolt-4 ⑥: placeholder until ⑦ fills it in.
  void [name, stage, size, state, onRetry];
  return null;
}
