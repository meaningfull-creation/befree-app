// サーバーサイド専用。ANTHROPIC_API_KEY はブラウザに一切公開しない。
// このファイルは app/api/**/route.js からのみ import すること(クライアントコンポーネントから直接importしない)。

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

// 高精度モデル: 最終スコアリング・分析など品質が最重要の処理に使う
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5";
// 高速モデル: 対話の1問1問など、応答速度が体験を左右する処理に使う(3〜5倍速い)
const FAST_MODEL = process.env.CLAUDE_FAST_MODEL || "claude-haiku-4-5";

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
 * @param {number} [maxTokens=2000] - 応答の最大トークン数。呼び出し内容の大きさに応じて
 *   呼び出し側で調整する(小さい応答は短く指定した方が体感速度が上がる)。
 * @param {object} [options]
 * @param {boolean} [options.fast=false] - trueで高速モデル(FAST_MODEL)を使う。
 *   対話の質問生成など、待ち時間が体験を左右する呼び出しに指定する。
 * @returns {Promise<object>} パース済みJSON
 */
export async function callClaudeJSON(system, userText, maxTokens = 2000, options = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY が設定されていません(.env.local を確認してください)");
  }

  const body = JSON.stringify({
    model: options.fast ? FAST_MODEL : MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userText }],
  });

  // 一時的な失敗(レート制限429・過負荷529・サーバーエラー・ネットワーク断)は
  // ユーザーに「再試行」を押させる前に、サーバー側で自動的にやり直す(最大2回)。
  const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 529]);
  const BACKOFF_MS = [600, 2000];
  let response = null;
  let lastNetworkError = null;

  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]));
    }
    try {
      response = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body,
      });
      lastNetworkError = null;
    } catch (networkErr) {
      lastNetworkError = networkErr;
      response = null;
      continue; // ネットワークエラーはリトライ対象
    }
    if (response.ok || !RETRYABLE_STATUS.has(response.status)) break;
  }

  if (lastNetworkError) {
    throw new Error(`Anthropic APIへの接続に失敗しました: ${lastNetworkError.message}`);
  }
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
