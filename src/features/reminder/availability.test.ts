import { describe, expect, test } from "vitest";

import {
  isIosDevice,
  reminderAvailability,
  type AvailabilityInput,
} from "./availability";

const usable: AvailabilityInput = {
  session: "signedIn",
  pushSupported: true,
  permission: "default",
  iosDevice: false,
  standalone: false,
};

const given = (overrides: Partial<AvailabilityInput>) =>
  reminderAvailability({ ...usable, ...overrides });

describe("使えるかどうか", () => {
  test("AC-6: ログイン中で、お知らせのしくみがあれば使える（許可はまだでも、許可済みでも）", () => {
    expect(given({})).toBe("available");
    expect(given({ permission: "granted" })).toBe("available");
  });

  test("AC-9: ログインしているかを確かめている間は、まだわからない", () => {
    expect(given({ session: "checking" })).toBe("checking");
  });

  test("AC-9: ログインしていなければ、ほかの理由より先に「ログインすると使える」", () => {
    expect(given({ session: "signedOut" })).toBe("signedOut");
    expect(
      given({ session: "signedOut", pushSupported: false, iosDevice: true }),
    ).toBe("signedOut");
  });

  test("AC-9: 許可を断っていれば「許可されていない」", () => {
    expect(given({ permission: "denied" })).toBe("denied");
  });

  test("AC-9: しくみがなく、iPhone・iPad をブラウザで開いているなら「ホーム画面に追加すると使える」", () => {
    expect(given({ pushSupported: false, iosDevice: true })).toBe(
      "needsHomeScreen",
    );
  });

  test("AC-9: しくみがなければ（ホーム画面から開いた古い iPhone も）「このブラウザでは使えない」", () => {
    expect(given({ pushSupported: false })).toBe("unsupported");
    expect(
      given({ pushSupported: false, iosDevice: true, standalone: true }),
    ).toBe("unsupported");
  });
});

describe("iPhone・iPad かどうか", () => {
  test.each([
    [
      "iPhone",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15",
      5,
      true,
    ],
    [
      "iPad（Mac と名乗る）",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
      5,
      true,
    ],
    [
      "Mac",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
      0,
      false,
    ],
    [
      "Android",
      "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/140",
      5,
      false,
    ],
  ])("AC-9: %s", (_, userAgent, maxTouchPoints, expected) => {
    expect(isIosDevice({ userAgent, maxTouchPoints })).toBe(expected);
  });
});
