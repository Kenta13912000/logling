import { expect, test } from "vitest";

import manifest from "./manifest";

test("AC-1: 名前は「logling」で、アドレス欄のない画面で、ホームから始まる", () => {
  expect(manifest()).toMatchObject({
    name: "logling",
    short_name: "logling",
    description: "日記を書くとキャラクターが育つ、続けたくなる日記アプリ",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "ja",
    background_color: "#fff8ec",
    theme_color: "#fff8ec",
  });
});

test("AC-2: アイコンは、192px・512px の PNG と、切り抜かれる用の 512px の PNG", () => {
  expect(manifest().icons).toEqual([
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
  ]);
});
