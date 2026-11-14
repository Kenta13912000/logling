/** Color names (without "--color-") and their values, e.g. cream → #fff8ec. */
export type Palette = Record<string, string>;

/** Every "--color-name: value;" inside `block`. */
function colors(block: string): Palette {
  const palette: Palette = {};
  for (const [, name, value] of block.matchAll(
    /--color-([\w-]+)\s*:\s*([^;]+);/g,
  )) {
    palette[name!] = value!.trim();
  }
  return palette;
}

/** The text between the "{" after `start` and its matching "}". */
function blockAfter(css: string, start: RegExp): string {
  const match = start.exec(css);
  if (match === null) {
    return "";
  }
  const open = css.indexOf("{", match.index);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") {
      depth += 1;
    } else if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        return css.slice(open + 1, i);
      }
    }
  }
  return "";
}

/**
 * Reads the light colors (@theme) and the dark colors (the light ones with
 * the prefers-color-scheme: dark overrides) from globals.css. Used by tests.
 */
export function readPalette(css: string): { light: Palette; dark: Palette } {
  const light = colors(blockAfter(css, /@theme\b/));
  const overrides = colors(
    blockAfter(css, /@media\s*\(prefers-color-scheme:\s*dark\)/),
  );
  return { light, dark: { ...light, ...overrides } };
}
