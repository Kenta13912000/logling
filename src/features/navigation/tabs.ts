/** The three tabs at the bottom of every page (tab-navigation). */
export type TabId = "home" | "history" | "more";

export type Tab = { id: TabId; label: string; href: string };

export const TABS: readonly Tab[] = [
  { id: "home", label: "ホーム", href: "/" },
  { id: "history", label: "ふりかえる", href: "/history" },
  { id: "more", label: "その他", href: "/more" },
];

/** Pages reached from 「その他」, so that tab stays current on them (AC-3). */
const UNDER_MORE = ["/more", "/account", "/privacy", "/settings"];

/** The tab a page belongs to, or null for a page outside the tabs. */
export function currentTab(pathname: string): TabId | null {
  if (pathname === "/") {
    return "home";
  }
  if (pathname === "/history") {
    return "history";
  }
  return UNDER_MORE.includes(pathname) ? "more" : null;
}
