import { useEffect, useRef } from "react";

export const EXP_GAIN_TOAST_MS = 2500;

type Props = {
  amount: number;
  onDone: () => void;
};

export function ExpGainToast({ amount, onDone }: Props) {
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
      className="fixed top-14 left-1/2 -translate-x-1/2 rounded-full bg-ink px-4 py-1.5 text-sm whitespace-nowrap text-white"
    >
      {`✨ +${amount} 経験値！`}
    </p>
  );
}
