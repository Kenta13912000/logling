/** The three tabs at the bottom of every page (tab-navigation). */
export type TabId = "home" | "history" | "more";

export type Tab = { id: TabId; label: string; href: string };

// Bolt-1 ⑥: placeholder until ⑦ fills it in.
export const TABS: readonly Tab[] = [];

/** The tab a page belongs to, or null for a page outside the tabs. */
export function currentTab(pathname: string): TabId | null {
  void pathname;
  return null;
}
