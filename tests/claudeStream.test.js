import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { callClaudeJSONStream } from "../lib/claude.js";

// callClaudeJSONStream が Anthropic の SSE をどう解釈するか。
// fetch を差し替えて、本物と同じ形のイベント列を流し込んで確かめる。
function anthropicStream(text, { chunk = 5, stopReason = "end_turn", errorEvent = null } = {}) {
  const lines = [`event: message_start\ndata: ${JSON.stringify({ type: "message_start" })}\n\n`];
  for (let i = 0; i < text.length; i += chunk) {
    lines.push(
      `event: content_block_delta\ndata: ${JSON.stringify({
        type: "content_block_delta",
        delta: { type: "text_delta", text: text.slice(i, i + chunk) },
      })}\n\n`
    );
  }
  if (errorEvent) lines.push(`event: error\ndata: ${JSON.stringify({ type: "error", error: { message: errorEvent } })}\n\n`);
  else lines.push(`event: message_delta\ndata: ${JSON.stringify({ type: "message_delta", delta: { stop_reason: stopReason } })}\n\n`);

  const enc = new TextEncoder().encode(lines.join(""));
  return new ReadableStream({
    // わざと細かく刻んで、イベントの途中で切れる状況を作る
    start(c) { for (let i = 0; i < enc.length; i += 7) c.enqueue(enc.slice(i, i + 7)); c.close(); },
  });
}

function withMock(stream, fn, { ok = true, status = 200 } = {}) {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "test-key";
  globalThis.fetch = async () => (ok ? new Response(stream, { status }) : new Response("boom", { status }));
  return fn().finally(() => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
  });
}

describe("callClaudeJSONStream", () => {
  const payload = JSON.stringify({
    reflection: 'なるほど、"現場"が課題ですね',
    question: "直近3ヶ月で、採用した方の定着はいかがですか?",
    options: ["順調", "すぐ辞めた", "採用できていない", "把握していない"],
    axis: "hr",
  });

  test("流れてきたJSONを最後にパースして返す", async () => {
    const result = await withMock(anthropicStream(payload), () =>
      callClaudeJSONStream("sys", "user", 700, { fast: true })
    );
    assert.equal(result.axis, "hr");
    assert.equal(result.options.length, 4);
    assert.equal(result.reflection, 'なるほど、"現場"が課題ですね');
  });

  test("onText には累積した本文が渡り、最後は全文になる", async () => {
    const seen = [];
    await withMock(anthropicStream(payload), () =>
      callClaudeJSONStream("sys", "user", 700, {}, (t) => seen.push(t))
    );
    assert.ok(seen.length > 3, `途中経過が刻まれていない (${seen.length}回)`);
    assert.equal(seen[seen.length - 1], payload);
    // 累積なので、常に前回を前方に含む(表示が巻き戻らない)
    for (let i = 1; i < seen.length; i++) assert.ok(seen[i].startsWith(seen[i - 1]));
  });

  test("```json のフェンスが付いていても取り出せる", async () => {
    const fenced = "```json\n" + payload + "\n```";
    const result = await withMock(anthropicStream(fenced), () => callClaudeJSONStream("sys", "user", 700));
    assert.equal(result.axis, "hr");
  });

  test("max_tokensで打ち切られたら例外にする", async () => {
    await assert.rejects(
      withMock(anthropicStream(payload.slice(0, 40), { stopReason: "max_tokens" }), () =>
        callClaudeJSONStream("sys", "user", 700)
      ),
      /max_tokens/
    );
  });

  test("途中でerrorイベントが来たら例外にする", async () => {
    await assert.rejects(
      withMock(anthropicStream(payload.slice(0, 30), { errorEvent: "overloaded" }), () =>
        callClaudeJSONStream("sys", "user", 700)
      ),
      /overloaded/
    );
  });

  test("JSONとして壊れていたら例外にする", async () => {
    await assert.rejects(
      withMock(anthropicStream("これはJSONではありません"), () => callClaudeJSONStream("sys", "user", 700)),
      /JSONパースに失敗/
    );
  });

  test("APIキーが無ければ即座に例外", async () => {
    const original = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      await assert.rejects(callClaudeJSONStream("sys", "user", 700), /ANTHROPIC_API_KEY/);
    } finally {
      if (original !== undefined) process.env.ANTHROPIC_API_KEY = original;
    }
  });
});
