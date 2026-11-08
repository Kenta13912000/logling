import { useEffect, useRef } from "react";

export const EXP_GAIN_TOAST_MS = 2500;

type Props = {
  /** EXP for the entry itself (10, or 5 when written later). */
  amount: number;
  /** Streak bonus, shown as a second line when the entry earned one. */
  bonus?: { days: number; amount: number };
  onDone: () => void;
};

export function ExpGainToast({ amount, bonus, onDone }: Props) {
  // Keep the latest callback without restarting the timer on re-render.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const timer = setTimeout(() => onDoneRef.current(), EXP_GAIN_TOAST_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <p
      role="status"
      className="fixed top-14 left-1/2 -translate-x-1/2 rounded-2xl bg-ink px-4 py-1.5 text-center text-sm whitespace-nowrap text-white"
    >
      {`✨ +${amount} 経験値！`}
      {bonus && (
        <>
          <br />
          {`🔥 ${bonus.days} 日連続！ボーナス +${bonus.amount}`}
        </>
      )}
    </p>
  );
}
