// サーバーサイド専用。ANTHROPIC_API_KEY はブラウザに一切公開しない。
// このファイルは app/api/**/route.js からのみ import すること(クライアントコンポーネントから直接importしない)。

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

// ```json フェンスの除去に加えて、JSON以外の前置き・後置きの文章が混ざっていても
// 最初の「{」〜最後の「}」を抜き出すことで、ある程度の揺れを吸収する。
export function extractJson(text) {
  const stripped = text.replace(/```json|```/g, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return stripped;
  return stripped.slice(start, end + 1);
}

/**
 * Claudeに1ターンのプロンプトを投げ、JSONとしてパースして返す。
 * @param {string} system - システムプロンプト(JSON以外を出力しないよう強く指示する)
 * @param {string} userText - ユーザーメッセージとして渡す本文
 * @returns {Promise<object>} パース済みJSON
 */
export async function callClaudeJSON(system, userText) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY が設定されていません(.env.local を確認してください)");
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      // 企業側の最終スコアリングは10軸のscores + axisNotes + summaryを一度に出力させるため、
      // 単純な1問1答より応答が大きくなる。1000だと打ち切られJSONが壊れることがあったため引き上げた。
      max_tokens: 2000,
      system,
      messages: [{ role: "user", content: userText }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const text = (data.content || [])
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n");

  if (data.stop_reason === "max_tokens") {
    throw new Error(`AI応答がmax_tokensで打ち切られました(内容が長すぎる可能性があります): ${text.slice(0, 300)}`);
  }

  try {
    return JSON.parse(extractJson(text));
  } catch (e) {
    throw new Error(`AI応答のJSONパースに失敗しました: ${text.slice(0, 300)}`);
  }
}
