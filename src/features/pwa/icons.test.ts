// @vitest-environment node
import sharp from "sharp";
import { describe, expect, test } from "vitest";

/*
 * The PNG icons are made from src/app/icon.svg by `npm run icons`
 * (scripts/make-icons.mjs) and kept in the repository.
 */

const CREAM = [0xff, 0xf8, 0xec];
const MASKABLE = "public/icons/icon-maskable-512.png";

/** Square app icons on a cream background, and the plain favicon. */
const ICONS = [
  ["public/icons/icon-192.png", 192, true],
  ["public/icons/icon-512.png", 512, true],
  [MASKABLE, 512, true],
  ["src/app/apple-icon.png", 180, true],
  ["src/app/icon1.png", 32, false],
] as const;

async function pixels(file: string) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return (x: number, y: number) => {
    const i = (Math.round(y) * info.width + Math.round(x)) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };
}

function isCream([r, g, b, a]: number[]) {
  return (
    a === 255 &&
    Math.abs(r - CREAM[0]) <= 2 &&
    Math.abs(g - CREAM[1]) <= 2 &&
    Math.abs(b - CREAM[2]) <= 2
  );
}

test.each(ICONS)("AC-2: %s は、%ipx の正方形の PNG", async (file, size) => {
  const meta = await sharp(file).metadata();
  expect(meta.format).toBe("png");
  expect(meta.width).toBe(size);
  expect(meta.height).toBe(size);
});

describe("背景", () => {
  test.each(ICONS.filter(([, , filled]) => filled))(
    "AC-2: %s は、四すみがクリーム色で、透けない（ホーム画面で黒くならない）",
    async (file, size) => {
      const at = await pixels(file);
      const last = size - 1;
      for (const [x, y] of [
        [0, 0],
        [last, 0],
        [0, last],
        [last, last],
      ]) {
        expect(isCream(at(x, y)), `${file} の (${x}, ${y})`).toBe(true);
      }
    },
  );
});

test("AC-2: 切り抜かれる用のアイコンは、真ん中の丸（直径の 80%）の外がクリーム色で、丸く切り抜かれても絵が欠けない", async () => {
  const at = await pixels(MASKABLE);
  const center = 256;
  // Just outside the 40% radius safe zone, all the way around.
  const radius = 512 * 0.41;
  for (let step = 0; step < 36; step++) {
    const angle = (step / 36) * 2 * Math.PI;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    expect(isCream(at(x, y)), `角度 ${step * 10}°`).toBe(true);
  }
  // The character itself is drawn in the middle.
  expect(isCream(at(center, center))).toBe(false);
});

test("AC-2: ファビコンの PNG は、絵のまわりが透けている（タブの色になじむ）", async () => {
  const at = await pixels("src/app/icon1.png");
  expect(at(0, 0)[3]).toBe(0);
});
