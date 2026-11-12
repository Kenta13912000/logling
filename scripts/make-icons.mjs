/*
 * Makes logling's PNG icons from the favicon, src/app/icon.svg (the stage 1
 * character). Run `npm run icons` after redrawing it; the PNGs are kept in
 * the repository (pwa-reminder Bolt-1).
 */
import { mkdir, readFile } from "node:fs/promises";

import sharp from "sharp";

const CREAM = { r: 0xff, g: 0xf8, b: 0xec };
const svg = await readFile("src/app/icon.svg");

/** The character as a transparent PNG, `size` pixels square. */
function art(size) {
  // Rasterize well above the target size, then shrink, for clean edges.
  return sharp(svg, { density: 1200 }).resize(size, size).png().toBuffer();
}

/** A cream square with the character in the middle, `ratio` of its width. */
async function onCream(size, ratio, file) {
  const character = await art(Math.round(size * ratio));
  await sharp({
    create: { width: size, height: size, channels: 3, background: CREAM },
  })
    .composite([{ input: character, gravity: "center" }])
    .png()
    .toFile(file);
}

await mkdir("public/icons", { recursive: true });

// Home screens (Android and others) and the splash screen.
await onCream(192, 0.8, "public/icons/icon-192.png");
await onCream(512, 0.8, "public/icons/icon-512.png");
// Cut to a circle or rounded square: keep the art inside the middle 80%.
await onCream(512, 0.6, "public/icons/icon-maskable-512.png");
// iPhone home screen; Next.js links it as apple-touch-icon.
await onCream(180, 0.75, "src/app/apple-icon.png");
// PNG favicon next to icon.svg, for browsers that skip SVG favicons.
await sharp(await art(32)).toFile("src/app/icon1.png");

console.log("icons: made 5 PNG files from src/app/icon.svg");
