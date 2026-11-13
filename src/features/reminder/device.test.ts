import { afterEach, expect, test, vi } from "vitest";

import { reminderMock } from "@/test/mocks";

import { forgetThisDevice } from "./device";

const ENDPOINT = "https://web.push.apple.com/this-phone";

/** Gives this browser a service worker whose push subscription is `sub`. */
function withSubscription(
  sub: { endpoint: string; unsubscribe: () => Promise<boolean> } | null,
) {
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      getRegistration: async () => ({
        pushManager: { getSubscription: async () => sub },
      }),
    },
  });
}

afterEach(() => {
  // jsdom has no service worker; remove the stand-in again.
  Reflect.deleteProperty(navigator, "serviceWorker");
});

test("AC-16: この端末が登録されていれば、サーバーの宛先を消し、ブラウザの登録もやめる", async () => {
  const unsubscribe = vi.fn(async () => true);
  withSubscription({ endpoint: ENDPOINT, unsubscribe });
  reminderMock.removeReminder.mockResolvedValue({ ok: true, minute: null });

  await forgetThisDevice();

  expect(reminderMock.removeReminder).toHaveBeenCalledWith(ENDPOINT);
  expect(unsubscribe).toHaveBeenCalled();
});

test("AC-16: サーバーで消せなくても、ブラウザの登録はやめる（宛先が使えなくなる）", async () => {
  const unsubscribe = vi.fn(async () => true);
  withSubscription({ endpoint: ENDPOINT, unsubscribe });
  reminderMock.removeReminder.mockRejectedValue(new Error("offline"));

  await forgetThisDevice();

  expect(unsubscribe).toHaveBeenCalled();
});

test("AC-16: 登録がない・お知らせのしくみがないブラウザでは、何もしない", async () => {
  withSubscription(null);
  await forgetThisDevice();

  Reflect.deleteProperty(navigator, "serviceWorker");
  await forgetThisDevice();

  expect(reminderMock.removeReminder).not.toHaveBeenCalled();
});
