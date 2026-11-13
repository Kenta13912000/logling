import { describe, expect, test } from "vitest";

import { validateReminder } from "./validate";

// Real-looking keys: 65 bytes and 16 bytes, base64url without padding.
const P256DH = "B".repeat(87);
const AUTH = "a".repeat(22);

const input = (overrides: Record<string, unknown> = {}) => ({
  subscription: {
    endpoint: "https://fcm.googleapis.com/fcm/send/device-1",
    keys: { p256dh: P256DH, auth: AUTH },
  },
  minute: 1260,
  timeZone: "Asia/Tokyo",
  ...overrides,
});

const withEndpoint = (endpoint: string) =>
  input({ subscription: { endpoint, keys: { p256dh: P256DH, auth: AUTH } } });

const withKeys = (p256dh: string, auth: string) =>
  input({
    subscription: {
      endpoint: "https://fcm.googleapis.com/fcm/send/device-1",
      keys: { p256dh, auth },
    },
  });

test("AC-7, AC-8: 正しい宛先・時刻・タイムゾーンは、そのまま受け付ける", () => {
  expect(validateReminder(input())).toStrictEqual(input());
});

describe("宛先のアドレス（ADR-0007）", () => {
  test.each([
    "https://fcm.googleapis.com/fcm/send/device-1",
    "https://web.push.apple.com/QGuQyavXutnMH",
    "https://updates.push.services.mozilla.com/wpush/v2/gAAAAA",
    "https://wns2-par02p.notify.windows.com/w/?token=BQYAAAB",
  ])("AC-8: お知らせのしくみのアドレス %s は受け付ける", (endpoint) => {
    expect(validateReminder(withEndpoint(endpoint))).not.toBeNull();
  });

  test.each([
    ["http（暗号なし）", "http://fcm.googleapis.com/fcm/send/device-1"],
    ["お知らせのしくみでない場所", "https://example.com/push"],
    [
      "名前の後ろに別の場所を足したもの",
      "https://fcm.googleapis.com.evil.example/x",
    ],
    [
      "名前の前に別の場所を足したもの",
      "https://evilfcm.googleapis.com.example/x",
    ],
    ["アドレスでない文字", "fcm.googleapis.com"],
    [
      "長すぎる（2,000 文字より長い）",
      `https://fcm.googleapis.com/${"x".repeat(2000)}`,
    ],
  ])("AC-8: %s は受け付けない", (_, endpoint) => {
    expect(validateReminder(withEndpoint(endpoint))).toBeNull();
  });
});

describe("鍵", () => {
  test.each([
    ["使えない文字", `${"B".repeat(80)}<script>`, AUTH],
    ["短すぎる鍵", "abc", AUTH],
    ["短すぎる auth", P256DH, "a"],
    ["長すぎる鍵", "B".repeat(200), AUTH],
  ])("AC-8: %s は受け付けない", (_, p256dh, auth) => {
    expect(validateReminder(withKeys(p256dh, auth))).toBeNull();
  });
});

describe("時刻（30 分ごと）", () => {
  test.each([0, 30, 1260, 1410])(
    "AC-7: %i 分（0 時から）は受け付ける",
    (minute) => {
      expect(validateReminder(input({ minute }))).not.toBeNull();
    },
  );

  test.each([15, -30, 1440, 1260.5, "1260"])(
    "AC-7: %s は受け付けない",
    (minute) => {
      expect(validateReminder(input({ minute }))).toBeNull();
    },
  );
});

describe("タイムゾーン", () => {
  test.each(["Asia/Tokyo", "UTC", "America/New_York"])(
    "AC-12: %s は受け付ける",
    (timeZone) => {
      expect(validateReminder(input({ timeZone }))).not.toBeNull();
    },
  );

  test.each(["Mars/Base", "", 9])("AC-12: %s は受け付けない", (timeZone) => {
    expect(validateReminder(input({ timeZone }))).toBeNull();
  });
});

test("AC-8: 形の違うもの（なし・文字・宛先の抜け）は受け付けない", () => {
  expect(validateReminder(null)).toBeNull();
  expect(validateReminder("subscription")).toBeNull();
  expect(validateReminder(input({ subscription: undefined }))).toBeNull();
});

test("AC-8: 余分な値（ほかの人の ID など）は、受け付けた結果に残さない", () => {
  expect(validateReminder(input({ userId: "user-b" }))).toStrictEqual(input());
});
