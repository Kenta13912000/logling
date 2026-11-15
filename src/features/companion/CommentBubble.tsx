import { CharacterArt } from "@/features/evolution/CharacterArt";
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

const LIMITS = {
  dailyLimit: "今日のコメントはここまで。また明日ね",
  monthlyLimit: "今月のコメントはお休み中だよ",
} as const;

/**
 * The character's comment under one entry (AC-5, AC-13 to AC-15). The
 * comment is shown as plain text, never as HTML (ADR-0009).
 */
export function CommentBubble({ name, stage, size, state, onRetry }: Props) {
  let content;
  if (state.kind === "comment") {
    content = (
      <>
        <span className="block text-xs font-bold text-ink-muted">{`${name}より`}</span>
        <span className="whitespace-pre-wrap">{state.text}</span>
      </>
    );
  } else if (state.kind === "pending") {
    content = <span role="status">{`${name}が読んでいるよ…`}</span>;
  } else if (state.kind === "failed") {
    content = (
      <>
        コメントを作れなかった…
        <button
          type="button"
          onClick={onRetry}
          className="mt-1.5 block min-h-11 rounded-xl border border-line bg-surface px-4 text-sm font-bold"
        >
          もう一度
        </button>
      </>
    );
  } else {
    content = LIMITS[state.kind];
  }

  return (
    <div aria-live="polite" className="mt-3 flex items-start gap-2">
      <CharacterArt stage={stage} size={size} crop />
      <div className="min-w-0 rounded-2xl bg-ember-soft px-3 py-2 text-sm">
        {content}
      </div>
    </div>
  );
}
