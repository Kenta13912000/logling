// @vitest-environment node
import { describe, expect, test, vi } from "vitest";

import { TEST_COMMENT, getCommentGenerator } from "./generator";

vi.mock("server-only", () => ({}));

// The SDK's client, replaced so nothing is sent; it records how it was made.
const sdk = vi.hoisted(() => ({ options: [] as unknown[] }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      create: async () => ({
        content: [{ type: "text", text: "本物の答え" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 10, output_tokens: 5 },
      }),
    };
    constructor(options: unknown) {
      sdk.options.push(options);
    }
  },
}));

describe("コメントを作る部品の選び方", () => {
  test("AC-13: 鍵がなく、テスト用のログインでもなければ、作る部品はない", () => {
    expect(getCommentGenerator({})).toBeNull();
    expect(getCommentGenerator({ LOGLING_E2E_AUTH: "0" })).toBeNull();
  });

  test("AC-13: E2E テスト用のサーバー（テスト用のログイン・鍵なし）では、決まった文を返す偽物", async () => {
    const generate = getCommentGenerator({ LOGLING_E2E_AUTH: "1" });

    expect(generate).not.toBeNull();
    expect(await generate!({ name: "ぴよ", body: "日記" })).toStrictEqual({
      ok: true,
      text: TEST_COMMENT,
      usage: { inputTokens: 0, outputTokens: 0 },
    });
  });

  test("AC-13, AC-17: 鍵があれば本物を使い（テスト用のログインより優先）、鍵・待ち時間 20 秒・再試行 1 回で作る", async () => {
    sdk.options.length = 0;
    const generate = getCommentGenerator({
      ANTHROPIC_API_KEY: "sk-ant-test",
      LOGLING_E2E_AUTH: "1",
    });

    expect(await generate!({ name: "ぴよ", body: "日記" })).toMatchObject({
      ok: true,
      text: "本物の答え",
    });
    expect(sdk.options).toStrictEqual([
      { apiKey: "sk-ant-test", timeout: 20_000, maxRetries: 1 },
    ]);
  });
});
