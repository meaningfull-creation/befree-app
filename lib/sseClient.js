"use client";

// sseResponse() が返すストリームを読むクライアント側の受け口。
//
// onDelta で生成途中の文字列を受け取り、最後に done の中身を返す。
// done が来ないまま終わった場合・error が来た場合は例外にして、
// 従来どおりの「AIとの通信に失敗しました」の表示に落とす。
export async function postSSE(url, body, onDelta) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const isStream = (res.headers.get("content-type") || "").includes("text/event-stream");

  // ストリームでない応答も扱う:
  //  ・エラー(400/401/500など)は従来どおりJSONで返る
  //  ・最終ターン(採点結果)のように、流す意味がなくJSONのまま返すものもある
  if (!isStream || !res.body) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `request failed: ${url}`);
    return data;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let result = null;
  let failure = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    const events = buf.split("\n\n");
    buf = events.pop() ?? ""; // 最後の未完成イベントは次に持ち越す
    for (const ev of events) {
      let name = null;
      let dataLine = "";
      for (const line of ev.split("\n")) {
        if (line.startsWith("event:")) name = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
      }
      if (!name || !dataLine) continue;
      let payload;
      try { payload = JSON.parse(dataLine); } catch { continue; }
      if (name === "delta") onDelta?.(payload);
      else if (name === "done") result = payload;
      else if (name === "error") failure = payload?.error || "不明なエラー";
    }
  }

  if (failure) throw new Error(failure);
  if (!result) throw new Error("応答が途中で切れました");
  return result;
}
