/**
 * The bar at the top of every page: just the app's name (tab-navigation
 * AC-8). Not a heading, so it does not compete with each page's own one.
 * Opened from the home screen, it starts below the phone's clock and
 * battery (pwa-reminder AC-3); in a browser that room is 0.
 */
export function AppHeader() {
  return (
    <header className="border-b border-line px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 text-center font-bold tracking-wide">
      logling
    </header>
  );
}
