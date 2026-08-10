// サーバーサイド専用。ANTHROPIC_API_KEY はブラウザに一切公開しない。
// このファイルは app/api/**/route.js からのみ import すること(クライアントコンポーネントから直接importしない)。

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

function stripJsonFence(text) {
  return text.replace(/```json|```/g, "").trim();
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
      max_tokens: 1000,
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

  try {
    return JSON.parse(stripJsonFence(text));
  } catch (e) {
    throw new Error(`AI応答のJSONパースに失敗しました: ${text.slice(0, 200)}`);
  }
}
