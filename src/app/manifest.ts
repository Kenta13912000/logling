import type { MetadataRoute } from "next";

/** The cream page background (docs/aidlc/diary-exp/mockup.md). */
const CREAM = "#fff8ec";

/** How logling opens from the home screen (pwa-reminder AC-1, AC-2). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "logling",
    short_name: "logling",
    description: "日記を書くとキャラクターが育つ、続けたくなる日記アプリ",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "ja",
    background_color: CREAM,
    theme_color: CREAM,
    // Made from src/app/icon.svg by `npm run icons`.
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
