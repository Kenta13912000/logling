import type { Metadata, Viewport } from "next";

import { AppHeader } from "@/features/navigation/AppHeader";
import { TabBar } from "@/features/navigation/TabBar";

import "./globals.css";

export const metadata: Metadata = {
  title: "logling",
  description: "日記を書くとキャラクターが育つ、続けたくなる日記アプリ",
};

// tab-navigation AC-10: lets env(safe-area-inset-bottom) report the room
// the iPhone home indicator needs (it is 0 without this).
export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {/* tab-navigation: the same top bar and tabs on every page. The
            bottom padding keeps the page's end clear of the fixed tabs:
            56px tabs, their 1px top line, and the home indicator. */}
        <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col bg-cream pb-[calc(3.5rem+1px+env(safe-area-inset-bottom))] text-ink">
          <AppHeader />
          {children}
        </div>
        <TabBar />
      </body>
    </html>
  );
}
