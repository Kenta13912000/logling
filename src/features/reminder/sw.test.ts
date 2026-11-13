// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

import { beforeEach, describe, expect, test, vi } from "vitest";

/*
 * public/sw.js runs inside the browser's service worker. Here it runs in a
 * plain context with a stand-in `self` that records what it does.
 */

const code = readFileSync("public/sw.js", "utf8");

type Client = {
  url: string;
  focus: () => Promise<Client>;
  navigate: (url: string) => Promise<Client>;
};

let listeners: Record<string, (event: unknown) => void>;
let showNotification: ReturnType<typeof vi.fn>;
let openWindow: ReturnType<typeof vi.fn>;
let clientList: Client[];
let pending: Promise<unknown>[];

beforeEach(() => {
  listeners = {};
  pending = [];
  clientList = [];
  showNotification = vi.fn(async () => undefined);
  openWindow = vi.fn(async () => null);
  const self = {
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      listeners[type] = listener;
    },
    skipWaiting: vi.fn(async () => undefined),
    registration: { showNotification },
    clients: {
      claim: vi.fn(async () => undefined),
      matchAll: vi.fn(async () => clientList),
      openWindow,
    },
    location: { origin: "https://logling.vercel.app" },
  };
  runInNewContext(code, { self, URL });
});

const waitUntil = (promise: Promise<unknown>) => {
  pending.push(promise);
};

async function push(data: unknown) {
  listeners.push({ data, waitUntil });
  await Promise.all(pending);
}

const message = (payload: unknown) => ({ json: () => payload });

describe("お知らせが届いたとき", () => {
  test("AC-11: 題・文・ホーム画面と同じアイコンで、お知らせを出す", async () => {
    await push(
      message({
        title: "logling",
        body: "ぴよが待っているよ。今日の日記を書こう",
        url: "/",
      }),
    );

    expect(showNotification).toHaveBeenCalledWith("logling", {
      body: "ぴよが待っているよ。今日の日記を書こう",
      icon: "/icons/icon-192.png",
      tag: "logling-reminder",
      data: { url: "/" },
    });
  });

  test.each([
    ["ほかのサイト", "https://evil.example/"],
    ["ほかのサイト（// で始まる）", "//evil.example/"],
    ["文字でない", 42],
  ])("AC-14: 開く場所が %s なら、ホーム（/）にする", async (_, url) => {
    await push(message({ title: "logling", body: "文", url }));

    // toEqual, not toStrictEqual: the object comes from the vm's own realm.
    expect(showNotification.mock.calls[0][1].data).toEqual({ url: "/" });
  });

  test("AC-11: 中身が読めないときは「logling」「今日の日記を書こう」", async () => {
    await push({
      json: () => {
        throw new SyntaxError("not json");
      },
    });
    await push(null);

    for (const [title, options] of showNotification.mock.calls) {
      expect(title).toBe("logling");
      expect(options.body).toBe("今日の日記を書こう");
      expect(options.data).toEqual({ url: "/" });
    }
    expect(showNotification).toHaveBeenCalledTimes(2);
  });
});

describe("お知らせを押したとき", () => {
  const click = async () => {
    const close = vi.fn();
    listeners.notificationclick({
      notification: { close, data: { url: "/" } },
      waitUntil,
    });
    await Promise.all(pending);
    return close;
  };

  test("AC-14: logling が開いていなければ、ホームを開く", async () => {
    const close = await click();

    expect(close).toHaveBeenCalled();
    expect(openWindow).toHaveBeenCalledWith("/");
  });

  test("AC-14: logling がもう開いていれば、それを前に出してホームへ移る", async () => {
    const client: Client = {
      url: "https://logling.vercel.app/history",
      focus: vi.fn(async () => client),
      navigate: vi.fn(async () => client),
    };
    clientList = [client];

    await click();

    expect(client.focus).toHaveBeenCalled();
    expect(client.navigate).toHaveBeenCalledWith("/");
    expect(openWindow).not.toHaveBeenCalled();
  });
});

test("AC-20: ページを覚えておく処理（fetch）がない。新しい版を公開すれば、そのまま新しい版になる", () => {
  expect(listeners.fetch).toBeUndefined();
  expect(listeners.push).toBeDefined();
  expect(listeners.notificationclick).toBeDefined();
});
