/** Whether the focused element is a field for typing text (AC-9). */
export function isTextEntry(target: EventTarget | null): boolean {
  // Bolt-2 ⑥: placeholder until ⑦ fills it in.
  void target;
  return false;
}

/** True while a field for typing text is focused (AC-9). */
export function useTyping(): boolean {
  // Bolt-2 ⑥: placeholder until ⑦ fills it in.
  return false;
}
