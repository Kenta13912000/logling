import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "logling",
  description: "日記を書くとキャラクターが育つ、続けたくなる日記アプリ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
