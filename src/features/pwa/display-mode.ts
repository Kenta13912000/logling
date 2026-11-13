/** What `isStandalone` reads from the browser. */
export type DisplayEnv = {
  matchMedia: (query: string) => { matches: boolean };
  navigator: { standalone?: boolean };
};

/** True when logling was opened from the home screen (AC-5). */
export function isStandalone(env: DisplayEnv): boolean {
  // Bolt-2 ⑥: placeholder until ⑦ fills it in.
  void env;
  return false;
}

/** isStandalone for this browser; false while rendering on the server. */
export function useStandalone(): boolean {
  // Bolt-2 ⑥: placeholder until ⑦ fills it in.
  return false;
}
