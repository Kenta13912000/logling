import type { StreakStatus } from "./streak";

type Props = {
  status: StreakStatus;
};

function headline({ writtenToday, days }: StreakStatus): string {
  if (writtenToday) {
    return `${days} 日連続`;
  }
  // Never say "0 days": point at what writing today gives instead.
  return days === 0
    ? "今日書くと 1 日目！"
    : `${days} 日連続中。今日書くと ${days + 1} 日！`;
}

/** The 🔥 band under the EXP bar: the streak and the next milestone. */
export function StreakBand({ status }: Props) {
  const { next } = status;

  return (
    <div
      role="group"
      aria-label="連続記録"
      className="mt-3 rounded-xl bg-honey-track px-3 py-2"
    >
      <p className="font-bold">
        <span aria-hidden="true">🔥</span> {headline(status)}
      </p>
      <p className="text-sm text-ink-muted">
        {`あと ${next.remaining} 日で ${next.days} 日連続。ボーナス +${next.bonus}`}
      </p>
    </div>
  );
}
