/** Color names (without "--color-") and their values, e.g. cream → #fff8ec. */
export type Palette = Record<string, string>;

/**
 * Reads the light colors (@theme) and the dark colors (the light ones with
 * the prefers-color-scheme: dark overrides) from globals.css. Used by tests.
 */
export function readPalette(css: string): { light: Palette; dark: Palette } {
  // settings Bolt-2 ⑥: placeholder until ⑦ fills it in.
  void css;
  return { light: {}, dark: {} };
}
