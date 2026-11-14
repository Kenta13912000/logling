// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const reminders = vi.hoisted(() => ({
  sendDueReminders: vi.fn(),
}));
vi.mock("@/features/reminder/send-reminders", () => reminders);
vi.mock("@/features/reminder/web-push-sender", () => ({
  createWebPushSender: () => async () => "sent",
}));
vi.mock("@/lib/db/client", () => ({ getDb: () => ({}) }));

const { POST } = await import("./route");

const SECRET = "a-long-random-cron-secret-for-tests";
const SUMMARY = { sent: 2, written: 1, removed: 0, failed: 0 };

const call = (authorization?: string) =>
  POST(
    new Request("https://logling.vercel.app/api/reminders", {
      method: "POST",
      headers: authorization ? { authorization } : {},
    }),
  );

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", SECRET);
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "public-key");
  vi.stubEnv("VAPID_PRIVATE_KEY", "private-key");
  reminders.sendDueReminders.mockReset();
  reminders.sendDueReminders.mockResolvedValue(SUMMARY);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test.each([
  ["合言葉がない", undefined],
  ["合言葉が違う", "Bearer wrong-secret"],
  ["形が違う", SECRET],
])("AC-23: %s ときは 401 で、何も送らない", async (_, authorization) => {
  const response = await call(authorization);

  expect(response.status).toBe(401);
  expect(reminders.sendDueReminders).not.toHaveBeenCalled();
});

test("AC-23: サーバーに合言葉が設定されていなければ、だれが呼んでも 401", async () => {
  vi.stubEnv("CRON_SECRET", "");

  const response = await call("Bearer ");

  expect(response.status).toBe(401);
  expect(reminders.sendDueReminders).not.toHaveBeenCalled();
});

test("AC-23: 合言葉が正しければ送る流れを動かし、数だけを返す", async () => {
  const response = await call(`Bearer ${SECRET}`);

  expect(response.status).toBe(200);
  expect(await response.json()).toStrictEqual(SUMMARY);
  expect(reminders.sendDueReminders).toHaveBeenCalledTimes(1);
});

test("AC-23: お知らせの鍵がなければ、送らずに 503", async () => {
  vi.stubEnv("VAPID_PRIVATE_KEY", "");

  const response = await call(`Bearer ${SECRET}`);

  expect(response.status).toBe(503);
  expect(reminders.sendDueReminders).not.toHaveBeenCalled();
});
