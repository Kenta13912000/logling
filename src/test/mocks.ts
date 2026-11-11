import { vi } from "vitest";

import type { CloudResult } from "@/features/cloud/actions";

/*
 * Shared test doubles for the browser-side auth client and the cloud
 * Server Actions. vitest.setup.ts installs them for every unit test and
 * resets them before each test: signed out, and every action unauthorized.
 */

export type MockSession = { user: { email: string } } | null;

export const authMock = {
  session: null as MockSession,
  isPending: false,
  signInSocial: vi.fn(),
  signOut: vi.fn(),
};

const unauthorized = async (): Promise<CloudResult> => ({
  ok: false,
  reason: "unauthorized",
});

export const cloudMock = {
  loadCloudData: vi.fn(unauthorized),
  createCloudCharacter: vi.fn(unauthorized),
  addCloudEntry: vi.fn(unauthorized),
  editCloudEntry: vi.fn(unauthorized),
  deleteCloudEntry: vi.fn(unauthorized),
};

export function resetMocks() {
  authMock.session = null;
  authMock.isPending = false;
  authMock.signInSocial.mockReset();
  authMock.signInSocial.mockResolvedValue({ data: null, error: null });
  authMock.signOut.mockReset();
  authMock.signOut.mockResolvedValue({ data: { success: true }, error: null });
  for (const action of Object.values(cloudMock)) {
    action.mockReset();
    action.mockImplementation(unauthorized);
  }
}

/** Signs the test in as `email`, as if Better Auth had a session. */
export function signInAs(email: string) {
  authMock.session = { user: { email } };
}
