import { useEffect } from "react";

/** How long the "moved" notice stays on screen. */
export const MOVED_TOAST_MS = 4000;

type Props = {
  name: string;
  count: number;
  onDone: () => void;
};

/** Tells the person their browser data is now in the account (AC-14). */
export function MovedToast({ name, count, onDone }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDone, MOVED_TOAST_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <p
      role="status"
      className="fixed inset-x-4 bottom-6 mx-auto max-w-[440px] rounded-2xl bg-ink px-4 py-3 text-center font-bold text-white"
    >
      {`☁ ${name} と日記 ${count} 件をアカウントに移したよ`}
    </p>
  );
}
