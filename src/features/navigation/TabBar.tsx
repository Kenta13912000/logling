"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BookIcon, HomeIcon, MoreIcon } from "./icons";
import { TABS, currentTab, type TabId } from "./tabs";

const ICONS: Record<TabId, typeof HomeIcon> = {
  home: HomeIcon,
  history: BookIcon,
  more: MoreIcon,
};

/** The tabs fixed to the bottom of every page (tab-navigation). */
export function TabBar() {
  const current = currentTab(usePathname());

  return (
    <nav
      aria-label="メインメニュー"
      className="fixed inset-x-0 bottom-0 mx-auto grid w-full max-w-[480px] grid-cols-3 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]"
    >
      {TABS.map((tab) => {
        const active = tab.id === current;
        const Icon = ICONS[tab.id];
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${
              active ? "text-ember" : "text-ink-muted"
            }`}
          >
            <Icon
              className={`size-[26px] ${active ? "fill-[#fde7d6]" : "fill-none"}`}
            />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
