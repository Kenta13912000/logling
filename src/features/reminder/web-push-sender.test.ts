// @vitest-environment node
import { beforeEach, expect, test, vi } from "vitest";

import { createWebPushSender } from "./web-push-sender";

vi.mock("server-only", () => ({}));

const webpush = vi.hoisted(() => ({ sendNotification: vi.fn() }));
vi.mock("web-push", () => ({ default: webpush, ...webpush }));

const TARGET = {
  endpoint: "https://web.push.apple.com/phone",
  keys: { p256dh: "B".repeat(87), auth: "a".repeat(22) },
};
const MESSAGE = {
  title: "logling",
  body: "ぴよが待っているよ。今日の日記を書こう",
  url: "/",
};
const KEYS = { publicKey: "public-key", privateKey: "private-key" };

/** What web-push throws when the push service answers with an error. */
const pushError = (statusCode: number) =>
  Object.assign(new Error(`push service: ${statusCode}`), { statusCode });

beforeEach(() => {
  webpush.sendNotification.mockReset();
  webpush.sendNotification.mockResolvedValue({ statusCode: 201 });
});

test("AC-11: 暗号にして署名したお知らせを、1 時間だけ預けて送る（連絡先は GitHub の Issues）", async () => {
  const send = createWebPushSender(KEYS);

  expect(await send(TARGET, MESSAGE)).toBe("sent");
  expect(webpush.sendNotification).toHaveBeenCalledWith(
    TARGET,
    JSON.stringify(MESSAGE),
    {
      TTL: 3600,
      vapidDetails: {
        subject: "https://github.com/Kenta13912000/logling/issues",
        publicKey: "public-key",
        privateKey: "private-key",
      },
    },
  );
});

test.each([404, 410])(
  "AC-17: お知らせのしくみが %i を返したら「使えない宛先」",
  async (statusCode) => {
    webpush.sendNotification.mockRejectedValue(pushError(statusCode));

    expect(await createWebPushSender(KEYS)(TARGET, MESSAGE)).toBe("gone");
  },
);

test.each([
  ["429（多すぎる）", pushError(429)],
  ["500（向こうの不具合）", pushError(500)],
  ["通信の失敗", new Error("network down")],
])("AC-17: %s は「失敗」（宛先は消さない）", async (_, error) => {
  webpush.sendNotification.mockRejectedValue(error);

  expect(await createWebPushSender(KEYS)(TARGET, MESSAGE)).toBe("failed");
});
