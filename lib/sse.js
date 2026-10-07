// AI対話のストリーミング配信(Server-Sent Events)の共通部分。
//
// 対話の1問は、これまで全文が出来上がるまで「入力中…」で待たせていた。
// 生成の途中経過をそのまま流して、チャットのように文字が出ていく形にする。
//
// イベントは3種類:
//   delta … 生成途中の文字列(表示用)
//   done  … 完成した本体(これまでのJSONレスポンスと同じ中身)
//   error … 失敗(クライアントは従来どおりのエラー表示に落とす)
// 必ず done か error のどちらか1つで終わる。

export function sseResponse(handler) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event, data) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true; // 受信側が切断済み
        }
      };
      try {
        await handler(send);
      } catch (e) {
        send("error", { error: e?.message || "不明なエラー" });
      } finally {
        closed = true;
        try { controller.close(); } catch { /* 既に閉じている */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Nginx等のリバースプロキシでバッファリングされると、
      // せっかく流しても最後にまとめて届いてしまうため無効化する
      "X-Accel-Buffering": "no",
    },
  });
}
