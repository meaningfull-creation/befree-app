// メール送信ヘルパー。Resend(https://resend.com)のAPIを直接fetchで呼び出す実装。
// 追加のnpmパッケージは不要(ANTHROPIC_API_KEYの呼び出し方と同じ考え方)。
//
// 環境変数 RESEND_API_KEY が設定されていない場合は、実際には送信せずコンソールログに
// 出力するだけの動作にフォールバックする(これまでの挙動と互換性を保つため)。
// 本番でメールを実際に送るには、Resendでアカウントを作成しAPIキーをVercelの
// 環境変数に設定してください。送信元アドレス(EMAIL_FROM)は、Resend側で送信ドメインを
// 認証するまでは "onboarding@resend.dev" のようなテスト用アドレスしか使えない点に注意。

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
