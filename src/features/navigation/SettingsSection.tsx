import { useId, type ReactNode } from "react";

type Props = { title: string; children: ReactNode };

/**
 * One group on the settings page: a small heading and a white card
 * (pwa-reminder). Read out as a region named after its heading.
 */
export function SettingsSection({ title, children }: Props) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="mt-5">
      <h2 id={headingId} className="mb-2 text-sm font-bold text-ink-muted">
        {title}
      </h2>
      <div className="rounded-2xl border border-line bg-surface px-4 py-3.5 text-sm">
        {children}
      </div>
    </section>
  );
}
