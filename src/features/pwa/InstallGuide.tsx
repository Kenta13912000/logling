"use client";

import { useStandalone } from "./display-mode";

/** Steps per platform, as in docs/aidlc/pwa-reminder/mockup.md (screen 3). */
const STEPS: { platform: string; steps: string[] }[] = [
  {
    platform: "iPhone（Safari）",
    steps: [
      "画面の下の共有ボタン（□↑）を押す",
      "「ホーム画面に追加」を選ぶ",
      "右上の「追加」を押す",
    ],
  },
  {
    platform: "Android（Chrome）",
    steps: [
      "右上の「⋮」を押す",
      "「ホーム画面に追加」を選ぶ",
      "「追加」（または「インストール」）を押す",
    ],
  },
];

/** How to add logling to the home screen (AC-4, AC-5). */
export function InstallGuide() {
  const standalone = useStandalone();

  if (standalone) {
    return (
      <p className="font-bold text-[#3f6b2a]">✓ ホーム画面から開いているよ</p>
    );
  }

  return (
    <>
      <p>ホーム画面に追加すると、アプリのように開けるよ</p>
      {STEPS.map(({ platform, steps }) => (
        <div key={platform} className="mt-3">
          <p className="font-bold">{platform}</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ))}
    </>
  );
}
