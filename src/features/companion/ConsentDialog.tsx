type Props = {
  /** The character's name, used in the explanation. */
  name: string;
  onConfirm: () => void;
  /** Called for 「やめる」 and whenever the dialog closes (e.g. Esc). */
  onCancel: () => void;
};

/** The confirmation before turning comments on (AC-2, mockup screen 2). */
export function ConsentDialog({ name, onConfirm, onCancel }: Props) {
  // Bolt-3 ⑥: placeholder until ⑦ fills it in.
  void [name, onConfirm, onCancel];
  return null;
}
