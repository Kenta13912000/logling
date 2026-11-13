import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { reminderMock } from "@/test/mocks";

import {
  changeTime,
  loadReminder,
  pushSupported,
  turnOff,
  turnOn,
} from "./push-client";

const ENDPOINT = "https://fcm.googleapis.com/fcm/send/this-device";
const SUBSCRIPTION_JSON = {
  endpoint: ENDPOINT,
  keys: { p256dh: "B".repeat(87), auth: "a".repeat(22) },
};
// A 65-byte public key, base64url: the shape VAPID keys have.
const PUBLIC_KEY = `B${"A".repeat(86)}`;

type FakeSubscription = {
  endpoint: string;
  toJSON: () => unknown;
  unsubscribe: ReturnType<typeof vi.fn>;
};

let subscription: FakeSubscription | null;
let subscribe: ReturnType<typeof vi.fn>;
let register: ReturnType<typeof vi.fn>;
let requestPermission: ReturnType<typeof vi.fn>;
let registered: boolean;

function newSubscription(): FakeSubscription {
  return {
    endpoint: ENDPOINT,
    toJSON: () => SUBSCRIPTION_JSON,
    unsubscribe: vi.fn(async () => true),
  };
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", PUBLIC_KEY);
  subscription = null;
  registered = false;
  subscribe = vi.fn(async () => {
    subscription = newSubscription();
    return subscription;
  });
  const registration = {
    pushManager: { getSubscription: async () => subscription, subscribe },
  };
  register = vi.fn(async () => {
    registered = true;
    return registration;
  });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      register,
      ready: Promise.resolve(registration),
      getRegistration: async () => (registered ? registration : undefined),
    },
  });
  requestPermission = vi.fn(async () => "granted");
  Object.defineProperty(window, "Notification", {
    configurable: true,
    value: { permission: "default", requestPermission },
  });
  Object.defineProperty(window, "PushManager", {
    configurable: true,
    value: function PushManager() {},
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  Reflect.deleteProperty(navigator, "serviceWorker");
  Reflect.deleteProperty(window, "Notification");
  Reflect.deleteProperty(window, "PushManager");
});

describe("しくみがあるか", () => {
  test("AC-9: 通知・お知らせ・Service Worker と公開の鍵がそろえば使える", () => {
    expect(pushSupported()).toBe(true);
  });

  test("AC-9: 公開の鍵がない（確認用の公開など）か、しくみが欠けていれば使えない", () => {
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "");
    expect(pushSupported()).toBe(false);

    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", PUBLIC_KEY);
    Reflect.deleteProperty(window, "PushManager");
    expect(pushSupported()).toBe(false);
  });
});

describe("オンにする", () => {
  test("AC-6: 許可されたら、しくみを登録してお知らせに登録し、宛先・時刻・端末のタイムゾーンを保存する", async () => {
    reminderMock.saveReminder.mockResolvedValue({ ok: true, minute: 1260 });

    expect(await turnOn(1260)).toStrictEqual({ ok: true, minute: 1260 });

    expect(requestPermission).toHaveBeenCalled();
    expect(register).toHaveBeenCalledWith("/sw.js");
    expect(subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array),
    });
    expect(reminderMock.saveReminder).toHaveBeenCalledWith({
      subscription: SUBSCRIPTION_JSON,
      minute: 1260,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  });

  test.each([
    ["断った", "denied", "denied"],
    ["答えずに閉じた", "default", "dismissed"],
  ] as const)(
    "AC-9: 許可を%sときは、登録も保存もしない",
    async (_, answer, reason) => {
      requestPermission.mockResolvedValue(answer);

      expect(await turnOn(1260)).toStrictEqual({ ok: false, reason });
      expect(register).not.toHaveBeenCalled();
      expect(reminderMock.saveReminder).not.toHaveBeenCalled();
    },
  );

  test("AC-10: 保存に失敗したら、ブラウザの登録もやめる（オフのまま）", async () => {
    reminderMock.saveReminder.mockResolvedValue({
      ok: false,
      reason: "failed",
    });

    expect(await turnOn(1260)).toStrictEqual({ ok: false, reason: "failed" });
    expect(subscription?.unsubscribe).toHaveBeenCalled();
  });
});

describe("登録してあるとき", () => {
  beforeEach(() => {
    registered = true;
    subscription = newSubscription();
  });

  test("AC-6: 開いたときは、サーバーにこの端末の時刻を聞く", async () => {
    reminderMock.getReminder.mockResolvedValue({ ok: true, minute: 1290 });

    expect(await loadReminder()).toStrictEqual({ ok: true, minute: 1290 });
    expect(reminderMock.getReminder).toHaveBeenCalledWith(ENDPOINT);
  });

  test("AC-7: 時刻を変えると、同じ登録のまま新しい時刻で保存する", async () => {
    reminderMock.saveReminder.mockResolvedValue({ ok: true, minute: 1290 });

    expect(await changeTime(1290)).toStrictEqual({ ok: true, minute: 1290 });
    expect(subscribe).not.toHaveBeenCalled();
    expect(reminderMock.saveReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription: SUBSCRIPTION_JSON,
        minute: 1290,
      }),
    );
  });

  test("AC-15: オフにすると、サーバーの宛先を消してから、ブラウザの登録をやめる", async () => {
    reminderMock.removeReminder.mockResolvedValue({ ok: true, minute: null });

    expect(await turnOff()).toStrictEqual({ ok: true, minute: null });
    expect(reminderMock.removeReminder).toHaveBeenCalledWith(ENDPOINT);
    expect(subscription?.unsubscribe).toHaveBeenCalled();
  });

  test("AC-10: サーバーで消せなかったら、ブラウザの登録は残す（オンのまま）", async () => {
    reminderMock.removeReminder.mockResolvedValue({
      ok: false,
      reason: "failed",
    });

    expect(await turnOff()).toStrictEqual({ ok: false, reason: "failed" });
    expect(subscription?.unsubscribe).not.toHaveBeenCalled();
  });
});

test("AC-6: この端末に登録がなければ、サーバーに聞かずにオフ", async () => {
  expect(await loadReminder()).toStrictEqual({ ok: true, minute: null });
  expect(reminderMock.getReminder).not.toHaveBeenCalled();
});
