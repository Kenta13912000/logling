import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

import { authMock, cloudMock, resetMocks } from "@/test/mocks";

// Vitest globals are off, so Testing Library cannot register this itself.
afterEach(() => {
  cleanup();
});

// account-sync: every unit test starts signed out, with no network. Tests
// switch to signed in or stub a Server Action through @/test/mocks.
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: authMock.session,
      isPending: authMock.isPending,
    }),
    signIn: { social: (...args: unknown[]) => authMock.signInSocial(...args) },
    signOut: (...args: unknown[]) => authMock.signOut(...args),
  },
}));
vi.mock("@/features/cloud/actions", () => cloudMock);

beforeEach(() => {
  resetMocks();
});

// jsdom does not implement <dialog> methods. Mimic just the open state;
// focus handling is covered by the Playwright tests in a real browser.
if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
}
