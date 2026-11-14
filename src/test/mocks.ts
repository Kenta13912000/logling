import { vi } from "vitest";

import type * as accountActions from "@/features/account/actions";
import type * as actions from "@/features/cloud/actions";
import type * as migrationActions from "@/features/migration/actions";
import type * as reminderActions from "@/features/reminder/actions";
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
  loadCloudData: vi.fn<typeof actions.loadCloudData>(unauthorized),
  createCloudCharacter:
    vi.fn<typeof actions.createCloudCharacter>(unauthorized),
  renameCloudCharacter:
    vi.fn<typeof actions.renameCloudCharacter>(unauthorized),
  addCloudEntry: vi.fn<typeof actions.addCloudEntry>(unauthorized),
  editCloudEntry: vi.fn<typeof actions.editCloudEntry>(unauthorized),
  deleteCloudEntry: vi.fn<typeof actions.deleteCloudEntry>(unauthorized),
};

export const migrationMock = {
  importCloudData: vi.fn<typeof migrationActions.importCloudData>(unauthorized),
};

export const accountMock = {
  withdrawAccount: vi.fn<typeof accountActions.withdrawAccount>(async () => ({
    ok: false,
    reason: "unauthorized",
  })),
};

/** pwa-reminder: every reminder action answers "signed out" by default. */
export const reminderMock = {
  getReminder: vi.fn<typeof reminderActions.getReminder>(),
  saveReminder: vi.fn<typeof reminderActions.saveReminder>(),
  removeReminder: vi.fn<typeof reminderActions.removeReminder>(),
};

export function resetMocks() {
  for (const action of Object.values(reminderMock)) {
    action.mockReset();
    action.mockResolvedValue({ ok: false, reason: "unauthorized" });
  }
  accountMock.withdrawAccount.mockReset();
  accountMock.withdrawAccount.mockResolvedValue({
    ok: false,
    reason: "unauthorized",
  });
  migrationMock.importCloudData.mockReset();
  migrationMock.importCloudData.mockImplementation(unauthorized);
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
