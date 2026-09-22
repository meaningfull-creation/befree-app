// メール送信ヘルパー。Resend(https://resend.com)のAPIを直接fetchで呼び出す実装。
// 追加のnpmパッケージは不要(ANTHROPIC_API_KEYの呼び出し方と同じ考え方)。
//
// 環境変数 RESEND_API_KEY が設定されていない場合は、実際には送信せずコンソールログに
// 出力するだけの動作にフォールバックする(これまでの挙動と互換性を保つため)。
// 本番でメールを実際に送るには、Resendでアカウントを作成しAPIキーをVercelの
// 環境変数に設定してください。送信元アドレス(EMAIL_FROM)は、Resend側で送信ドメインを
// 認証するまでは "onboarding@resend.dev" のようなテスト用アドレスしか使えない点に注意。

import { getSiteUrl } from "./siteUrl.js";

const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendEmail({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "BATTER BOX <onboarding@resend.dev>";

  if (!apiKey) {
    // メール送信サービス未連携時のフォールバック。実際には送信されない。
    console.log(`[email:fallback] to=${to} subject="${subject}"\n${text || html}`);
    return { sent: false, reason: "RESEND_API_KEY not set" };
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        text: text || undefined,
        html: html || undefined,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("failed to send email via Resend:", res.status, errText);
      return { sent: false, reason: `Resend API error ${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    console.error("failed to send email:", e.message);
    return { sent: false, reason: e.message };
  }
}

// ---------------------------------------------------------------------------
// ブランドHTMLメールテンプレート
// BATTER BOXのブランド(白・黒・グレー＋オレンジのアクセント)に沿ったレイアウトで、
// どのメールクライアントでも崩れにくいテーブル+インラインスタイルで組む。
// ユーザー入力(名前・メッセージ本文など)は必ずエスケープして差し込む。
// ---------------------------------------------------------------------------

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * ブランド共通レイアウトのHTMLメールを生成する。
 * @param {object} p
 * @param {string} p.heading - カード内の見出し
 * @param {string[]} [p.paragraphs] - 本文段落(プレーンテキスト。エスケープされる)
 * @param {Array<[string,string]>} [p.infoRows] - ラベルと値の表(契約条件など)
 * @param {string} [p.quote] - 引用ブロック(メッセージ抜粋など)
 * @param {string} [p.ctaLabel] - ボタンの文言
 * @param {string} [p.ctaUrl] - ボタンのリンク先(絶対URL)
 * @param {string} [p.footNote] - 本文末尾の小さな補足(「心当たりがない場合は〜」等)
 */
export function renderBrandEmail({ heading, paragraphs = [], infoRows = [], quote = null, ctaLabel = null, ctaUrl = null, footNote = null }) {
  const ORANGE = "#fc6000"; // 公式ロゴのオレンジ
  const NAVY = "#01204d"; // 公式ロゴのネイビー
  const logoUrl = `${getSiteUrl()}/logo.png`;
  const paraHtml = paragraphs
    .map((p) => `<p style="margin:0 0 14px;font-size:14px;line-height:1.9;color:#333333;">${escapeHtml(p)}</p>`)
    .join("");
  const rowsHtml = infoRows.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 20px;border-collapse:collapse;background:#fafaf9;border:1px solid #eeeeec;border-radius:10px;">
        ${infoRows
          .map(
            ([label, value], i) => `<tr>
          <td style="padding:11px 16px;${i < infoRows.length - 1 ? "border-bottom:1px solid #eeeeec;" : ""}font-size:13px;color:#8a8a86;white-space:nowrap;">${escapeHtml(label)}</td>
          <td style="padding:11px 16px;${i < infoRows.length - 1 ? "border-bottom:1px solid #eeeeec;" : ""}font-size:14px;font-weight:600;color:${NAVY};text-align:right;">${escapeHtml(value)}</td>
        </tr>`
          )
          .join("")}
      </table>`
    : "";
  const quoteHtml = quote
    ? `<div style="margin:18px 0;padding:14px 16px;background:#f7f7f6;border-left:3px solid ${ORANGE};border-radius:0 8px 8px 0;font-size:14px;line-height:1.8;color:#444444;white-space:pre-wrap;">${escapeHtml(quote)}</div>`
    : "";
  const ctaHtml =
    ctaLabel && ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:26px auto 4px;">
          <tr><td style="border-radius:10px;background:${ORANGE};">
            <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:13px 36px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(ctaLabel)}</a>
          </td></tr>
        </table>
        <p style="margin:10px 0 0;font-size:11px;color:#a0a09c;text-align:center;word-break:break-all;">ボタンが開けない場合はこちら: <a href="${escapeHtml(ctaUrl)}" style="color:${ORANGE};">${escapeHtml(ctaUrl)}</a></p>`
      : "";
  const footHtml = footNote
    ? `<p style="margin:22px 0 0;font-size:12px;line-height:1.8;color:#a0a09c;">${escapeHtml(footNote)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f2;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f2;">
    <tr><td align="center" style="padding:36px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding:0 4px 18px;">
          <img src="${escapeHtml(logoUrl)}" alt="BATTER BOX" width="168" style="display:block;width:168px;height:auto;border:0;">
        </td></tr>
        <tr><td style="background:#ffffff;border:1px solid #e8e8e6;border-radius:14px;padding:32px 30px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Hiragino Sans','Noto Sans JP',sans-serif;">
          <h1 style="margin:0 0 18px;font-size:18px;line-height:1.5;color:${NAVY};">${escapeHtml(heading)}</h1>
          ${paraHtml}
          ${rowsHtml}
          ${quoteHtml}
          ${ctaHtml}
          ${footHtml}
        </td></tr>
        <tr><td style="padding:18px 4px 0;font-size:11px;line-height:1.8;color:#a0a09c;text-align:center;">
          このメールはBATTER BOXから自動送信されています。<br>&copy; BATTER BOX
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
