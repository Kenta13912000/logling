// @vitest-environment node
import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, test, vi } from "vitest";

import { COMMENT_MODEL, createClaudeGenerator } from "./claude";
import { buildCommentRequest } from "./prompt";

vi.mock("server-only", () => ({}));

type Reply = {
  content: { type: string; text?: string }[];
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number };
};

function fakeClient(reply: Reply | Error) {
  const create = vi.fn(async () => {
    if (reply instanceof Error) {
      throw reply;
    }
    return reply;
  });
  const client = { messages: { create } } as unknown as Pick<
    Anthropic,
    "messages"
  >;
  return { client, create };
}

const reply = (text: string, stop_reason = "end_turn"): Reply => ({
  content: [{ type: "text", text }],
  stop_reason,
  usage: { input_tokens: 820, output_tokens: 64 },
});

const INPUT = { name: "ちびすけ", body: "今日は発表があった。" };

describe("頼み方", () => {
  test("AC-13, AC-16: Claude Haiku 5.5 に、指示文と名前・本文だけを、答えの上限と少ない考える量で頼む", async () => {
    const { client, create } = fakeClient(reply("おつかれさま！"));

    await createClaudeGenerator(client)(INPUT);

    const { system, userText } = buildCommentRequest(INPUT.name, INPUT.body);
    expect(COMMENT_MODEL).toBe("claude-haiku-5-5");
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      model: "claude-haiku-5-5",
      max_tokens: 400,
      output_config: { effort: "low" },
      system,
      messages: [{ role: "user", content: userText }],
    });
  });

  test("AC-5: 答えの文をコメントにし、使ったトークンの数を返す", async () => {
    const { client } = fakeClient(reply("  おつかれさま！ケーキいいね。 "));

    expect(await createClaudeGenerator(client)(INPUT)).toStrictEqual({
      ok: true,
      text: "おつかれさま！ケーキいいね。",
      usage: { inputTokens: 820, outputTokens: 64 },
    });
  });
});

describe("作れなかったとき", () => {
  test("AC-13: 途中で切れた・断られた答えは使わず、使ったトークンの数は返す", async () => {
    for (const stop of ["max_tokens", "refusal"]) {
      const { client } = fakeClient(reply("とちゅうまで", stop));

      expect(await createClaudeGenerator(client)(INPUT), stop).toStrictEqual({
        ok: false,
        usage: { inputTokens: 820, outputTokens: 64 },
      });
    }
  });

  test("AC-13: 文がない・空・長すぎる答えは使わない", async () => {
    for (const bad of [
      { ...reply(""), content: [] },
      reply("   "),
      reply("あ".repeat(151)),
    ]) {
      const { client } = fakeClient(bad);

      expect((await createClaudeGenerator(client)(INPUT)).ok).toBe(false);
    }
  });

  test("AC-7: 使えない答え（空・長すぎる）は使わず、もう 1 回だけ頼み直す。使ったトークンは 2 回分を足す", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce(reply("あ".repeat(151)))
      .mockResolvedValueOnce(reply("ちびすけもうれしいよ"));
    const client = { messages: { create } } as unknown as Pick<
      Anthropic,
      "messages"
    >;

    expect(await createClaudeGenerator(client)(INPUT)).toStrictEqual({
      ok: true,
      text: "ちびすけもうれしいよ",
      usage: { inputTokens: 1640, outputTokens: 128 },
    });
    expect(create).toHaveBeenCalledTimes(2);
  });

  test("AC-7, AC-13: 頼み直しは 1 回まで。2 回とも合わなければ「作れなかった」。途中で切れた・断られた答えは頼み直さない", async () => {
    const twice = fakeClient(reply("   "));
    expect(await createClaudeGenerator(twice.client)(INPUT)).toStrictEqual({
      ok: false,
      usage: { inputTokens: 1640, outputTokens: 128 },
    });
    expect(twice.create).toHaveBeenCalledTimes(2);

    const refused = fakeClient(reply("とちゅう", "refusal"));
    await createClaudeGenerator(refused.client)(INPUT);
    expect(refused.create).toHaveBeenCalledTimes(1);
  });

  test("AC-13: 通信の失敗は、そのまま投げる（呼び出し側で「作れなかった」にする）", async () => {
    const { client } = fakeClient(new Error("connection reset"));

    await expect(createClaudeGenerator(client)(INPUT)).rejects.toThrow(
      "connection reset",
    );
  });
});
