import { vi } from "vitest";

/*
 * jsdom has no window.matchMedia. Tests that render something reading the
 * display mode (pwa-reminder) answer as a browser tab or a home screen app,
 * then remove the stub again.
 */

export function openedFrom(place: "browser" | "homeScreen") {
  window.matchMedia = vi.fn((query: string) => ({
    matches: place === "homeScreen" && query === "(display-mode: standalone)",
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

export function removeMatchMedia() {
  // @ts-expect-error -- jsdom has none; delete the stub.
  delete window.matchMedia;
}
