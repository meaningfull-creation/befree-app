import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { sseResponse } from "../lib/sse.js";
import { postSSE } from "../lib/sseClient.js";

// sseResponse(サーバー) と postSSE(クライアント) の往復。
// ネットワークを挟まずに、実際のストリームを直接つないで検証する。
// AI対話の表示はこの2つに乗っているので、ここが壊れると質問が出なくなる。
function withFetch(response, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = async () => response;
  return fn().finally(() => { globalThis.fetch = original; });
}

describe("SSEの往復(sseResponse ↔ postSSE)", () => {
  test("deltaが順に届き、最後にdoneの中身が返る", async () => {
    const res = sseResponse(async (send) => {
      send("delta", { question: "こんに" });
      send("delta", { question: "こんにちは" });
      send("done", { question: "こんにちは", options: ["A", "B"], turnId: "t1" });
    });
    assert.ok(res.headers.get("content-type").includes("text/event-stream"));

    const seen = [];
    const result = await withFetch(res, () => postSSE("/x", {}, (d) => seen.push(d)));
    assert.deepEqual(seen, [{ question: "こんに" }, { question: "こんにちは" }]);
    assert.deepEqual(result, { question: "こんにちは", options: ["A", "B"], turnId: "t1" });
  });

  test("ハンドラが例外を投げたら、クライアント側も例外になる", async () => {
    const res = sseResponse(async () => { throw new Error("AIが落ちました"); });
    await assert.rejects(
      withFetch(res, () => postSSE("/x", {}, () => {})),
      /AIが落ちました/
    );
  });

  test("doneが来ないまま終わったら例外にする(途中で切れた場合)", async () => {
    const res = sseResponse(async (send) => { send("delta", { question: "途中" }); });
    await assert.rejects(withFetch(res, () => postSSE("/x", {}, () => {})), /途中で切れました/);
  });

  test("改行や引用符を含む日本語が壊れずに往復する", async () => {
    const tricky = '1行目\n2行目 "引用" \\ バックスラッシュ 😀';
    const res = sseResponse(async (send) => {
      send("delta", { reflection: tricky });
      send("done", { reflection: tricky, question: tricky });
    });
    const seen = [];
    const result = await withFetch(res, () => postSSE("/x", {}, (d) => seen.push(d)));
    assert.equal(seen[0].reflection, tricky);
    assert.equal(result.question, tricky);
  });

  test("ストリームでないJSON応答もそのまま返す(最終ターン・旧挙動との互換)", async () => {
    const res = new Response(JSON.stringify({ done: true, scores: { sales: 30 } }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
    const result = await withFetch(res, () => postSSE("/x", {}, () => {}));
    assert.deepEqual(result, { done: true, scores: { sales: 30 } });
  });

  test("エラー応答(JSON)はメッセージ付きで例外になる", async () => {
    const res = new Response(JSON.stringify({ error: "companyForm is required" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
    await assert.rejects(withFetch(res, () => postSSE("/x", {}, () => {})), /companyForm is required/);
  });

  test("イベントが細かく分割されて届いても取りこぼさない", async () => {
    // 1バイトずつ流れてくる状況を作る
    const body = [
      'event: delta\ndata: {"question":"あ"}\n\n',
      'event: delta\ndata: {"question":"あい"}\n\n',
      'event: done\ndata: {"question":"あい","options":[]}\n\n',
    ].join("");
    const enc = new TextEncoder().encode(body);
    const stream = new ReadableStream({
      start(c) { for (const b of enc) c.enqueue(new Uint8Array([b])); c.close(); },
    });
    const res = new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
    const seen = [];
    const result = await withFetch(res, () => postSSE("/x", {}, (d) => seen.push(d)));
    assert.deepEqual(seen, [{ question: "あ" }, { question: "あい" }]);
    assert.deepEqual(result, { question: "あい", options: [] });
  });
});
